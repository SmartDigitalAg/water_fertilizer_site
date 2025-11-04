from django.urls import path
from . import views

app_name = 'fertilizer'

urlpatterns = [
    path('', views.prescription, name='prescription'),
    path('prescription/', views.prescription, name='prescription2'),
    path('prescription/api/', views.prescription_api, name='prescription_api'),
    path('experience/', views.experience, name='experience'),
    path('experience_api/', views.experience_api, name='experience_api'),  # 새로 추가된 URL
    path('standard/', views.standard, name='standard'),
    path('standard/api/', views.get_standard_api, name='standard_api'),
]