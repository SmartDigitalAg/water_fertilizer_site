from django.urls import path
from . import views

app_name = 'fertilizer'

urlpatterns = [
    path('', views.prescription, name='prescription'),
    path('prescription/', views.prescription, name='prescription'),
    path('experience/', views.experience, name='experience'),
    path('standard/', views.standard, name='standard'),
]
