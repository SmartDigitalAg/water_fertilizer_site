from django.contrib import admin
from django.urls import path, include
from .views import index

urlpatterns = [
    path("admin/", admin.site.urls),
    path('', index, name='main-index'),
    path('fertilizer/', include('fertilizer.urls')),
    path('water/', include('water.urls')),
]
