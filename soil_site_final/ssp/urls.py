# ssp/urls.py
from django.urls import path
from . import views

app_name = 'ssp'

urlpatterns = [
    path('', views.ssp, name='ssp'),
]