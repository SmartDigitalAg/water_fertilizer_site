import requests, json, re, urllib.parse, calendar
import csv
import gzip  # ✅ 추가: gzip 모듈
import math
from pathlib import Path
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

SIDO_DATA = {"강원특별자치도": "51", "경기도": "41", "경상남도": "48", "경상북도": "47", "광주광역시": "29", "대구광역시": "27", "대전광역시": "30",
             "부산광역시": "26", "서울특별시": "11", "세종특별자치시": "36", "울산광역시": "31", "인천광역시": "28", "전라남도": "46", "전북특별자치도": "52",
             "제주특별자치도": "50", "충청남도": "44", "충청북도": "43"}
CROP_CATEGORIES = {"01": "곡류", "02": "엽채류", "03": "유지작물", "04": "서류", "05": "과수", "06": "근채류", "07": "과채류",
                   "08": "인경채류"}
SIDO_NAME_MAPPING = {"강원특별자치도": "강원특별자치도", "강원도": "강원특별자치도", "경기도": "경기도", "경상남도": "경상남도", "경남": "경상남도", "경상북도": "경상북도",
                     "경북": "경상북도", "광주광역시": "광주광역시", "광주시": "광주광역시", "대구광역시": "대구광역시", "대구시": "대구광역시", "대전광역시": "대전광역시",
                     "대전시": "대전광역시", "부산광역시": "부산광역시", "부산시": "부산광역시", "서울특별시": "서울특별시", "서울시": "서울특별시",
                     "세종특별자치시": "세종특별자치시", "세종시": "세종특별자치시", "울산광역시": "울산광역시", "울산시": "울산광역시", "인천광역시": "인천광역시",
                     "인천시": "인천광역시", "전라남도": "전라남도", "전남": "전라남도", "전북특별자치도": "전북특별자치도", "전라북도": "전북특별자치도",
                     "전북": "전북특별자치도", "제주특별자치도": "제주특별자치도", "제주도": "제주특별자치도", "충청남도": "충청남도", "충남": "충청남도",
                     "충청북도": "충청북도", "충북": "충청북도"}
KMA_HOST = "https://www.weather.go.kr"
RDA_DEFAULT_STATIONS = {"강원특별자치도": "217060A001", "경기도": "411801A001", "경상남도": "621100A001", "경상북도": "760380A001",
                        "광주광역시": "059223A001", "대구광역시": "041404B001", "대전광역시": "350808A001", "부산광역시": "618803A001",
                        "서울특별시": "137180A001", "세종특별자치시": "321916A001", "울산광역시": "689861A001", "인천광역시": "409871A001",
                        "전라남도": "520892A001", "전북특별자치도": "565862A001", "제주특별자치도": "695913A001", "충청남도": "350808A001",
                        "충청북도": "380959A001"}
