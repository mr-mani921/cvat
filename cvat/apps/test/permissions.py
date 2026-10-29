# SPDX-License-Identifier: MIT

from cvat.apps.engine.models import Job
from cvat.apps.engine.permissions import JobPermission, TaskPermission


class AnnotationCountsPermission(TaskPermission):
    """Use task and selected-job annotation-read rules, including access-token policies."""

    @classmethod
    def _get_scopes(cls, request, view, obj):
        return [{"annotation_counts": cls.Scopes.VIEW_ANNOTATIONS}[view.action]]

    @classmethod
    def create(cls, request, view, obj, iam_context):
        if isinstance(obj, Job):
            return [
                JobPermission.create_base_perm(
                    request, view, JobPermission.Scopes.VIEW_ANNOTATIONS, iam_context, obj=obj
                )
            ]
        return super().create(request, view, obj, iam_context)
