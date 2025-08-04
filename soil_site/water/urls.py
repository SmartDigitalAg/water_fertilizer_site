from django.urls import path
from . import views

app_name = 'water'

urlpatterns = [
    path('', views.water, name='water'),
    path('get_latlon/', views.get_latlon, name='get_latlon'),
    path('api/', views.get_water_api, name='water_api'),
]