RDA_DETAILED_STATIONS = {"477802A001": ["가평군", "가평읍"], "411801A001": ["고양시", "구산동"], "412040A002": ["고양시", "덕양구"],
                         "464030A001": ["광주시", "목현동"], "415743A001": ["김포시", "월곶면"], "472830A001": ["남양주", "진건읍"],
                         "429843A001": ["시흥시", "하중동"], "456871A001": ["안성시", "보개면"], "482841A001": ["양주시", "은현면"],
                         "476801A001": ["양평군", "양평읍"], "469803A001": ["여주시", "상거동"], "486803A001": ["연천군", "연천읍"],
                         "449872A001": ["용인시", "처인구"], "467800A001": ["이천시", "중리동"], "413813A001": ["파주시", "아동동"],
                         "451873A001": ["평택시", "오성면"], "487915A001": ["포천시", "신북면"], "445891A001": ["화성시", "장안면"],
                         "240813A001": ["동해시", "북평동"], "245832A001": ["삼척시", "근덕면"], "245825A002": ["삼척시", "미로면"],
                         "217060A001": ["속초시", "대포동"], "255840A001": ["양구군", "만대리"], "255840A002": ["양구군", "후리"],
                         "215821A001": ["양양군", "양양읍"], "230802A001": ["영월군", "영월읍"], "220844A001": ["원주시", "흥업면"],
                         "252805A001": ["인제군", "인제읍"], "026136A003": ["정선군", "신동읍"], "233852A002": ["정선군", "임계면"],
                         "233852A001": ["정선군", "정선읍"], "269811A001": ["철원군", "동송읍"], "200821A001": ["춘천시", "신북읍"],
                         "235802A001": ["태백시", "황지동"], "232803A001": ["평창군", "여만리"], "250802A001": ["홍천군", "화동리"],
                         "209802A001": ["화천군", "화천읍"], "225874A001": ["횡성군", "공근면"], "370853A001": ["영동군", "심천면"],
                         "373805A001": ["옥천군", "옥천읍"], "269804A001": ["음성군", "소이면"], "390874A001": ["제천시", "봉양읍"],
                         "365803A001": ["진천군", "진천읍"], "363883B001": ["청원군", "오창읍"], "363844A001": ["청주시", "남일면"],
                         "380959A001": ["충주시", "달천동"], "321916A001": ["계룡시", "두마면"], "032528A001": ["공주시", "우성면"],
                         "312831A001": ["금산군", "금성면"], "320862A001": ["논산시", "광석면"], "343808A001": ["당진시", "당진읍"],
                         "355831A001": ["보령시", "주교면"], "323814A001": ["부여군", "규암면"], "336812A001": ["아산시", "염치읍"],
                         "340861A001": ["예산군", "신암면"], "330846A001": ["천안시", "목천읍"], "031004A002": ["천안시", "성환읍"],
                         "345802A001": ["청양군", "청양읍"], "357903A001": ["태안군", "태안읍"], "350808A001": ["홍성군", "홍성읍"],
                         "054065A001": ["군산시", "개정면"], "576040A001": ["김제시", "부량면"], "590823A001": ["남원시", "이백면"],
                         "588802A001": ["무주군", "무주읍"], "595870A001": ["순창군", "구림면"], "565862A001": ["완주군", "고산면"],
                         "570802A001": ["익산시", "함열읍"], "566822A001": ["임실군", "신평면"], "597803A001": ["장수군", "장수읍"],
                         "580813A001": ["정읍시", "정우면"], "567801A002": ["진안군", "진안읍"], "059223A001": ["강진군", "군동면"],
                         "548912A001": ["고흥군", "풍양면"], "516821A001": ["곡성군", "오곡면"], "542805A001": ["구례군", "구례읍"],
                         "520892A001": ["나주시", "공산면"], "520943A002": ["나주시", "문평면"], "520853A003": ["나주시", "봉황면"],
                         "535873B003": ["나주시", "산포면"], "534844A001": ["무안군", "현경면"], "546804B001": ["보성군", "보성읍"],
                         "540814A001": ["순천시", "주암면"], "535812A001": ["신안군", "압해읍"], "555130A001": ["여수시", "주삼동"],
                         "513842A001": ["영광군", "군서면"], "526821A001": ["영암군", "덕진면"], "537807B004": ["완도군", "완도읍"],
                         "515804A001": ["장성군", "장성읍"], "529805A001": ["장흥군", "장흥읍"], "539823A001": ["진도군", "군내면"],
                         "525811A001": ["함평군", "학교면"], "536806A001": ["해남군", "삼산면"], "536824B002": ["해남군", "옥천면"],
                         "519822A001": ["화순군", "한천면"], "712851A001": ["경산시", "자인면"], "780950A001": ["경주시", "용강상리"],
                         "730802A001": ["구미시", "선산읍"], "039102B003": ["구미시", "옥성면"], "716823A001": ["군위군", "효령면"],
                         "041404B001": ["대구시", "북구"], "755851A002": ["봉화군", "봉성면"], "755851A001": ["봉화군", "석포면"],
                         "036229B007": ["봉화군", "외삼리"], "037268B004": ["상주시", "공성면"], "037251A006": ["상주시", "낙동면"],
                         "742912A002": ["상주시", "모동면"], "037127A003": ["상주시", "사벌국면"], "742290A001": ["상주시", "초산동"],
                         "742801A005": ["상주시", "함창읍"], "742871A004": ["상주시", "화북면"], "719862A001": ["성주군", "대가면"],
                         "040054B002": ["성주군", "대천리"], "036614B005": ["안동시", "북후면"], "760380A001": ["안동시", "송천동"],
                         "036531B008": ["영양군", "대천리"], "764803A001": ["영양군", "영양읍"], "750823A005": ["영주시", "부석면"],
                         "750873A001": ["영주시", "안정로"], "750873A002": ["영주시", "안풍리"], "036052B006": ["영주시", "용산리"],
                         "750852A006": ["영주시", "평은면"], "750804A003": ["영주시", "풍기읍"], "770270A001": ["영천시", "오미동"],
                         "757802A001": ["예천군", "예천읍"], "767862A001": ["울진군", "매화면"], "769912A001": ["의성군", "봉양면"],
                         "037339B009": ["의성군", "의성읍"], "038303A002": ["청도군", "각북면"], "038315B010": ["청도군", "이서면"],
                         "714902A001": ["청도군", "화양읍"], "763803A001": ["청송군", "청송읍"], "718814A001": ["칠곡군", "약목면"],
                         "037524A002": ["포항시", "기북면"], "791945A001": ["포항시", "북구"], "037947A004": ["포항시", "장기면"],
                         "037506A003": ["포항시", "죽장면"], "656933A001": ["거제시", "거제면"], "670807A001": ["거창군", "거창읍"],
                         "638802A001": ["고성군", "고성읍"], "621100A001": ["김해시", "전하동"], "627911A001": ["밀양시", "상남면"],
                         "664951A001": ["사천시", "용현면"], "660985B001": ["진주시", "초전동"], "635821A001": ["창녕군", "대지면"],
                         "051394A001": ["창원시", "대산면"], "650821A001": ["통영시", "광도면"], "667831A001": ["하동군", "적량면"],
                         "052304A001": ["하동군", "화개면"], "678806A001": ["합천군", "용주면"], "063531B010": ["서귀포", "감산리"],
                         "063550B007": ["서귀포", "중문동"], "699946A001": ["서귀포", "하례리"], "695913A001": ["제주시", "곽지리"],
                         "695971A001": ["제주시", "김녕리"], "695909B001": ["제주시", "상귀길"], "063352B012": ["제주시", "세화리"],
                         "063355A013": ["제주시", "송당리"], "063057B009": ["제주시", "애월읍"], "695907A001": ["제주시", "월각로"],
                         "063336B011": ["제주시", "조천읍"], "053359B008": ["제주시", "한동리"], "695923A001": ["제주시", "한림읍"],
                         "137180A001": ["서울시", "서초구"], "618803A001": ["부산시", "강서구"], "409911A001": ["옹진군", "백령면"],
                         "409871A001": ["옹진군", "영흥면"], "689861A001": ["울주군", "청량읍"], "050124D004": ["거창군", "동변리"],
                         "590834E001": ["남원시", "운봉읍"], "050415C005": ["밀양시", "산내면"], "579824E001": ["부안군", "계화면"],
                         "441707D001": ["수원시", "서둔동"], "323891D002": ["완주군", "이서면"], "037322D007": ["의성군", "옥산면"],
                         "026002D003": ["태백시", "매봉산"], "210913E001": ["강릉", "안반덕이"], "534833E001": ["무안군", "청계면"],
                         "741862E001": ["상주시", "화서면"], "486831E011": ["연천군", "신서면"], "766851E001": ["영덕군", "병곡면"],
                         "235270E001": ["태백", "귀네미골"], "232815E001": ["평창군", "운교리"], "232941E001": ["평창군", "진부면"],
                         "250845E001": ["홍천군", "자운리"], "050115F027": ["거창군", "주상면"], "039000F026": ["군위군", "소보면"],
                         "520821F001": ["나주시", "금천면"], "668812F002": ["남해군", "이동면"], "052546F018": ["사천시", "송포동"],
                         "037136F022": ["상주시", "외서면"], "063607F015": ["서귀포", "남원읍"], "063501F011": ["서귀포", "대정읍"],
                         "063527F012": ["서귀포", "덕수리"], "063641F007": ["서귀포", "성산읍"], "063605F004": ["서귀포", "신효동"],
                         "063532F013": ["서귀포", "창천리"], "063626F006": ["서귀포", "표선면"], "063541F014": ["서귀포", "하원동"],
                         "036043F024": ["영주시", "봉현면"], "038882F017": ["영천시", "금호읍"], "055365F016": ["완주군", "반교리"],
                         "045012F021": ["울주군", "서생면"], "017414F020": ["이천시", "장호원"], "017421F029": ["이천시", "진암리"],
                         "055640F028": ["장수군", "개정리"], "063356F008": ["제주시", "구좌읍"], "063190F010": ["제주시", "금악리"],
                         "063048F003": ["제주시", "신엄리"], "063240F009": ["제주시", "오등동"], "031028F034": ["천안시", "직산읍"],
                         "038316F030": ["청도군", "구라리"], "037448F025": ["청송군", "부남면"], "027486F033": ["충주시", "안림동"],
                         "011104F031": ["포천시", "영북면"], "018544F032": ["화성시", "마도면"]}

