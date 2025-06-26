# fertilizer/urls.py
from django.urls import path
from .views import prescription, experience, standard

app_name = 'fertilizer'

urlpatterns = [
    path('',            prescription, name='prescription'),
    path('experience/', experience,   name='experience'),
    path('standard/',   standard,     name='standard'),
]
