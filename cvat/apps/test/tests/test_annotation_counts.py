# SPDX-License-Identifier: MIT

from unittest.mock import patch

from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework import status

from cvat.apps.engine.models import (
    Job,
    JobType,
    Label,
    LabeledImage,
    LabeledInterval,
    LabeledShape,
    LabeledTrack,
    Project,
    Segment,
    ShapeType,
    Task,
    TrackedShape,
)
from cvat.apps.engine.permissions import JobPermission
from cvat.apps.engine.tests.utils import ApiTestBase
from cvat.apps.iam.models import User


@override_settings(
    CACHES={
        "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
        "media": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
    }
)
class AnnotationCountsAPITestCase(ApiTestBase):
    """Exercise DRF authentication and real CVAT/OPA permissions, without permission mocks."""

    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(username="counts-owner", password="owner-password")
        cls.outsider = User.objects.create_user(
            username="counts-outsider", password="other-password"
        )
        cls.task = Task.objects.create(name="counts", owner=cls.owner, dimension="2d")
        cls.car = Label.objects.create(task=cls.task, name="car")
        cls.person = Label.objects.create(task=cls.task, name="person")
        cls.unused = Label.objects.create(task=cls.task, name="unused")
        cls.job1 = Job.objects.create(
            segment=Segment.objects.create(task=cls.task, start_frame=0, stop_frame=9)
        )
        cls.job2 = Job.objects.create(
            segment=Segment.objects.create(task=cls.task, start_frame=5, stop_frame=14)
        )

    def _shape(self, **fields):
        values = {
            "label": self.car,
            "job": self.job1,
            "frame": 0,
            "type": ShapeType.RECTANGLE,
            "points": [0, 0, 10, 10],
        }
        values.update(fields)
        return LabeledShape.objects.create(**values)

    def _get_counts(self, task=None, user=None, job_id=None):
        return self._get_request(
            f"/api/test/tasks/{(task or self.task).id}/annotation-counts",
            user or self.owner,
            query_params={} if job_id is None else {"job_id": job_id},
        )

    def test_multiple_labels_and_jobs(self):
        self._shape()
        self._shape(frame=1)
        self._shape(job=self.job2, frame=10)
        self._shape(label=self.person, job=self.job2, frame=11)

        response = self._get_counts()

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(
            response.json(),
            {
                "task_id": self.task.id,
                "total": 4,
                "counts": [
                    {"label_id": self.car.id, "label_name": "car", "count": 3},
                    {"label_id": self.person.id, "label_name": "person", "count": 1},
                ],
            },
        )

    def test_empty_task_omits_unused_labels(self):
        response = self._get_counts()

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json(), {"task_id": self.task.id, "total": 0, "counts": []})

    def test_task_isolation_with_same_class_name(self):
        other = Task.objects.create(name="other", owner=self.owner, dimension="2d")
        other_label = Label.objects.create(task=other, name="car")
        other_job = Job.objects.create(
            segment=Segment.objects.create(task=other, start_frame=0, stop_frame=9)
        )
        self._shape()
        self._shape(label=other_label, job=other_job)
        self._shape(label=other_label, job=other_job, frame=1)

        self.assertEqual(
            self._get_counts().json()["counts"],
            [{"label_id": self.car.id, "label_name": "car", "count": 1}],
        )

    def test_project_labels_are_scoped_through_jobs(self):
        project = Project.objects.create(name="shared labels", owner=self.owner)
        label = Label.objects.create(project=project, name="bus")
        tasks = [
            Task.objects.create(name=name, project=project, owner=self.owner, dimension="2d")
            for name in ("first", "second")
        ]
        for i, task in enumerate(tasks):
            job = Job.objects.create(
                segment=Segment.objects.create(task=task, start_frame=0, stop_frame=9)
            )
            for frame in range(i + 1):
                self._shape(label=label, job=job, frame=frame)
            filtered = self._get_counts(task=task, job_id=job.id)
            self.assertEqual(filtered.status_code, status.HTTP_200_OK, filtered.content)
            self.assertEqual(filtered.json()["total"], i + 1)

        self.assertFalse(tasks[0].label_set.exists())
        response = self._get_counts(task=tasks[0])
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(
            response.json()["counts"], [{"label_id": label.id, "label_name": "bus", "count": 1}]
        )

    def test_missing_and_invalid_task_ids(self):
        for task_id in (999999, "not-an-id", 0, -1, "9" * 40):
            with self.subTest(task_id=task_id):
                response = self._get_request(
                    f"/api/test/tasks/{task_id}/annotation-counts", self.owner
                )
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, response.content)

    def test_anonymous_is_rejected(self):
        self._shape()
        response = self.client.get(f"/api/test/tasks/{self.task.id}/annotation-counts")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED, response.content)
        self.assertNotIn("counts", response.json())

    def test_authenticated_outsider_is_rejected_before_aggregation(self):
        self._shape()
        with CaptureQueriesContext(connection) as queries:
            response = self._get_counts(user=self.outsider)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.assertNotIn("counts", response.json())
        self.assertFalse(any("engine_labeledshape" in q["sql"] for q in queries))

    def test_task_assignee_can_read(self):
        self.task.assignee = self.outsider
        self.task.save(update_fields=["assignee"])
        self._shape()

        response = self._get_counts(user=self.outsider)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["total"], 1)

    def test_project_owner_can_read(self):
        project = Project.objects.create(name="owned", owner=self.outsider)
        self.task.project = project
        self.task.save(update_fields=["project"])

        response = self._get_counts(user=self.outsider)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)

    def test_excludes_other_annotation_types_outside_shapes_and_skeleton_children(self):
        self._shape()
        self._shape(outside=True)
        skeleton_label = Label.objects.create(task=self.task, name="skeleton", type="skeleton")
        point_label = Label.objects.create(
            task=self.task, parent=skeleton_label, name="point", type="points"
        )
        skeleton = self._shape(label=skeleton_label, type=ShapeType.SKELETON, points=[])
        self._shape(label=point_label, parent=skeleton, type=ShapeType.POINTS, points=[1, 1])
        LabeledImage.objects.create(job=self.job1, label=self.car, frame=0)
        LabeledInterval.objects.create(job=self.job1, label=self.car, start=0, stop=1)
        track = LabeledTrack.objects.create(job=self.job1, label=self.car, frame=0)
        TrackedShape.objects.create(
            track=track, frame=0, type=ShapeType.RECTANGLE, points=[0, 0, 10, 10]
        )

        response = self._get_counts()

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["total"], 2)
        self.assertEqual(
            response.json()["counts"],
            [
                {"label_id": self.car.id, "label_name": "car", "count": 1},
                {"label_id": skeleton_label.id, "label_name": "skeleton", "count": 1},
            ],
        )

    def test_excludes_special_and_parented_jobs(self):
        self._shape()
        for job_type in (JobType.GROUND_TRUTH, JobType.REPLICA, JobType.ANNOTATION):
            job = Job.objects.create(
                segment=Segment.objects.create(task=self.task, start_frame=0, stop_frame=9),
                type=job_type,
                parent_job=None if job_type == JobType.GROUND_TRUTH else self.job1,
            )
            self._shape(job=job)

        self.assertEqual(self._get_counts().json()["total"], 1)

    def test_overlap_counts_each_saved_row(self):
        self._shape(frame=6)
        self._shape(job=self.job2, frame=6)

        self.assertEqual(self._get_counts().json()["total"], 2)

    def test_saved_changes_and_label_names_are_read_again(self):
        self._shape()
        self.assertEqual(self._get_counts().json()["total"], 1)
        self._shape(frame=1)
        self.car.name = "renamed car"
        self.car.save(update_fields=["name"])

        response = self._get_counts()

        self.assertEqual(
            response.json()["counts"],
            [{"label_id": self.car.id, "label_name": "renamed car", "count": 2}],
        )

    def test_counts_are_aggregated_in_one_database_query(self):
        self._shape()
        self._shape(label=self.person)

        with CaptureQueriesContext(connection) as queries:
            response = self._get_counts()

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        shape_queries = [q["sql"] for q in queries if "engine_labeledshape" in q["sql"]]
        self.assertEqual(len(shape_queries), 1, shape_queries)
        self.assertIn("COUNT(", shape_queries[0].upper())
        self.assertIn("GROUP BY", shape_queries[0].upper())

    def test_post_is_not_supported(self):
        response = self._post_request(
            f"/api/test/tasks/{self.task.id}/annotation-counts", self.owner, data={}
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED, response.content)

    def test_job_filter_isolates_jobs_and_preserves_task_overview(self):
        self._shape()
        self._shape(outside=True)
        self._shape(job=self.job2, label=self.person, frame=5)
        self._shape(job=self.job2, label=self.person, frame=6)

        for job, label, total in ((self.job1, self.car, 1), (self.job2, self.person, 2)):
            with self.subTest(job=job.id):
                response = self._get_counts(job_id=job.id)
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
                self.assertEqual(
                    response.json(),
                    {
                        "task_id": self.task.id,
                        "total": total,
                        "counts": [
                            {"label_id": label.id, "label_name": label.name, "count": total}
                        ],
                    },
                )
        self.assertEqual(self._get_counts().json()["total"], 3)

    def test_empty_job_is_a_valid_empty_response(self):
        self._shape()
        response = self._get_counts(job_id=self.job2.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json(), {"task_id": self.task.id, "total": 0, "counts": []})

    def test_invalid_job_filter_is_rejected(self):
        for job_id in ("", "not-a-job", "1.5", "0", "-1", "9" * 40):
            with self.subTest(job_id=job_id), CaptureQueriesContext(connection) as queries:
                response = self._get_counts(job_id=job_id)
                self.assertEqual(
                    response.status_code, status.HTTP_400_BAD_REQUEST, response.content
                )
                self.assertNotIn("counts", response.json())
                self.assertFalse(any("engine_labeledshape" in q["sql"] for q in queries))
        response = self._get_request(
            f"/api/test/tasks/{self.task.id}/annotation-counts?job_id={self.job1.id}&job_id={self.job2.id}",
            self.owner,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)

    def test_missing_cross_task_and_ineligible_jobs_are_not_found(self):
        other = Task.objects.create(name="other", owner=self.owner, dimension="2d")
        other_job = Job.objects.create(
            segment=Segment.objects.create(task=other, start_frame=0, stop_frame=9)
        )
        ineligible = [
            Job.objects.create(
                segment=Segment.objects.create(task=self.task, start_frame=0, stop_frame=9),
                type=job_type,
                parent_job=None if job_type == JobType.GROUND_TRUTH else self.job1,
            )
            for job_type in (JobType.GROUND_TRUTH, JobType.REPLICA, JobType.ANNOTATION)
        ]
        for job_id in (999999, other_job.id, *(job.id for job in ineligible)):
            with self.subTest(job_id=job_id), CaptureQueriesContext(connection) as queries:
                response = self._get_counts(job_id=job_id)
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, response.content)
                self.assertNotIn("counts", response.json())
                self.assertFalse(any("engine_labeledshape" in q["sql"] for q in queries))

    def test_filtered_anonymous_and_outsider_requests_are_rejected(self):
        self._shape()
        for job_id in (self.job1.id, 999999):
            with self.subTest(job_id=job_id), CaptureQueriesContext(connection) as queries:
                anonymous = self.client.get(
                    f"/api/test/tasks/{self.task.id}/annotation-counts?job_id={job_id}"
                )
                outsider = self._get_counts(job_id=job_id, user=self.outsider)
                self.assertEqual(anonymous.status_code, status.HTTP_401_UNAUTHORIZED)
                self.assertEqual(outsider.status_code, status.HTTP_403_FORBIDDEN)
                self.assertNotIn("counts", anonymous.json())
                self.assertNotIn("counts", outsider.json())
                self.assertFalse(any("engine_labeledshape" in q["sql"] for q in queries))

    def test_job_assignee_does_not_bypass_task_annotation_permission(self):
        self.job1.assignee = self.outsider
        self.job1.save(update_fields=["assignee"])
        self._shape()
        response = self._get_counts(job_id=self.job1.id, user=self.outsider)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.assertNotIn("counts", response.json())

    def test_filtered_counts_use_one_aggregation_and_allow_task_assignee(self):
        self.task.assignee = self.outsider
        self.task.save(update_fields=["assignee"])
        self._shape()
        self._shape(job=self.job2)
        # Observe the actual job policy payload; delegate unchanged to the real OPA check.
        with (
            CaptureQueriesContext(connection) as queries,
            patch.object(
                JobPermission, "get_resource", autospec=True, side_effect=JobPermission.get_resource
            ) as job_resource,
        ):
            response = self._get_counts(job_id=self.job1.id, user=self.outsider)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.json()["total"], 1)
        shape_queries = [q["sql"] for q in queries if "engine_labeledshape" in q["sql"]]
        self.assertEqual(len(shape_queries), 1, shape_queries)
        self.assertIn("GROUP BY", shape_queries[0].upper())
        job_resource.assert_called_once()
        checked_permission = job_resource.call_args.args[0]
        self.assertEqual(checked_permission.obj.id, self.job1.id)
        self.assertEqual(checked_permission.scope, JobPermission.Scopes.VIEW_ANNOTATIONS)