# Slope 데이터 캐시
SLOPE_DATA_CACHE = None


def load_slope_data():
    """slope.csv.gz 파일을 읽어서 메모리에 캐싱 (gzip 압축 지원)"""
    global SLOPE_DATA_CACHE

    if SLOPE_DATA_CACHE is not None:
        return SLOPE_DATA_CACHE

    try:
        # ✅ 수정: slope.csv → slope.csv.gz
        csv_path = Path(__file__).parent / 'static' / 'water' / 'data' / 'slope.csv.gz'

        slope_data = []

        # ✅ 수정: gzip.open()으로 압축 파일 읽기
        with gzip.open(csv_path, 'rt', encoding='utf-8') as f:
            reader = csv.reader(f)
            # 헤더가 있다면 스킵
            first_row = next(reader)
            # 첫 행이 숫자가 아니면 헤더로 판단
            try:
                float(first_row[0])
                # 숫자면 데이터이므로 다시 처리
                lat, lon, slope = float(first_row[0]), float(first_row[1]), float(first_row[2])
                slope_data.append({'lat': lat, 'lon': lon, 'slope': slope})
            except ValueError:
                pass  # 헤더이므로 스킵

            # 나머지 데이터 읽기
            for row in reader:
                if len(row) >= 3:
                    try:
                        lat, lon, slope = float(row[0]), float(row[1]), float(row[2])
                        slope_data.append({'lat': lat, 'lon': lon, 'slope': slope})
                    except ValueError:
                        continue

        SLOPE_DATA_CACHE = slope_data
        print(f"✅ Slope 데이터 로드 완료: {len(slope_data)}개")
        return slope_data
    except Exception as e:
        print(f"❌ Slope 데이터 로드 실패: {str(e)}")
        return []


def find_nearest_slope(target_lat, target_lon, max_distance=0.01):
    """
    주어진 위도/경도에 가장 가까운 slope 값을 찾기
    Args:
        target_lat: 목표 위도
        target_lon: 목표 경도
        max_distance: 최대 허용 거리 (기본값: 약 1km)
    Returns:
        slope 값 (0~1 사이), 없으면 None
    """
    slope_data = load_slope_data()

    if not slope_data:
        return None

    try:
        target_lat = float(target_lat)
        target_lon = float(target_lon)
    except (ValueError, TypeError):
        return None

    min_distance = float('inf')
    nearest_slope = None

    for point in slope_data:
        # 유클리디안 거리 계산 (단순화된 버전)
        distance = math.sqrt(
            (point['lat'] - target_lat) ** 2 +
            (point['lon'] - target_lon) ** 2
        )

        if distance < min_distance:
            min_distance = distance
            nearest_slope = point['slope']

    # 너무 멀리 떨어진 경우 None 반환
    if min_distance > max_distance:
        print(f"⚠️ 가장 가까운 지점이 너무 멀리 떨어져 있음: {min_distance:.6f}")
        return None

    return nearest_slope


def handle_slope_request(request):
    """Slope 값을 조회하는 API 핸들러"""
    lat = request.POST.get('lat', '').strip()
    lon = request.POST.get('lon', '').strip()

    if not lat or not lon:
        return JsonResponse({'success': False, 'error': '위도/경도 필요'})

    try:
        slope = find_nearest_slope(lat, lon)

        if slope is None:
            return JsonResponse({
                'success': False,
                'error': '해당 위치의 경사도 데이터를 찾을 수 없습니다'
            })

        # 0~1 값을 퍼센트로 변환
        slope_percent = slope * 100

        return JsonResponse({
            'success': True,
            'slope': slope,
            'slope_percent': round(slope_percent, 2),
            'lat': lat,
            'lon': lon
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'경사도 조회 오류: {str(e)}'
        })


def get_calendar_data(year, month):
    calendar.setfirstweekday(calendar.SUNDAY)
    cal = calendar.monthcalendar(year, month)
    today = datetime.today()
    cal_data = []
    for week in cal:
        week_data = []
        for day in week:
            if day == 0:
                week_data.append({'day': None, 'is_current_month': False, 'is_today': False, 'rainfall': None})
            else:
                is_today = (year == today.year and month == today.month and day == today.day)
                week_data.append({'day': day, 'is_current_month': True, 'is_today': is_today, 'rainfall': 0.0})
        cal_data.append(week_data)
    calendar.setfirstweekday(calendar.MONDAY)
    return cal_data


