# SPDX-License-Identifier: MIT

from cvat.apps.engine.permissions import TaskPermission


class AnnotationCountsPermission(TaskPermission):
    """Use task annotation-read rules, including CVAT's access-token policies."""

    @classmethod
    def _get_scopes(cls, request, view, obj):
        return [{"annotation_counts": cls.Scopes.VIEW_ANNOTATIONS}[view.action]]
