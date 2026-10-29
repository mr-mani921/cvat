# SPDX-License-Identifier: MIT

from rest_framework.routers import DefaultRouter

from .views import AnnotationCountsViewSet

router = DefaultRouter(trailing_slash=False)
router.register("test/tasks", AnnotationCountsViewSet, basename="test-tasks")

urlpatterns = router.urls