def water(request):
    today = datetime.today()
    cal_data = get_calendar_data(today.year, today.month)
    context = {'sido_data': json.dumps(SIDO_DATA), 'crop_categories': json.dumps(CROP_CATEGORIES),
               'sido_name_mapping': json.dumps(SIDO_NAME_MAPPING), 'year': today.year, 'month': today.month,
               'cal_data': json.dumps(cal_data)}
    return render(request, 'water/water.html', context)


def get_calendar_json(request):
    year = int(request.GET.get('year', datetime.today().year))
    month = int(request.GET.get('month', datetime.today().month))
    return JsonResponse({'success': True, 'year': year, 'month': month, 'cal_data': get_calendar_data(year, month)})


def get_latlon(request):
    query = request.GET.get('q')
    page = int(request.GET.get('page', '1'))
    per_page = int(request.GET.get('per_page', '10'))
    list_mode = request.GET.get('list', '0') == '1'
    if not query: return JsonResponse({'error': 'No query'}, status=400)
    API_KEY = "95F509DF-1191-3B2A-9A55-CB7DC41B88E6"
    SEARCH_URL = "https://api.vworld.kr/req/search"
    search_types = [{'type': 'address', 'category': 'parcel'}, {'type': 'address', 'category': 'road'},
                    {'type': 'place'}]
    result_items = []
    if list_mode:
        search_lower = query.replace(" ", "").lower()
        for search in search_types:
            for api_page in range(1, 11):
                params = {'service': 'search', 'request': 'search', 'version': '2.0', 'format': 'json', 'key': API_KEY,
                          'query': query, 'crs': 'EPSG:4326', 'type': search['type'], 'size': 1000, 'page': api_page}
                if 'category' in search: params['category'] = search['category']
                try:
                    res = requests.get(SEARCH_URL, params=params, timeout=10)
                    response_data = res.json()
                    if res.status_code != 200: break
                    items = response_data.get('response', {}).get('result', {}).get('items', [])
                    if not items: break
                    for item in items:
                        address_dict = item.get('address', {})
                        if search['type'] == 'address' and search.get('category') == 'parcel':
                            display_addr = address_dict.get('parcel', '')
                        elif search['type'] == 'address' and search.get('category') == 'road':
                            display_addr = address_dict.get('road', '')
                        else:
                            display_addr = item.get('title', '')
                        if display_addr and search_lower in display_addr.replace(" ", "").lower():
                            result_items.append(
                                {'address': display_addr, 'type': search.get('category', search['type']),
                                 'lat': item.get('point', {}).get('y', ''), 'lon': item.get('point', {}).get('x', ''),
                                 'parcel_addr': address_dict.get('parcel', ''),
                                 'road_addr': address_dict.get('road', '')})
                            if len(result_items) >= 300: break
                    if len(result_items) >= 300: break
                    import time
                    time.sleep(0.1)
                except Exception as e:
                    break
            if len(result_items) >= 300: break
        seen = set()
        unique_items = []
        for item in result_items:
            if item['address'] not in seen: seen.add(item['address']); unique_items.append(item)
        unique_items.sort(key=lambda x: ({'parcel': 0, 'road': 1, 'place': 2}.get(x['type'], 3), x['address']))
        total_count = len(unique_items)
        if total_count >= 300: return JsonResponse({'items': [], 'total': total_count, 'message': '검색 결과가 너무 많습니다.'})
        start = (page - 1) * per_page
        return JsonResponse({'items': unique_items[start:start + per_page], 'total': total_count, 'current_page': page,
                             'per_page': per_page, 'total_pages': (total_count + per_page - 1) // per_page})
    for search in search_types:
        params = {'service': 'search', 'request': 'search', 'version': '2.0', 'format': 'json', 'key': API_KEY,
                  'query': query, 'crs': 'EPSG:4326', 'type': search['type'], 'size': 10}
        if 'category' in search: params['category'] = search['category']
        try:
            res = requests.get(SEARCH_URL, params=params, timeout=10)
            if res.status_code != 200: continue
            items = res.json().get('response', {}).get('result', {}).get('items', [])
            if items:
                item = items[0]
                address_dict = item.get('address', {})
                return JsonResponse({'lat': item['point']['y'], 'lon': item['point']['x'],
                                     'parcel_addr': address_dict.get('parcel', ''),
                                     'road_addr': address_dict.get('road', ''), 'address': item.get('title', query)})
        except:
            continue
    return JsonResponse({'error': 'No result'}, status=404)


def create_session():
    s = requests.Session()
    s.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                      'Accept-Language': 'ko-KR,ko;q=0.9', 'Connection': 'keep-alive'})
    try:
        s.get('https://soil.rda.go.kr/water/waterReport.do', timeout=10)
    except:
        pass
    return s


def parse_date_string(date_str):
    try:
        if '월' in date_str and '일' in date_str:
            m = re.search(r'(\d+)월', date_str)
            d = re.search(r'(\d+)일', date_str)
            if m and d: return datetime(2025, int(m.group(1)), int(d.group(1)))
    except:
        pass
    return None


def get_date_ranges(recommended_dates):
    if not recommended_dates: return []
    ranges = []
    for date_str in recommended_dates:
        parsed = parse_date_string(date_str)
        if parsed: ranges.append(((parsed - timedelta(days=10)).date(), (parsed + timedelta(days=10)).date()))
    return ranges


def is_date_allowed(selected_date, allowed_ranges):
    if not allowed_ranges: return True
    for min_date, max_date in allowed_ranges:
        if min_date <= selected_date <= max_date: return True
    return False


