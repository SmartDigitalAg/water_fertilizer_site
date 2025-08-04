import requests
import json
import re
import urllib.parse
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# 시도 코드 데이터
SIDO_DATA = {
    "강원특별자치도": "51", "경기도": "41", "경상남도": "48", "경상북도": "47",
    "광주광역시": "29", "대구광역시": "27", "대전광역시": "30", "부산광역시": "26",
    "서울특별시": "11", "세종특별자치시": "36", "울산광역시": "31", "인천광역시": "28",
    "전라남도": "46", "전북특별자치도": "52", "제주특별자치도": "50",
    "충청남도": "44", "충청북도": "43"
}

# 작물 분류 데이터
CROP_CATEGORIES = {
    "01": "곡류", "02": "엽채류", "03": "유지작물", "04": "서류",
    "05": "과수", "06": "근채류", "07": "과채류", "08": "인경채류"
}

def water(request):
    context = {
        'sido_data': json.dumps(SIDO_DATA),
        'crop_categories': json.dumps(CROP_CATEGORIES),
    }
    return render(request, 'water/water.html', context)


import requests
from django.http import JsonResponse
import time

import requests
from django.http import JsonResponse
import time


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

    # 지번주소 위주로 검색 (parcel을 첫 번째로)
    search_types = [
        {'type': 'address', 'category': 'parcel'},  # 지번주소 우선
        {'type': 'address', 'category': 'road'},  # 도로명주소
        {'type': 'place'}  # 건물명/POI
    ]

    result_items = []
    total_count = 0

    if list_mode:
        # 3가지 타입 모두에서 최대한 많은 결과 모아서 합침
        search_lower = query.replace(" ", "").lower()

        for search in search_types:
            # V-World API에서 더 많은 결과를 가져오기 위한 설정
            max_results_per_request = 1000  # API 최대 허용치
            max_pages = 10  # 최대 10페이지까지 검색 (총 10,000개)

            for api_page in range(1, max_pages + 1):
                params = {
                    'service': 'search',
                    'request': 'search',
                    'version': '2.0',
                    'format': 'json',
                    'key': API_KEY,
                    'query': query,
                    'crs': 'EPSG:4326',
                    'type': search['type'],
                    'size': max_results_per_request,  # 한 번에 가져올 결과 수
                    'page': api_page,  # API 페이지 번호
                }
                if 'category' in search:
                    params['category'] = search['category']

                try:
                    res = requests.get(SEARCH_URL, params=params, timeout=10)
                    response_data = res.json()

                    if res.status_code != 200:
                        print(f"API Error: {response_data}")
                        break

                    result = response_data.get('response', {}).get('result', {})
                    items = result.get('items', [])

                    # 결과가 없으면 더 이상 페이지가 없는 것으로 판단
                    if not items:
                        break

                    # 검색어가 포함된 주소만 필터링
                    for item in items:
                        address_dict = item.get('address', {})

                        # 지번주소 우선, 없으면 도로명주소, 그것도 없으면 title
                        if search['type'] == 'address' and search.get('category') == 'parcel':
                            display_addr = address_dict.get('parcel', '')
                        elif search['type'] == 'address' and search.get('category') == 'road':
                            display_addr = address_dict.get('road', '')
                        else:
                            display_addr = item.get('title', '')

                        # 검색어가 포함된 경우만 추가
                        if display_addr and search_lower in display_addr.replace(" ", "").lower():
                            result_items.append({
                                'address': display_addr,
                                'type': search.get('category', search['type']),
                                'lat': item.get('point', {}).get('y', ''),
                                'lon': item.get('point', {}).get('x', ''),
                                'parcel_addr': address_dict.get('parcel', ''),
                                'road_addr': address_dict.get('road', '')
                            })

                            # 300개 이상이면 조기종료
                            if len(result_items) >= 300:
                                break

                    # 300개 이상이면 조기종료
                    if len(result_items) >= 300:
                        break

                    # API 호출 제한을 위한 짧은 대기
                    time.sleep(0.1)

                    print(f"Search type: {search}, Page: {api_page}, Items found: {len(items)}")

                except Exception as e:
                    print(f"Error in API call: {e}")
                    break

            # 300개 이상이면 더 이상 다른 타입 검색 안함
            if len(result_items) >= 300:
                break

        # 중복 제거 (주소 기준으로)
        seen_addresses = set()
        unique_items = []
        for item in result_items:
            addr = item['address']
            if addr not in seen_addresses:
                seen_addresses.add(addr)
                unique_items.append(item)

        # 지번주소 우선으로 정렬, 그 다음 주소명 오름차순
        def sort_key(item):
            type_priority = {'parcel': 0, 'road': 1, 'place': 2}
            return (type_priority.get(item['type'], 3), item['address'])

        unique_items.sort(key=sort_key)
        total_count = len(unique_items)

        print(f"Total unique addresses found: {total_count}")

        # 300건 이상일 경우 안내
        if total_count >= 300:
            return JsonResponse({
                'items': [],
                'total': total_count,
                'message': '검색 결과가 너무 많습니다. 더 구체적인 검색어를 입력해주세요.'
            })

        # 페이징 처리
        start = (page - 1) * per_page
        end = start + per_page
        page_items = unique_items[start:end]

        return JsonResponse({
            'items': page_items,
            'total': total_count,
            'current_page': page,
            'per_page': per_page,
            'total_pages': (total_count + per_page - 1) // per_page
        })

    # ---- 기존 기능(좌표 변환 등) - 첫 번째 결과만 반환 ----
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
            'size': 10,  # 첫 번째 결과만 필요하므로 적게 설정
        }
        if 'category' in search:
            params['category'] = search['category']

        try:
            res = requests.get(SEARCH_URL, params=params, timeout=10)
            response_data = res.json()

            if res.status_code != 200:
                continue

            items = response_data.get('response', {}).get('result', {}).get('items', [])
            if items:
                item = items[0]
                address_dict = item.get('address', {})
                return JsonResponse({
                    'lat': item['point']['y'],
                    'lon': item['point']['x'],
                    'parcel_addr': address_dict.get('parcel', ''),
                    'road_addr': address_dict.get('road', ''),
                    'address': item.get('title', query)
                })
        except Exception as e:
            print(f"Error in coordinate search: {e}")
            continue

    return JsonResponse({'error': 'No result'}, status=404)

