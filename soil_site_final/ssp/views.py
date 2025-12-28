# ssp/views.py
from django.shortcuts import render

def ssp(request):
    return render(request, 'ssp/ssp.html')