def get_matching_planting_info(selected_date, recommended_dates, planting_dates, allowed_ranges):
    for i, (min_date, max_date) in enumerate(allowed_ranges):
        if min_date <= selected_date <= max_date:
            if i < len(recommended_dates):
                rec = recommended_dates[i]
                return rec, planting_dates.get(rec, '')
    if recommended_dates: return recommended_dates[0], planting_dates.get(recommended_dates[0], '')
    return '', ''


def parse_water_results(html_content):
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        tables = soup.find_all('table', class_='board_list_a')
        conditions, results = {}, []
        if len(tables) >= 1:
            tbody = tables[0].find('tbody')
            if tbody:
                rows = tbody.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 7:
                        conditions = {'시도': cells[0].get_text(strip=True), '시군구': cells[1].get_text(strip=True),
                                      '작물': cells[2].get_text(strip=True), '파종·정식시기': cells[3].get_text(strip=True),
                                      '기상정보': cells[4].get_text(strip=True), '관수방법': cells[5].get_text(strip=True),
                                      '관수면적(m²)': cells[6].get_text(strip=True)}
                        break
        if len(tables) >= 2:
            tbody = tables[1].find('tbody')
            if tbody:
                for row in tbody.find_all('tr'):
                    cells = row.find_all('td')
                    if len(cells) >= 1:
                        if cells[0].get('colspan'):
                            stage, period, total_water, daily_water = cells[0].get_text(strip=True), "", cells[
                                1].get_text(strip=True) if len(cells) > 1 else "", cells[2].get_text(strip=True) if len(
                                cells) > 2 else ""
                        else:
                            stage, period, total_water, daily_water = cells[0].get_text(strip=True), cells[1].get_text(
                                strip=True) if len(cells) > 1 else "", cells[2].get_text(strip=True) if len(
                                cells) > 2 else "", cells[3].get_text(strip=True) if len(cells) > 3 else ""
                        results.append({'생육단계': stage, '생육기간(월/일)': period, '생육단계별 물 필요량(톤/1000m²)': total_water,
                                        '일별 물 필요량(톤/day)': daily_water})
        return conditions, results
    except:
        return {}, []


def get_rda_station_code(address):
    parts = address.split()
    if len(parts) < 2: return None
    sido, sgg = parts[0], parts[1] if len(parts) > 1 else ""
    sido_normalized = SIDO_NAME_MAPPING.get(sido, sido)
    for code, loc in RDA_DETAILED_STATIONS.items():
        if len(loc) >= 2 and loc[0] in address and loc[1] in address:
            print(f"✅ 세부 지점: {code} ({loc[0]} {loc[1]})")
            return code
    default = RDA_DEFAULT_STATIONS.get(sido_normalized)
    if default: print(f"ℹ️ 대표 지점: {default} ({sido_normalized})")
    return default


def fetch_rda_rainfall_data(station_code):
    try:
        s = requests.Session()
        s.headers.update({'User-Agent': 'Mozilla/5.0', 'Referer': 'https://weather.rda.go.kr/analysis/inquiry.do',
                          'X-Requested-With': 'XMLHttpRequest'})
        s.get('https://weather.rda.go.kr/analysis/inquiry.do', timeout=10)
        s.post('https://weather.rda.go.kr/getJijumListRegion2.do', data={'jijumCode': station_code}, timeout=10)
        post_data = {'region': '', 'jijum': station_code, 'period': 'year', 'syear': '2025', 'smonth': '', 'sday': '',
                     'day': '', 'fday': '', 'schRange': '1'}
        response = s.post('https://weather.rda.go.kr/analysis/inquiry_a.do', data=post_data, timeout=30)
        if response.status_code != 200: return {}
        soup = BeautifulSoup(response.text, 'html.parser')
        table = soup.find('table', class_='list_type_a') or soup.find('table')
        if not table: return {}
        rows = table.find_all('tr')
        if len(rows) <= 1: return {}
        headers = rows[0].find_all(['th', 'td'])
        rainfall_idx = -1
        for idx, th in enumerate(headers):
            if '강수량' in th.get_text(strip=True): rainfall_idx = idx; break
        if rainfall_idx == -1: return {}
        rainfall_data = {}
        for row in rows[1:]:
            cells = row.find_all(['th', 'td'])
            if len(cells) <= rainfall_idx: continue
            date_text = cells[0].get_text(strip=True)
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_text): continue
            try:
                rainfall_text = cells[rainfall_idx].get_text(strip=True)
                rainfall_data[date_text] = float(
                    rainfall_text.replace(',', '')) if rainfall_text and rainfall_text != '-' else 0.0
            except:
                continue
        return rainfall_data
    except:
        return {}


def handle_rainfall_request(request):
    address = request.POST.get('address', '').strip()
    year = int(request.POST.get('year', datetime.now().year))
    month = int(request.POST.get('month', datetime.now().month))
    if not address: return JsonResponse({'success': False, 'error': '주소 필요'})
    try:
        code = get_rda_station_code(address)
        if not code: return JsonResponse({'success': False, 'error': '관측지점 없음'})
        rainfall = fetch_rda_rainfall_data(code)
        cal_data = get_calendar_data(year, month)
        for week in cal_data:
            for day_info in week:
                if day_info['is_current_month'] and day_info['day']:
                    key = f"{year}-{month:02d}-{day_info['day']:02d}"
                    if key in rainfall: day_info['rainfall'] = rainfall[key]
        return JsonResponse({'success': True, 'year': year, 'month': month, 'cal_data': cal_data, 'station_code': code})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'강수량 조회 실패: {str(e)}'})