# ========== 흙토람 API 연동 함수들 (Streamlit 코드 완전 반영) ==========
def create_session():
    """흙토람 API 세션 생성"""
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
    })
    try:
        session.get('https://soil.rda.go.kr/water/waterReport.do', timeout=10)
    except:
        pass
    return session

def parse_date_string(date_str):
    """권장재배시기 문자열에서 날짜 파싱"""
    try:
        if '월' in date_str and '일' in date_str:
            month_match = re.search(r'(\d+)월', date_str)
            day_match = re.search(r'(\d+)일', date_str)
            if month_match and day_match:
                month = int(month_match.group(1))
                day = int(day_match.group(1))
                return datetime(2025, month, day)
    except Exception:
        pass
    return None

def get_date_ranges(recommended_dates):
    """권장재배시기 각각에 대해 ±10일 범위 계산"""
    if not recommended_dates:
        return []
    ranges = []
    for date_str in recommended_dates:
        parsed_date = parse_date_string(date_str)
        if parsed_date:
            min_date = (parsed_date - timedelta(days=10)).date()
            max_date = (parsed_date + timedelta(days=10)).date()
            ranges.append((min_date, max_date))
    return ranges

def is_date_allowed(selected_date, allowed_ranges):
    """선택한 날짜가 허용된 범위 중 하나에 포함되는지 확인"""
    if not allowed_ranges:
        return True
    for min_date, max_date in allowed_ranges:
        if min_date <= selected_date <= max_date:
            return True
    return False

