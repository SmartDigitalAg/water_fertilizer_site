import requests
import json
import time
import re
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# 작물 유형 목록
CROP_CATEGORIES = {
    "00": "곡류(벼)",
    "01": "곡류(기타)",
    "02": "유지류",
    "03": "서류",
    "04": "과채류",
    "05": "근채류",
    "06": "인경채류",
    "07": "경엽채소류",
    "08": "산채류",
    "09": "과수",
    "10": "약용작물",
    "11": "화훼류",
    "12": "사료작물",
    "13": "기타"
}

# 과채류 작물 목록 (테스트용)
CROPS = {
    "04020": "가지(노지재배)",
    "04021": "가지(시설재배)",
    "04001": "고추(노지재배)",
    "04003": "고추(밀식재배)",
    "04002": "고추(시설재배)",
    "04005": "꽈리고추(시설재배)",
    "04032": "단호박",
    "04011": "딸기(노지재배)",
    "04012": "딸기(시설재배)",
    "04025": "맷돌호박",
    "04015": "멜론(시설재배)",
    "04008": "방울토마토(시설재배)",
    "04027": "복수박",
    "04028": "송이토마토",
    "04016": "수박(노지재배)",
    "04017": "수박(시설재배)",
    "04030": "수세미",
    "04026": "애플수박",
    "04024": "애호박",
    "04022": "여주",
    "04009": "오이(노지재배)",
    "04010": "오이(시설재배)",
    "04029": "울외",
    "04023": "주키니호박",
    "04013": "참외(노지재배)",
    "04014": "참외(시설재배)",
    "04006": "토마토(노지재배)",
    "04007": "토마토(시설재배)",
    "04031": "파프리카",
    "04004": "피망(시설재배)",
    "04018": "호박(노지재배)",
    "04019": "호박(시설재배)"
}

def get_pnu_list_from_api(address):
    api_key = "D8A444DC-1488-3E6F-8FBC-BB9F6F4C3ED6"
    url = (
        f"https://api.vworld.kr/req/search"
        f"?service=search&request=search&version=2.0&size=30&page=1"
        f"&query={address}"
        f"&type=address&category=PARCEL"
        f"&format=json&errorformat=json&key={api_key}"
    )
    response = requests.get(url)
    result_list = []
    if response.status_code == 200:
        try:
            result = response.json()
            items = result.get('response', {}).get('result', {}).get('items', [])
            for item in items:
                result_list.append({
                    'address': get_address_str(item.get('address', '')),  # 문자열로 변환된 주소
                    'pnu': item.get('id', ''),
                })
        except Exception:
            pass
    return result_list


# address 필드가 dict이든 str이든 안전하게 문자열 반환
def get_address_str(addr):
    if isinstance(addr, dict):
        # 'parcel' 필드(지번 주소) 우선, 없으면 그냥 str(addr)
        return addr.get('parcel', '') if 'parcel' in addr else str(addr)
    return addr or ''


def patch_pnu_mountain(pnu, mountain_sel):
    """
    mountain_sel: "0"=일반 → "1", "1"=산 → "2"
    기본값은 "0"(일반)로 처리
    """
    if not pnu or len(pnu) < 11:
        return pnu
    # 정확히 "1"일 때만 산(2), 그 외는 일반(1)
    mountain = "2" if mountain_sel == "1" else "1"
    return pnu[:10] + mountain + pnu[11:]


