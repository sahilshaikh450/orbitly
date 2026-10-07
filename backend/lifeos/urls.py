import os
from django.contrib import admin
from django.urls import path, include
urlpatterns = [path(os.environ.get("ADMIN_URL", "admin/"), admin.site.urls), path("api/", include("core.urls"))]