def handle_rainfall_all_request(request):
    address = request.POST.get('address', '').strip()
    if not address: return JsonResponse({'success': False, 'error': '주소 필요'})
    try:
        code = get_rda_station_code(address)
        if not code: return JsonResponse({'success': False, 'error': '관측지점 없음'})
        rainfall = fetch_rda_rainfall_data(code)
        return JsonResponse(
            {'success': True, 'rainfall_data': rainfall, 'station_code': code, 'data_count': len(rainfall)})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'전체 강수량 조회 실패: {str(e)}'})


def _get_zone_codes_from_address(address: str):
    parts = [p for p in address.split() if p.strip()]
    if len(parts) < 2: raise ValueError("주소에서 시/도, 시/군/구 추출 실패")
    sido, sgg = parts[0], parts[1]
    sido_normalized = SIDO_NAME_MAPPING.get(sido, sido)
    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest",
                      "Referer": f"{KMA_HOST}/w/weather/forecast/short-term.do"})
    r = s.get(f"{KMA_HOST}/w/rest/zone/dong.do", params={"type": "WIDE", "wideCode": "", "cityCode": "", "keyword": ""},
              timeout=10)
    wide = next((w for w in r.json() if w.get("name") == sido_normalized), None) or next(
        (w for w in r.json() if w.get("name") == sido), None)
    if not wide: raise ValueError(f"광역시도({sido}) 없음")
    wideCode = wide["code"]
    r = s.get(f"{KMA_HOST}/w/rest/zone/dong.do", params={"type": "CITY", "wideCode": wideCode, "cityCode": ""},
              timeout=10)
    city = next((c for c in r.json() if sgg in c.get("name", "")), None)
    if not city: raise ValueError(f"시군구({sgg}) 없음")
    cityCode = city["code"]
    r = s.get(f"{KMA_HOST}/w/rest/zone/dong.do", params={"type": "DONG", "wideCode": wideCode, "cityCode": cityCode},
              timeout=10)
    dongs = r.json()
    dongObj = None
    if len(parts) >= 3:
        emd = parts[2]
        dongObj = next((d for d in dongs if emd in d.get("name", "")), None)
    if not dongObj: dongObj = dongs[0] if dongs else None
    if not dongObj: raise ValueError("읍면동 정보 없음")
    return wideCode, cityCode, dongObj["code"], dongObj.get("lat") or dongObj.get("latitude"), dongObj.get(
        "lon") or dongObj.get("longitude")


def _fetch_digital_forecast_html(code: str, lat: str, lon: str):
    params = {"code": code, "unit": "m/s", "hr1": "Y", "ts": "", "lat": lat, "lon": lon}
    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest",
                      "Referer": f"{KMA_HOST}/w/weather/forecast/short-term.do"})
    r = s.get(f"{KMA_HOST}/w/wnuri-fct2021/main/digital-forecast.do", params=params, timeout=10)
    r.raise_for_status()
    return r.text


def _map_weather_to_icon(weather_text: str, is_night: bool = False) -> str:
    weather_map = {"맑음": "DB01", "구름많음": "DB03", "흐림": "DB04", "비": "DB05-Q2", "눈": "DB05-Q2"}
    base_icon = "DB05-Q2" if "비" in (weather_text or "") else weather_map.get(weather_text, "DB01")
    if is_night and base_icon in ["DB01", "DB03", "DB04"]: return f"{base_icon}_N"
    return base_icon


def _parse_daily_hourly_from_html(html: str):
    soup = BeautifulSoup(html, "html.parser")
    today = datetime.today().date()
    daily = []

    for idx, slide in enumerate(soup.select(".dfs-daily-slide")[:4]):
        box = slide.select_one(".dfs-daily-slide-box")
        if not box: continue
        h4 = box.select_one("h4")
        if not h4: continue
        dateDay, dateNum, dateDow, dateLabel, isToday, isPlusOne = "", "", "", "", False, False
        spans = h4.find_all("span")
        em = h4.find("em")
        if len(spans) >= 2:
            dateNum, dateDow, dateDay = spans[0].get_text(strip=True), spans[1].get_text(strip=True).strip(
                "()"), f"{spans[0].get_text(strip=True)}({spans[1].get_text(strip=True).strip('()')})"
        elif len(spans) == 1:
            dateDay = spans[0].get_text(strip=True)
            dateNum = dateDay
            if em: dateDow = em.get_text(strip=True).strip("()"); dateDay = f"{dateDay} {dateDow}"
        if em and em.get_text(strip=True) in ("오늘", "내일", "모레"): dateLabel = em.get_text(strip=True); isToday = (
                dateLabel == "오늘")
        if idx == 3: isPlusOne = True
        item = box.select_one(".dfs-daily-item")
        if not item: continue
        weatherAM = weatherPM = iconAM = iconPM = ""
        popAM = popPM = None
        allday = item.select_one(".daily-weather-allday")
        if allday:
            weather_span = allday.select_one("span")
            if weather_span: weatherAM = weatherPM = weather_span.get_text(
                strip=True); iconAM = iconPM = _map_weather_to_icon(weatherAM)
            pop_span = item.select_one(".daily-pop-allday span")
            if pop_span: popAM = popPM = pop_span.get_text(strip=True).replace("%", "")
        else:
            am = item.select_one(".daily-weather-am span")
            pm = item.select_one(".daily-weather-pm span")
            if am: weatherAM = am.get_text(strip=True); iconAM = _map_weather_to_icon(weatherAM)
            if pm: weatherPM = pm.get_text(strip=True); iconPM = _map_weather_to_icon(weatherPM)
            pam = item.select_one(".daily-pop-am span")
            ppm = item.select_one(".daily-pop-pm span")
            if pam: popAM = pam.get_text(strip=True).replace("%", "")
            if ppm: popPM = ppm.get_text(strip=True).replace("%", "")
        tmin = tmax = None
        minmax = item.select_one(".daily-minmax")
        if minmax:
            min_div = minmax.select_one("div:nth-child(1)")
            if min_div:
                min_span = min_div.select_one("span")
                if min_span: tmin = min_span.get_text(strip=True).replace("℃", "").replace("°", "")
            max_div = minmax.select_one("div:nth-child(2)")
            if max_div:
                max_span = max_div.select_one("span")
                if max_span: tmax = max_span.get_text(strip=True).replace("℃", "").replace("°", "")
        if not tmin or not tmax:
            if slide.get("data-min"): tmin = slide.get("data-min")
            if slide.get("data-max"): tmax = slide.get("data-max")
        daily.append({"dateDay": dateDay or "-", "dateNum": dateNum or "-", "dateDow": dateDow or "",
                      "dateLabel": dateLabel or "", "isToday": isToday, "isPlusOne": isPlusOne, "timeLabel": "오전/오후",
                      "weatherAM": weatherAM or "-", "weatherPM": weatherPM or "-", "iconAM": iconAM or "DB01",
                      "iconPM": iconPM or "DB01", "tmin": tmin, "tmax": tmax, "popAM": popAM, "popPM": popPM})

    hourly = []
    current_hour = datetime.now().hour
    current_date_str = today.isoformat()

    items = soup.select("ul.item")
    if not items:
        items = soup.select("ul.item.vs-item")

    for item in items[:24]:
        date_attr = item.get("data-date", "")
        time_attr = item.get("data-time", "")
        time_li = item.select("li")[0] if item.select("li") else None
        time_str = time_li.select_one("span:not(.hid)").get_text(strip=True) if time_li else "-"
        is_today_hour = (date_attr == current_date_str)
        is_night = False
        if time_attr: hour_part = int(time_attr.split(":")[0]); is_night = (hour_part >= 18 or hour_part < 6)
        weather_li = item.select("li")[1] if len(item.select("li")) > 1 else None
        desc = weather_li.select_one("span.wic").get_text(strip=True) if weather_li and weather_li.select_one(
            "span.wic") else "-"
        icon = _map_weather_to_icon(desc, is_night)
        pcp_li = item.select_one("li.pcp")
        rn = pcp_li.select_one("span:not(.hid)").get_text(strip=True) if pcp_li and pcp_li.select_one(
            "span:not(.hid)") else "-"
        pop_li = item.select("li")[6] if len(item.select("li")) > 6 else None
        pop = pop_li.select_one("span:not(.hid)").get_text(strip=True) if pop_li and pop_li.select_one(
            "span:not(.hid)") else "-"
        hourly.append({"time": time_str, "isToday": is_today_hour, "desc": desc, "icon": icon, "rn": rn, "pop": pop})

    return {"daily": daily, "hourly": hourly}


