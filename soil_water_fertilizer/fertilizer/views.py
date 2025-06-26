# fertilizer/views.py
from django.shortcuts import render

def prescription(request):
    return render(request, 'fertilizer/prescription.html')

def experience(request):
    return render(request, 'fertilizer/experience.html')

def standard(request):
    return render(request, 'fertilizer/standard.html')
