# SPDX-License-Identifier: MIT

from rest_framework import serializers


class AnnotationCountsQuerySerializer(serializers.Serializer):
    job_id = serializers.IntegerField(min_value=1, max_value=2**63 - 1, required=False)


class ClassCountSerializer(serializers.Serializer):
    label_id = serializers.IntegerField(min_value=1)
    label_name = serializers.CharField()
    count = serializers.IntegerField(min_value=0)


class AnnotationCountsSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(min_value=1)
    total = serializers.IntegerField(min_value=0)
    counts = ClassCountSerializer(many=True)