def get_matching_planting_info(selected_date, recommended_dates, planting_dates, allowed_ranges):
    """선택된 날짜에 해당하는 권장시기 정보 반환"""
    for i, (min_date, max_date) in enumerate(allowed_ranges):
        if min_date <= selected_date <= max_date:
            if i < len(recommended_dates):
                recommended_date = recommended_dates[i]
                term_code = planting_dates.get(recommended_date, '')
                return recommended_date, term_code
    if recommended_dates:
        first_recommended = recommended_dates[0]
        return first_recommended, planting_dates.get(first_recommended, '')
    return '', ''

def parse_water_results(html_content):
    """HTML 결과 파싱"""
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        tables = soup.find_all('table', class_='board_list_a')
        conditions = {}
        results = []

        # 첫 번째 테이블: 검색 조건
        if len(tables) >= 1:
            condition_table = tables[0]
            tbody = condition_table.find('tbody')
            if tbody:
                rows = tbody.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 7:
                        conditions = {
                            '시도': cells[0].get_text(strip=True),
                            '시군구': cells[1].get_text(strip=True),
                            '작물': cells[2].get_text(strip=True),
                            '파종·정식시기': cells[3].get_text(strip=True),
                            '기상정보': cells[4].get_text(strip=True),
                            '관수방법': cells[5].get_text(strip=True),
                            '관수면적(m²)': cells[6].get_text(strip=True)
                        }
                        break

        # 두 번째 테이블: 결과 데이터
        if len(tables) >= 2:
            result_table = tables[1]
            tbody = result_table.find('tbody')
            if tbody:
                rows = tbody.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 1:
                        if cells[0].get('colspan'):
                            stage = cells[0].get_text(strip=True)
                            period = ""
                            total_water = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                            daily_water = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                        else:
                            stage = cells[0].get_text(strip=True)
                            period = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                            total_water = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                            daily_water = cells[3].get_text(strip=True) if len(cells) > 3 else ""

                        results.append({
                            '생육단계': stage,
                            '생육기간(월/일)': period,
                            '생육단계별 물 필요량(톤/1000m²)': total_water,
                            '일별 물 필요량(톤/day)': daily_water
                        })

        return conditions, results
    except Exception as e:
        return {}, []


@csrf_exempt
def get_water_api(request):
    """흙토람 물관리 처방서 통합 API"""
    if request.method == 'POST':
        try:
            mode = request.POST.get('mode', '')

            if mode == 'sgg':
                return handle_sgg_request(request)
            elif mode == 'crops':
                return handle_crops_request(request)
            elif mode == 'planting':
                return handle_planting_request(request)
            elif mode == 'report':
                return handle_report_request(request)
            else:
                return JsonResponse({'success': False, 'error': '유효하지 않은 모드입니다.'})

        except Exception as e:
            return JsonResponse({'success': False, 'error': f'처리 중 오류: {str(e)}'})

    return JsonResponse({'success': False, 'error': 'POST 요청만 허용됩니다.'})


def handle_sgg_request(request):
    """시군구 목록 조회"""
    sido_code = request.POST.get('sido_code', '')
    if not sido_code:
        return JsonResponse({'success': False, 'error': '시도 코드가 필요합니다.'})

    try:
        session = create_session()
        url = "https://soil.rda.go.kr/cmm/common/ajaxCall.do"
        params = {
            'mode': 'ADDR_AWM_WATER',
            'code': sido_code,
            '_': int(datetime.now().timestamp() * 1000)
        }
        response = session.get(url, params=params, timeout=10)

        if response.status_code == 200 and response.text.strip():
            sgg_dict = {}
            for item in response.text.strip().split('$,$'):
                if '$:$' in item:
                    name, code = item.split('$:$')
                    sgg_dict[name] = code
            return JsonResponse({'success': True, 'data': sgg_dict})
        else:
            return JsonResponse({'success': False, 'error': 'API 응답 오류'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'시군구 조회 오류: {str(e)}'})


