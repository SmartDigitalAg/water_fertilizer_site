import requests
from django.shortcuts import render
from django.http import JsonResponse

def water(request):
    return render(request, 'water/water.html')

def get_latlon(request):
    # GET 방식, 쿼리 스트링으로 요청됨
    query = request.GET.get('q')
    page = int(request.GET.get('page', '1'))
    per_page = int(request.GET.get('per_page', '10'))
    list_mode = request.GET.get('list', '0') == '1'  # 프론트에서 리스트 조회 시 ?list=1로 호출

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

    result_items = []
    total_count = 0

    # ---- 추가: 주소 리스트 모드 ----
    if list_mode:
        # 3가지 타입 모두에서 결과 모아서 합침
        search_lower = query.replace(" ", "").lower()
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
                for item in items:
                    address_dict = item.get('address', {})
                    display_addr = address_dict.get('road') or address_dict.get('parcel') or item.get('title') or ''
                    if display_addr and search_lower in display_addr.replace(" ", "").lower():
                        result_items.append({'address': display_addr})
            except Exception as e:
                continue

        # 중복 제거, 오름차순 정렬
        result_items = sorted({x['address'] for x in result_items})
        total_count = len(result_items)

        # 1만건 이상 안내
        if total_count >= 10000:
            return JsonResponse({'items': [], 'total': total_count})

        # 페이징
        start = (page - 1) * per_page
        end = start + per_page
        page_items = [{'address': addr} for addr in result_items[start:end]]
        return JsonResponse({'items': page_items, 'total': total_count})

    # ---- 기존 기능(좌표 변환 등, 기존과 동일) ----
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