def handle_short_forecast_request(request):
    address = request.POST.get("address", "").strip()
    code = request.POST.get("code", "").strip()
    lat = request.POST.get("lat", "").strip()
    lon = request.POST.get("lon", "").strip()
    try:
        if not code:
            if not address: return JsonResponse({"success": False, "error": "address 또는 code 필요"})
            wide, city, dong, lat, lon = _get_zone_codes_from_address(address)
            code = dong
        html = _fetch_digital_forecast_html(code, lat, lon)
        parsed = _parse_daily_hourly_from_html(html)
        return JsonResponse({"success": True, **parsed})
    except Exception as e:
        return JsonResponse({"success": False, "error": f"단기예보 조회 실패: {str(e)}"})


@csrf_exempt
def get_water_api(request):
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
            elif mode == 'short_forecast':
                return handle_short_forecast_request(request)
            elif mode == 'rainfall':
                return handle_rainfall_request(request)
            elif mode == 'rainfall_all':
                return handle_rainfall_all_request(request)
            elif mode == 'slope':
                return handle_slope_request(request)
            else:
                return JsonResponse({'success': False, 'error': '유효하지 않은 모드'})
        except Exception as e:
            return JsonResponse({'success': False, 'error': f'처리 중 오류: {str(e)}'})
    return JsonResponse({'success': False, 'error': 'POST 요청만 허용'})


def handle_sgg_request(request):
    sido_code = request.POST.get('sido_code', '')
    if not sido_code: return JsonResponse({'success': False, 'error': '시도 코드 필요'})
    try:
        s = create_session()
        params = {'mode': 'ADDR_AWM_WATER', 'code': sido_code, '_': int(datetime.now().timestamp() * 1000)}
        response = s.get("https://soil.rda.go.kr/cmm/common/ajaxCall.do", params=params, timeout=10)
        if response.status_code == 200 and response.text.strip():
            sgg_dict = {}
            for item in response.text.strip().split('$,$'):
                if '$:$' in item: name, code = item.split('$:$'); sgg_dict[name] = code
            return JsonResponse({'success': True, 'data': sgg_dict})
        else:
            return JsonResponse({'success': False, 'error': 'API 응답 오류'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'시군구 조회 오류: {str(e)}'})


def handle_crops_request(request):
    sido_code = request.POST.get('sido_code', '')
    crop_gbn = request.POST.get('crop_gbn', '')
    if not sido_code or not crop_gbn: return JsonResponse({'success': False, 'error': '시도 코드와 작물 분류 필요'})
    try:
        s = create_session()
        data = {'mode': 'newCrop', 'sel_crop_gbn': crop_gbn, 'sel_sido': sido_code}
        response = s.post("https://soil.rda.go.kr/water/waterAjax.do", data=data, timeout=10)
        if response.status_code == 200 and response.text.strip():
            crops = {}
            for item in response.text.strip().split('$,$'):
                if '$:$' in item: name, code = item.split('$:$'); crops[name] = code
            return JsonResponse({'success': True, 'data': crops})
        else:
            return JsonResponse({'success': False, 'error': 'API 응답 오류'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'작물 조회 오류: {str(e)}'})