def handle_crops_request(request):
    """작물 목록 조회"""
    sido_code = request.POST.get('sido_code', '')
    crop_gbn = request.POST.get('crop_gbn', '')
    if not sido_code or not crop_gbn:
        return JsonResponse({'success': False, 'error': '시도 코드와 작물 분류가 필요합니다.'})

    try:
        session = create_session()
        url = "https://soil.rda.go.kr/water/waterAjax.do"
        data = {
            'mode': 'newCrop',
            'sel_crop_gbn': crop_gbn,
            'sel_sido': sido_code
        }
        response = session.post(url, data=data, timeout=10)

        if response.status_code == 200 and response.text.strip():
            crops = {}
            for item in response.text.strip().split('$,$'):
                if '$:$' in item:
                    name, code = item.split('$:$')
                    crops[name] = code
            return JsonResponse({'success': True, 'data': crops})
        else:
            return JsonResponse({'success': False, 'error': 'API 응답 오류'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'작물 조회 오류: {str(e)}'})


def handle_planting_request(request):
    """파종·정식시기 조회"""
    sido_code = request.POST.get('sido_code', '')
    crop_code = request.POST.get('crop_code', '')
    if not sido_code or not crop_code:
        return JsonResponse({'success': False, 'error': '시도 코드와 작물 코드가 필요합니다.'})

    try:
        session = create_session()
        url = "https://soil.rda.go.kr/water/waterAjax.do"
        data = {
            'mode': 'newPlanting',
            'crop_cd': crop_code,
            'sel_sido': sido_code
        }
        response = session.post(url, data=data, timeout=10)

        if response.status_code == 200 and response.text.strip():
            dates = {}
            for item in response.text.strip().split('$,$'):
                if '$:$' in item:
                    name, code = item.split('$:$')
                    dates[name] = code

            # 기본 날짜 계산
            recommended_dates = list(dates.keys())
            default_date = None
            if recommended_dates:
                first_recommended = recommended_dates[0]
                parsed_date = parse_date_string(first_recommended)
                if parsed_date:
                    default_date = parsed_date.strftime('%Y-%m-%d')

            return JsonResponse({
                'success': True,
                'data': dates,
                'default_date': default_date,
                'recommended_dates': recommended_dates
            })
        else:
            return JsonResponse({'success': False, 'error': 'API 응답 오류'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'파종시기 조회 오류: {str(e)}'})


def handle_report_request(request):
    """물관리 처방서 조회"""
    try:
        # 파라미터 수집
        sido_code = request.POST.get('sido_code', '')
        sido_name = request.POST.get('sido_name', '')
        sgg_code = request.POST.get('sgg_code', '')
        sgg_name = request.POST.get('sgg_name', '')
        crop_gbn = request.POST.get('crop_gbn', '')
        crop_gbn_name = request.POST.get('crop_gbn_name', '')
        crop_code = request.POST.get('crop_code', '')
        crop_name = request.POST.get('crop_name', '')
        planting_date = request.POST.get('planting_date', '')
        weather_period = request.POST.get('weather_period', '3')  # 🔧 기본값 3
        irrigation_code = request.POST.get('irrigation_code', '02')  # 🔧 기본값 스프링클러
        irrigation_name = request.POST.get('irrigation_name', '스프링클러')
        area = int(request.POST.get('area', 1000))

        # 필수값 검증
        if not all([sido_code, sgg_code, crop_code, planting_date]):
            return JsonResponse({'success': False, 'error': '필수 파라미터가 누락되었습니다.'})

        # 날짜 파싱
        selected_date = datetime.strptime(planting_date, "%Y-%m-%d").date()

        # 권장시기 정보 조회
        session = create_session()
        planting_url = "https://soil.rda.go.kr/water/waterAjax.do"
        planting_data = {
            'mode': 'newPlanting',
            'crop_cd': crop_code,
            'sel_sido': sido_code
        }

        planting_response = session.post(planting_url, data=planting_data, timeout=10)
        planting_dates = {}

        if planting_response.status_code == 200 and planting_response.text.strip():
            for item in planting_response.text.strip().split('$,$'):
                if '$:$' in item:
                    name, code = item.split('$:$')
                    planting_dates[name] = code

        recommended_dates = list(planting_dates.keys())
        allowed_ranges = get_date_ranges(recommended_dates)

        # 날짜 유효성 검사
        if not is_date_allowed(selected_date, allowed_ranges):
            return JsonResponse({
                'success': False,
                'error': '선택된 날짜가 권장 파종시기 범위(±10일)를 벗어났습니다.'
            })

        # 매칭되는 권장시기 정보 찾기
        matching_recommended_date, matching_term_code = get_matching_planting_info(
            selected_date, recommended_dates, planting_dates, allowed_ranges
        )

        # 물관리 처방서 API 호출
        result_html = get_water_report_data(
            session, sido_code, sido_name, sgg_code, sgg_name,
            crop_gbn, crop_gbn_name, crop_code, crop_name,
            planting_date, matching_recommended_date, matching_term_code,
            weather_period, irrigation_code, irrigation_name, area
        )

        if result_html and 'board_list_a' in result_html:
            conditions, results = parse_water_results(result_html)
            return JsonResponse({
                'success': True,
                'conditions': conditions,
                'results': results,
                'crop_name': crop_name,
                'area': area,
                'selected_date': planting_date,
                'recommended_date': matching_recommended_date
            })
        else:
            return JsonResponse({'success': False, 'error': 'API로부터 올바른 응답을 받지 못했습니다.'})

    except Exception as e:
        return JsonResponse({'success': False, 'error': f'물관리 처방서 조회 오류: {str(e)}'})


