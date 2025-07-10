import requests
from django.shortcuts import render
from django.http import JsonResponse

def water(request):
    return render(request, 'water/water.html')

def get_latlon(request):
    # GET 방식, 쿼리 스트링으로 요청됨
    query = request.GET.get('q')
    if not query:
        return JsonResponse({'error': 'No query'}, status=400)

    API_KEY = "D8A444DC-1488-3E6F-8FBC-BB9F6F4C3ED6"
    SEARCH_URL = "https://api.vworld.kr/req/search"

    # 1. parcel(지번), 2. road(도로명), 3. place(건물명/POI)
    search_types = [
        {'type': 'address', 'category': 'parcel'},
        {'type': 'address', 'category': 'road'},
        {'type': 'place'}
    ]
    for search in search_types:
        params = {
            'service': 'search',
            'request': 'search',
            'version': '2.0',
            'format': 'json',
            'key': API_KEY,
            'query': query,
            'crs': 'EPSG:4326',
            'type': search['type'],
        }
        if 'category' in search:
            params['category'] = search['category']
        try:
            res = requests.get(SEARCH_URL, params=params, timeout=5)
            items = res.json().get('response', {}).get('result', {}).get('items', [])
            if items:
                item = items[0]
                address_dict = item.get('address', {})
                return JsonResponse({
                    'lat': item['point']['y'],
                    'lon': item['point']['x'],
                    'parcel_addr': address_dict.get('parcel', ''),
                    'road_addr': address_dict.get('road', ''),
                    'address': item.get('title', query)  # 필요하다면 남겨도 됨
                })
        except Exception as e:
            continue  # 만약 오류가 발생하면 다음으로 넘어감

    return JsonResponse({'error': 'No result'}, status=404)