def handle_planting_request(request):
    sido_code = request.POST.get('sido_code', '')
    crop_code = request.POST.get('crop_code', '')
    if not sido_code or not crop_code: return JsonResponse({'success': False, 'error': '시도 코드와 작물 코드 필요'})
    try:
        s = create_session()
        data = {'mode': 'newPlanting', 'crop_cd': crop_code, 'sel_sido': sido_code}
        response = s.post("https://soil.rda.go.kr/water/waterAjax.do", data=data, timeout=10)
        if response.status_code == 200 and response.text.strip():
            dates = {}
            for item in response.text.strip().split('$,$'):
                if '$:$' in item: name, code = item.split('$:$'); dates[name] = code
            recommended_dates = list(dates.keys())
            default_date = None
            if recommended_dates:
                first = parse_date_string(recommended_dates[0])
                if first: default_date = first.strftime('%Y-%m-%d')
            return JsonResponse(
                {'success': True, 'data': dates, 'default_date': default_date, 'recommended_dates': recommended_dates})
        else:
            return JsonResponse({'success': False, 'error': 'API 응답 오류'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'파종시기 조회 오류: {str(e)}'})


def handle_report_request(request):
    try:
        sido_code = request.POST.get('sido_code', '')
        sido_name = request.POST.get('sido_name', '')
        sgg_code = request.POST.get('sgg_code', '')
        sgg_name = request.POST.get('sgg_name', '')
        crop_gbn = request.POST.get('crop_gbn', '')
        crop_gbn_name = request.POST.get('crop_gbn_name', '')
        crop_code = request.POST.get('crop_code', '')
        crop_name = request.POST.get('crop_name', '')
        planting_date = request.POST.get('planting_date', '')
        weather_period = request.POST.get('weather_period', '3')
        irrigation_code = request.POST.get('irrigation_code', '02')
        irrigation_name = request.POST.get('irrigation_name', '스프링클러')
        area = int(request.POST.get('area', 1000))
        if not all([sido_code, sgg_code, crop_code, planting_date]): return JsonResponse(
            {'success': False, 'error': '필수 파라미터 누락'})
        selected_date = datetime.strptime(planting_date, "%Y-%m-%d").date()
        s = create_session()
        planting_data = {'mode': 'newPlanting', 'crop_cd': crop_code, 'sel_sido': sido_code}
        planting_response = s.post("https://soil.rda.go.kr/water/waterAjax.do", data=planting_data, timeout=10)
        planting_dates = {}
        if planting_response.status_code == 200 and planting_response.text.strip():
            for item in planting_response.text.strip().split('$,$'):
                if '$:$' in item: name, code = item.split('$:$'); planting_dates[name] = code
        recommended_dates = list(planting_dates.keys())
        allowed_ranges = get_date_ranges(recommended_dates)
        if not is_date_allowed(selected_date, allowed_ranges): return JsonResponse(
            {'success': False, 'error': '선택된 날짜가 권장 파종시기 범위(±10일) 벗어남'})
        matching_recommended_date, matching_term_code = get_matching_planting_info(selected_date, recommended_dates,
                                                                                   planting_dates, allowed_ranges)
        result_html = get_water_report_data(s, sido_code, sido_name, sgg_code, sgg_name, crop_gbn, crop_gbn_name,
                                            crop_code, crop_name, planting_date, matching_recommended_date,
                                            matching_term_code, weather_period, irrigation_code, irrigation_name, area)
        if result_html and 'board_list_a' in result_html:
            conditions, results = parse_water_results(result_html)
            return JsonResponse(
                {'success': True, 'conditions': conditions, 'results': results, 'crop_name': crop_name, 'area': area,
                 'selected_date': planting_date, 'recommended_date': matching_recommended_date})
        else:
            return JsonResponse({'success': False, 'error': 'API로부터 올바른 응답 없음'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'물관리 처방서 조회 오류: {str(e)}'})


def get_water_report_data(s, sido_code, sido_name, sgg_code, sgg_name, crop_gbn, crop_gbn_name, crop_code, crop_name,
                          planting_date, recommended_date, term_code, weather_period, irrigation_code, irrigation_name,
                          area):
    try:
        date_obj = datetime.strptime(planting_date, "%Y-%m-%d")
        month_str = f"{date_obj.month:02d}"
        day_str = f"{date_obj.day:02d}"
        form_data = {'key': '', 'sido_cd_mini': sido_code, 'sgg_cd_mini': sgg_code, 'sel_crop_gbn': crop_gbn,
                     'sel_crop': crop_code, 'sel_plantation': '01', 'sel_term': term_code,
                     'exam_day_str': planting_date, 'vapour_stad_gbn': weather_period, 'sel_kind': irrigation_code,
                     'in_house': str(area)}
        param_str = f"&mode=getList&sel_sido_nm={urllib.parse.quote(sido_name)}&sel_sido_cd={sido_code}&sel_sgg_cd={sgg_code}&sel_sgg_nm={urllib.parse.quote(sgg_name)}&sel_climactic_nm=&sel_crop_gbn_nm={urllib.parse.quote(crop_gbn_name)}&sel_crop_nm={urllib.parse.quote(crop_name)}&sel_plantation_nm={urllib.parse.quote('노지')}&sel_term_nm={month_str}월 {day_str}일&sel_term_op={urllib.parse.quote(recommended_date)}&sel_pattern_nm=$vapour_stad_gbn={weather_period}&sel_term{term_code}$in_house={area}&sel_kind_nm={urllib.parse.quote(irrigation_name)}"
        full_data = urllib.parse.urlencode(form_data) + param_str
        headers = {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                   'X-Requested-With': 'XMLHttpRequest', 'Origin': 'https://soil.rda.go.kr',
                   'Referer': 'https://soil.rda.go.kr/water/waterReport.do'}
        response = s.post("https://soil.rda.go.kr/water/waterProc.do", data=full_data, headers=headers, timeout=30)
        return response.text if response.status_code == 200 else None
    except:
        return None