def get_water_report_data(session, sido_code, sido_name, sgg_code, sgg_name,
                          crop_gbn, crop_gbn_name, crop_code, crop_name,
                          planting_date, recommended_date, term_code,
                          weather_period, irrigation_code, irrigation_name, area):
    """물관리 처방서 데이터 조회"""
    try:
        url = "https://soil.rda.go.kr/water/waterProc.do"

        # 날짜 처리
        date_obj = datetime.strptime(planting_date, "%Y-%m-%d")
        month_str = f"{date_obj.month:02d}"
        day_str = f"{date_obj.day:02d}"

        # 기본 폼 데이터
        form_data = {
            'key': '',
            'sido_cd_mini': sido_code,
            'sgg_cd_mini': sgg_code,
            'sel_crop_gbn': crop_gbn,
            'sel_crop': crop_code,
            'sel_plantation': '01',  # 노지 고정
            'sel_term': term_code,
            'exam_day_str': planting_date,
            'vapour_stad_gbn': weather_period,
            'sel_kind': irrigation_code,
            'in_house': str(area)
        }

        # 추가 파라미터 문자열
        param_str = (
            f"&mode=getList"
            f"&sel_sido_nm={urllib.parse.quote(sido_name)}"
            f"&sel_sido_cd={sido_code}"
            f"&sel_sgg_cd={sgg_code}"
            f"&sel_sgg_nm={urllib.parse.quote(sgg_name)}"
            f"&sel_climactic_nm="
            f"&sel_crop_gbn_nm={urllib.parse.quote(crop_gbn_name)}"
            f"&sel_crop_nm={urllib.parse.quote(crop_name)}"
            f"&sel_plantation_nm={urllib.parse.quote('노지')}"
            f"&sel_term_nm={month_str}월 {day_str}일"
            f"&sel_term_op={urllib.parse.quote(recommended_date)}"
            f"&sel_pattern_nm="
            f"$vapour_stad_gbn={weather_period}"
            f"&sel_term{term_code}"
            f"$in_house={area}"
            f"&sel_kind_nm={urllib.parse.quote(irrigation_name)}"
        )

        # 폼 데이터 + 파라미터 문자열 결합
        serialized_form = urllib.parse.urlencode(form_data)
        full_data = serialized_form + param_str

        # POST 요청 헤더
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://soil.rda.go.kr',
            'Referer': 'https://soil.rda.go.kr/water/waterReport.do'
        }

        response = session.post(url, data=full_data, headers=headers, timeout=30)

        if response.status_code == 200:
            return response.text
        else:
            return None

    except Exception as e:
        return None