def prescription(request):
    # 1. AJAX: API 검색 버튼 클릭 시 - 인증키, PNU코드, 작물코드, 쌀품질코드 출력
    if request.method == "POST" and request.POST.get("api_search"):
        # 주소검색과 동일한 로직 사용
        sido = request.POST.get('sido', '').strip()
        sigungu = request.POST.get('sigungu', '').strip()
        eupmyeon = request.POST.get('eupmyeon', '').strip()
        ri = request.POST.get('ri', '').strip()
        bonbun = request.POST.get('bonbun', '').strip()
        bubun = request.POST.get('bubun', '').strip()
        mountain_sel = request.POST.get('mountain', '0').strip()

        # 작물 정보 받기
        crop_name = request.POST.get('crop_name', '').strip()
        rice_quality = request.POST.get('rice_quality', '').strip()

        # 검증
        if not all([sido, sigungu, eupmyeon, crop_name]):
            return JsonResponse({
                "result": "fail",
                "message": "지역과 작물을 모두 선택해주세요."
            })

        # 벼(일반답) 선택 시 품질 선택 필수
        if crop_name == "벼(일반답)" and not rice_quality:
            return JsonResponse({
                "result": "fail",
                "message": "벼(일반답) 선택 시 품질을 선택해주세요."
            })

        # 주소검색과 동일한 PNU 조회 로직
        address = f"{sido} {sigungu} {eupmyeon} {ri}".strip()
        if bonbun:
            jibun = bonbun
            if bubun:
                jibun += f"-{bubun}"
            address = f"{address} {jibun}".strip()

        result_pnu_list = get_pnu_list_from_api(address)

        # 지번(본번)이 있으면 address 완전일치 1건만 반환
        if bonbun:
            addr_nospace = address.replace(" ", "")
            result_pnu_list = [
                                  item for item in result_pnu_list
                                  if get_address_str(item.get('address')).replace(" ", "") == addr_nospace
                              ][:1]  # 첫번째 1건만

        # PNU 11번째 자리(필지구분) 치환 (일반이면 1, 산이면 2)
        for item in result_pnu_list:
            pnu = item.get('pnu', '')
            if pnu and len(pnu) >= 19:
                item['pnu'] = patch_pnu_mountain(pnu, mountain_sel)

        if not result_pnu_list:
            return JsonResponse({
                "result": "fail",
                "message": "PNU 코드를 찾을 수 없습니다."
            })

        # 작물 코드 매핑
        crop_code_map = {
            "벼(일반답)": "00001",
            "토마토(노지)": "04016",
            "사과(1-4년생)": "09051",
            "배(1-4년생)": "09042",
            "장미": "11005",
            "국화": "11004",
        }

        # 쌀품질 코드 매핑
        rice_quality_map = {
            "고품질쌀(9kg)": "1",
            "최고쌀(7kg)": "2",
            "보통쌀(11kg)": "3"
        }

        crop_code = crop_code_map.get(crop_name, "00001")
        rice_qlt_code = rice_quality_map.get(rice_quality, "1") if crop_name == "벼(일반답)" else "1"

        # 인증키
        service_key = 'fOnrt/nVSCnLI05XSbmySE3F11nxviUIhefxXDnVGGbJusKK04jb0OIAkpbgUuRyca9HwxTfHbi1GiN4UyL/DQ=='

        # 결과 출력
        result_data = {
            "result": "success",
            "service_key": service_key,
            "pnu_code": result_pnu_list[0]['pnu'],
            "crop_code": crop_code,
            "crop_name": crop_name,
            "address": address,
            "pnu_address": result_pnu_list[0]['address']
        }

        # 벼(일반답) 선택 시에만 쌀품질코드 포함
        if crop_name == "벼(일반답)":
            result_data["rice_qlt_code"] = rice_qlt_code
            result_data["rice_quality"] = rice_quality

        return JsonResponse(result_data)

    # 2. AJAX: 비료사용처방 API 결과 요청일 때
    if request.method == "POST" and request.POST.get("request_prescription"):
        # 공공데이터포털 인증키 (Encoding)
        serviceKey = 'fOnrt/nVSCnLI05XSbmySE3F11nxviUIhefxXDnVGGbJusKK04jb0OIAkpbgUuRyca9HwxTfHbi1GiN4UyL/DQ=='
        url = "http://apis.data.go.kr/1390802/SoilEnviron/FrtlzrUse/getSoilFrtlzrExamRiceInfo"
        params = {
            'serviceKey': serviceKey,
            'PNU_Code': request.POST.get("PNU_Code"),
            'crop_Code': request.POST.get("crop_Code", "00001"),  # 벼(논) 코드
            'rice_Qlt_Code': request.POST.get("rice_Qlt_Code", "1"),  # 고품질쌀(9kg)
            'animix_Ratio_Cattl': '28',
            'animix_Ratio_Pig': '22',
            'animix_Ratio_Chick': '19',
        }
        try:
            res = requests.get(url, params=params, timeout=8)
            if res.status_code == 200:
                from xml.etree import ElementTree as ET
                root = ET.fromstring(res.text)
                item = root.find('.//item')
                if item is not None:
                    data = {e.tag: e.text for e in item}
                    data['result'] = "success"
                    return JsonResponse(data)
        except Exception as e:
            print("비료사용처방 API 오류:", e)
        return JsonResponse({"result": "fail"})

    # 3. 기본(PNU코드 조회) 로직 (기존 그대로)
    result_pnu_list = []
    address = ""
    bonbun = ""
    bubun = ""
    mountain_sel = ""
    if request.method == "POST":
        sido = request.POST.get('sido', '').strip()
        sigungu = request.POST.get('sigungu', '').strip()
        eupmyeon = request.POST.get('eupmyeon', '').strip()
        ri = request.POST.get('ri', '').strip()
        bonbun = request.POST.get('bonbun', '').strip()
        bubun = request.POST.get('bubun', '').strip()
        mountain_sel = request.POST.get('mountain', '0').strip()  # 기본은 "0" (일반)

        address = f"{sido} {sigungu} {eupmyeon} {ri}".strip()
        if bonbun:
            jibun = bonbun
            if bubun:
                jibun += f"-{bubun}"
            address = f"{address} {jibun}".strip()

        result_pnu_list = get_pnu_list_from_api(address)

        # 지번(본번)이 있으면 address 완전일치 1건만 반환
        if bonbun:
            addr_nospace = address.replace(" ", "")
            result_pnu_list = [
                                  item for item in result_pnu_list
                                  if get_address_str(item.get('address')).replace(" ", "") == addr_nospace
                              ][:1]  # 첫번째 1건만

        # PNU 11번째 자리(필지구분) 치환 (일반이면 1, 산이면 2)
        for item in result_pnu_list:
            pnu = item.get('pnu', '')
            if pnu and len(pnu) >= 19:
                item['pnu'] = patch_pnu_mountain(pnu, mountain_sel)

    return render(request, 'fertilizer/prescription.html', {
        'result_pnu_list': result_pnu_list,
        'input_address': address,
        'mountain': mountain_sel if request.method == "POST" else "",
        'bonbun': bonbun if request.method == "POST" else "",
        'bubun': bubun if request.method == "POST" else "",
    })
