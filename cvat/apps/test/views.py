# SPDX-License-Identifier: MIT

from django.db.models import Count, F
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from cvat.apps.engine.models import Job, JobType, LabeledShape, Task

from .permissions import AnnotationCountsPermission
from .serializers import AnnotationCountsQuerySerializer, AnnotationCountsSerializer


class AnnotationCountsViewSet(viewsets.GenericViewSet):
    queryset = Task.objects.select_related("project", "organization")
    serializer_class = AnnotationCountsSerializer
    iam_permission_class = AnnotationCountsPermission
    iam_supports_organization_params = True
    lookup_value_regex = r"[1-9][0-9]*"
    filter_backends = []

    @extend_schema(
        summary="Count saved task shapes by class",
        description=(
            "Counts visible (outside=false), top-level LabeledShape rows in ordinary "
            "annotation jobs without a parent job. Tags, tracks, intervals, skeleton "
            "children, ground-truth jobs and replica jobs are excluded. Each saved row "
            "counts once, including separate rows on overlapping job frames; this is "
            "not a deduplicated task export. Labels are resolved through the shape's "
            "label, including project-owned labels. Only populated classes are returned, "
            "ordered by label ID. An empty task or job returns total=0 and counts=[]. "
            "Optional job_id restricts the count to an eligible job of this task and "
            "additionally requires job annotation-read access. Other-task, missing or "
            "ineligible jobs return 404; invalid job_id values return 400."
        ),
        parameters=[AnnotationCountsQuerySerializer],
        responses=AnnotationCountsSerializer,
    )
    @action(detail=True, methods=["GET"], url_path="annotation-counts")
    def annotation_counts(self, request, pk=None):
        # get_object() enforces task object permissions before any counts are read.
        task = self.get_object()
        if len(request.query_params.getlist("job_id")) > 1:
            raise ValidationError({"job_id": "Provide a single job ID."})
        query = AnnotationCountsQuerySerializer(data=request.query_params.dict())
        query.is_valid(raise_exception=True)
        shapes = LabeledShape.objects.filter(
            job__segment__task=task,
            job__type=JobType.ANNOTATION,
            job__parent_job__isnull=True,
            parent__isnull=True,
            outside=False,
        )
        if job_id := query.validated_data.get("job_id"):
            job = get_object_or_404(
                Job.objects.select_related("segment__task__project", "segment__task__organization"),
                pk=job_id,
                segment__task=task,
                type=JobType.ANNOTATION,
                parent_job__isnull=True,
            )
            self.check_object_permissions(request, job)
            shapes = shapes.filter(job=job)
        counts = list(
            shapes.values("label_id", label_name=F("label__name"))
            .annotate(count=Count("id"))
            .order_by("label_id")
        )
        serializer = self.get_serializer(
            {"task_id": task.id, "total": sum(row["count"] for row in counts), "counts": counts}
        )
        return Response(serializer.data)
