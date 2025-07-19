from django.shortcuts import render

def water(request):
    return render(request, 'water/water.html')