def experience(request):
    return render(request, 'fertilizer/experience.html')

def standard(request):
    context = {
        'crop_categories': CROP_CATEGORIES,
        'crops': CROPS,
    }
    return render(request, 'fertilizer/standard.html', context)

@csrf_exempt  # Django에서는 POST 요청시 기본적으로 CSRF 검증을 함. 없으면 403 Forbidden 에러가 발생
def get_standard_api(request):
    """AJAX로 흙토람 API 호출"""
    if request.method == 'POST':
        try:
            crop_code = request.POST.get('crop_code', '')
            area = float(request.POST.get('area', 0))
            area_unit = request.POST.get('area_unit', 'sqm')
            area_unit_code = "1" if area_unit == "sqm" else "2"    # area_unit 변환 (JavaScript에서 오는 값)

            # 복합비료 계산 관련 파라미터 (선택적)
            prescription_method = request.POST.get('prescription_method', '')
            pre_n = float(request.POST.get('pre_n', 0)) if request.POST.get('pre_n') else 0
            pre_p = float(request.POST.get('pre_p', 0)) if request.POST.get('pre_p') else 0
            pre_k = float(request.POST.get('pre_k', 0)) if request.POST.get('pre_k') else 0
            pre_qy = float(request.POST.get('pre_qy', 20)) if request.POST.get('pre_qy') else 20
            post_n = float(request.POST.get('post_n', 0)) if request.POST.get('post_n') else 0
            post_p = float(request.POST.get('post_p', 0)) if request.POST.get('post_p') else 0
            post_k = float(request.POST.get('post_k', 0)) if request.POST.get('post_k') else 0
            post_qy = float(request.POST.get('post_qy', 20)) if request.POST.get('post_qy') else 20

            if not crop_code or area <= 0:
                return JsonResponse({
                    'success': False,
                    'error': '작물과 면적을 올바르게 입력해주세요.'
                })

            # API 호출
            result = get_standard_data(crop_code, area, area_unit_code,
                                       prescription_method, pre_n, pre_p, pre_k, pre_qy,
                                       post_n, post_p, post_k, post_qy)

            if result['success']:
                result['crop_name'] = CROPS.get(crop_code, '알 수 없는 작물')
                result['area'] = area
                result['area_unit'] = '㎡' if area_unit == 'sqm' else '평'

            return JsonResponse(result)

        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'처리 중 오류: {str(e)}'
            })

    return JsonResponse({'success': False, 'error': 'POST 요청만 허용됩니다.'})

