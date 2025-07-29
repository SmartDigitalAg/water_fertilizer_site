from django.urls import path
from . import views

app_name = 'fertilizer'

urlpatterns = [
    path('', views.prescription, name='prescription'),
    path('prescription/', views.prescription, name='prescription2'),
    path('experience/', views.experience, name='experience'),
    path('standard/', views.standard, name='standard'),
    path('standard/api/', views.get_standard_api, name='standard_api'),
]
