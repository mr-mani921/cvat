# SPDX-License-Identifier: MIT

from django.db.models import Count, F
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from cvat.apps.engine.models import JobType, LabeledShape, Task

from .permissions import AnnotationCountsPermission
from .serializers import AnnotationCountsSerializer


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
            "ordered by label ID. An empty task returns total=0 and counts=[]."
        ),
        responses=AnnotationCountsSerializer,
    )
    @action(detail=True, methods=["GET"], url_path="annotation-counts")
    def annotation_counts(self, request, pk=None):
        # get_object() enforces task object permissions before any counts are read.
        task = self.get_object()
        counts = list(
            LabeledShape.objects.filter(
                job__segment__task=task,
                job__type=JobType.ANNOTATION,
                job__parent_job__isnull=True,
                parent__isnull=True,
                outside=False,
            )
            .values("label_id", label_name=F("label__name"))
            .annotate(count=Count("id"))
            .order_by("label_id")
        )
        serializer = self.get_serializer(
            {"task_id": task.id, "total": sum(row["count"] for row in counts), "counts": counts}
        )
        return Response(serializer.data)