def get_standard_data(crop_code, area, area_unit, prescription_method='1',
                     pre_n=0, pre_p=0, pre_k=0, pre_qy=20,
                     post_n=0, post_p=0, post_k=0, post_qy=20):
    try:
        # 면적 계산
        area1 = area if area_unit == "1" else area * 3.3058
        area2 = area / 3.3058 if area_unit == "1" else area

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': 'https://soil.rda.go.kr/sibi/cropSibiPrescript.do'
        }

        # 1. 기본 비료 데이터 조회
        base_url = "https://soil.rda.go.kr/exam/prescript/examPrescriptProc.do"
        base_params = {
            'nh_pre_fert_n': 0, 'nh_pre_fert_p': 0, 'nh_pre_fert_k': 0, 'nh_pre_fert_qy': 20,
            'nh_post_fert_n': 0, 'nh_post_fert_p': 0, 'nh_post_fert_k': 0, 'nh_post_fert_qy': 20,
            'type': 'S', 'flag': 'STAD_COMPUTE',
            'area1': area1, 'area2': area2, 'crop_cd': crop_code,
            '_': str(int(time.time() * 1000))
        }

        response = requests.get(base_url, params=base_params, headers=headers, timeout=10)
        if response.status_code != 200:
            return {'success': False, 'error': f'HTTP {response.status_code}'}

        data = json.loads(response.text)

        # 2. 복합비료 추천 조회
        fertilizer_url = "https://soil.rda.go.kr/sibi/sibiPrescriptDetailNh.do"
        fertilizer_params = {
            'type': 'list',
            'pre_n': data.get('pre_N_300', 0), 'pre_p': data.get('pre_P_300', 0), 'pre_k': data.get('pre_K_300', 0),
            'post_n': data.get('post_N_300', 0), 'post_p': data.get('post_P_300', 0),
            'post_k': data.get('post_K_300', 0),
            'crop_cd': crop_code, 'crop_gbn': crop_code[:2]
        }

        fertilizers = {"pre": [], "post": []}
        try:
            fert_response = requests.get(fertilizer_url, params=fertilizer_params, headers=headers, timeout=10)
            if fert_response.status_code == 200:
                fertilizers = standard_result(fert_response.text)
        except:
            pass  # 복합비료 정보 실패해도 기본 데이터는 반환

        # 3. 복합비료 계산 (항상 실행)
        compound_calculation = None
        compound_error = None

        compound_params = {
            'nh_pre_fert_n': pre_n, 'nh_pre_fert_p': pre_p, 'nh_pre_fert_k': pre_k, 'nh_pre_fert_qy': pre_qy,
            'nh_post_fert_n': post_n, 'nh_post_fert_p': post_p, 'nh_post_fert_k': post_k,
            'nh_post_fert_qy': post_qy,
            'type': 'S', 'flag': 'STAD_COMPUTE',
            'area1': area1, 'area2': area2, 'crop_cd': crop_code,
            'prscrptn_cnd': prescription_method,
            '_': str(int(time.time() * 1000))
        }

        try:
            compound_response = requests.get(base_url, params=compound_params, headers=headers, timeout=10)
            if compound_response.status_code == 200:
                compound_calculation = json.loads(compound_response.text)
        except Exception as e:
            compound_error = f'복합비료 계산 오류: {str(e)}'

        return {
            'success': True,
            'data': data,
            'fertilizers': fertilizers,
            'compound_calculation': compound_calculation,
            'compound_error': compound_error,
            'prescription_method': prescription_method,
            'fertilizer_params': {
                'pre_n': pre_n, 'pre_p': pre_p, 'pre_k': pre_k, 'pre_qy': pre_qy,
                'post_n': post_n, 'post_p': post_p, 'post_k': post_k, 'post_qy': post_qy
            },
            'area1': area1,
            'area2': area2
        }

    except Exception as e:
        return {'success': False, 'error': f'오류: {str(e)}'}


def standard_result(html_content):
    """HTML에서 복합비료 추천 정보 파싱"""
    fertilizers = {"pre": [], "post": []}

    try:
        # 밑거름 파싱
        pre_pattern = r'name="pre_nh"[^>]*onclick="SetNhPreNPK\(\'([^\']+)\'\)"[^>]*><label[^>]*>([^<]+)</label>'
        for match in re.findall(pre_pattern, html_content, re.DOTALL):
            npk_info = match[0].split('-')
            if len(npk_info) >= 3:
                # 비료명에서 NPK 부분을 제거하고 순수 비료명만 추출
                clean_name = match[1].strip()
                # 비료명 끝에 있는 NPK 패턴 제거 (예: "(21-7-10)" 제거)
                clean_name = re.sub(r'\(\d+-\d+-\d+\)$', '', clean_name).strip()

                fertilizers["pre"].append({
                    "name": clean_name,
                    "npk": f"({npk_info[0]}-{npk_info[1]}-{npk_info[2]})",
                    "full_info": match[0]  # 전체 N-P-K-QY 정보 추가
                })

        # 웃거름 파싱
        post_pattern = r'name="post_nh"[^>]*onclick="SetNhPostNPK\(\'([^\']+)\'\)"[^>]*><label[^>]*>([^<]+)</label>'
        for match in re.findall(post_pattern, html_content, re.DOTALL):
            npk_info = match[0].split('-')
            if len(npk_info) >= 3:
                # 비료명에서 NPK 부분을 제거하고 순수 비료명만 추출
                clean_name = match[1].strip()
                # 비료명 끝에 있는 NPK 패턴 제거 (예: "(30-0-1)" 제거)
                clean_name = re.sub(r'\(\d+-\d+-\d+\)$', '', clean_name).strip()

                fertilizers["post"].append({
                    "name": clean_name,
                    "npk": f"({npk_info[0]}-{npk_info[1]}-{npk_info[2]})",
                    "full_info": match[0]  # 전체 N-P-K-QY 정보 추가
                })
    except:
        pass

    return fertilizers

