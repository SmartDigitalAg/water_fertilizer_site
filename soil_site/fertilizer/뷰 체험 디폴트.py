import requests
import json
import time
import re
from bs4 import BeautifulSoup
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# 공통 헤더
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://soil.rda.go.kr/sibi/sibiPrescriptTemp.do'
}


def safe_float(value, default=0.0):
    """안전한 float 변환"""
    try:
        return float(value) if value and str(value).strip() else default
    except (ValueError, AttributeError):
        return default


def api_request(url, params=None, data=None, timeout=10):
    """흙토람 API 요청 함수"""
    try:
        if data:
            headers = {**HEADERS, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
            response = requests.post(url, data=data, headers=headers, timeout=timeout)
        else:
            response = requests.get(url, params=params, headers=HEADERS, timeout=timeout)
        return response if response.status_code == 200 else None
    except:
        return None


def parse_options(text):
    """흙토람 응답 파싱 함수 ($,$로 구분된 데이터)"""
    result = {}
    if not text:
        return result

    parts = text.split('$,$')
    for part in parts:
        if '$:$' in part:
            name, code = part.split('$:$', 1)
            if name.strip() and code.strip():
                result[code.strip()] = name.strip()
    return result


def get_crop_list(crop_type_code):
    """작물 목록 조회"""
    params = {
        "mode": "NOTCROPNOCODE",
        "code": crop_type_code,
        "_": int(time.time() * 1000)
    }
    response = api_request("https://soil.rda.go.kr/cmm/common/ajaxCall.do", params=params)
    if response:
        return parse_options(response.text)
    return {}


def search_crops_by_keyword(keyword):
    """작물명 키워드 검색"""
    if not keyword or len(keyword.strip()) < 1:
        return {}

    search_results = {}
    crop_types = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "14", "12"]

    crop_type_names = {
        "00": "곡류(벼)", "01": "곡류(기타)", "02": "유지류", "03": "서류",
        "04": "과채류", "05": "근채류", "06": "인경채류", "07": "경엽채류",
        "08": "산채류", "09": "과수", "10": "약용작물", "11": "화훼류",
        "14": "사료작물", "12": "기타"
    }

    for crop_type_code in crop_types:
        crops = get_crop_list(crop_type_code)
        for crop_code, crop_name in crops.items():
            if keyword.lower() in crop_name.lower():
                search_results[crop_code] = {
                    'name': crop_name,
                    'type_code': crop_type_code,
                    'type_name': crop_type_names.get(crop_type_code, '기타')
                }

    # 작물명 가나다순 정렬
    sorted_crops = dict(sorted(search_results.items(), key=lambda x: x[1]['name']))
    return sorted_crops


def get_fertilizer_recommendations(pre_n, pre_p, pre_k, post_n, post_p, post_k, crop_cd, param_crop_gbn):
    """복합비료 추천 순위 조회"""
    data = {
        'type': 'list',
        'pre_n': pre_n,
        'pre_p': pre_p,
        'pre_k': pre_k,
        'post_n': post_n,
        'post_p': post_p,
        'post_k': post_k,
        'crop_cd': crop_cd,
        'crop_gbn': param_crop_gbn
    }

    response = api_request("https://soil.rda.go.kr/sibi/sibiPrescriptDetailNh.do", data=data)
    if not response:
        return {"pre": [], "post": []}

    fertilizers = {"pre": [], "post": []}
    soup = BeautifulSoup(response.text, 'html.parser')

    # 안전한 float 변환을 위한 내부 함수
    def safe_float_inner(value, default=0.0):
        try:
            return float(value) if value and str(value).strip() else default
        except (ValueError, AttributeError):
            return default

    for fert_type, input_name, func_prefix, should_disable in [
        ("pre", "pre_nh", "SetNhPreNPK", sum([safe_float_inner(val) <= 0 for val in [pre_n, pre_p, pre_k]]) > 1),
        ("post", "post_nh", "SetNhPostNPK", sum([safe_float_inner(val) <= 0 for val in [post_n, post_p, post_k]]) > 1)
    ]:
        if should_disable:
            continue

        for i, input_tag in enumerate(soup.find_all('input', {'name': input_name}), 1):
            if input_tag.has_attr('disabled'):
                continue

            label_tag = soup.find('label', {'for': input_tag.get('id')})
            if not label_tag or not input_tag.get('onclick'):
                continue

            if match := re.search(rf"{func_prefix}\('([^']+)'\)", input_tag.get('onclick')):
                npk_info = match.group(1).split('-')
                if len(npk_info) >= 4:
                    try:
                        fertilizers[fert_type].append({
                            "rank": i,
                            "label_text": label_tag.get_text().strip(),
                            "npk_key": match.group(1),
                            "n": safe_float_inner(npk_info[0]),
                            "p": safe_float_inner(npk_info[1]),
                            "k": safe_float_inner(npk_info[2]),
                            "qy": safe_float_inner(npk_info[3], 20.0)
                        })
                    except (IndexError, ValueError):
                        continue

    return fertilizers


def calculate_prescription_api(params):
    """비료처방 계산 API 호출"""
    try:
        response = requests.get("https://soil.rda.go.kr/exam/prescript/examPrescriptProc.do",
                                params=params, headers=HEADERS, timeout=10)
        if response and response.status_code == 200:
            try:
                return response.json()
            except:
                return {"error": "JSON 파싱 실패"}
        return {"error": "API 호출 실패"}
    except Exception as e:
        return {"error": str(e)}


def calculate_lime_fertilizer(lime_code, lime_amount, area):
    """석회질비료 계산"""
    try:
        # 석회질비료별 계수 (실제 흙토람 계산 방식)
        lime_coefficients = {
            "00001": 1.0,  # 생석회
            "00002": 1.32,  # 소석회
            "00003": 1.79,  # 탄산석회
            "00004": 2.29,  # 석회고토
            "00005": 1.32,  # 부산소석회
            "00006": 1.79,  # 부산석회
            "00007": 1.79  # 패화석
        }

        coefficient = lime_coefficients.get(lime_code, 1.0)
        lime_recommendation = float(lime_amount) * coefficient * float(area) / 1000

        return {"lime_recommendation": f"{lime_recommendation:.1f}"}
    except Exception as e:
        return {"error": str(e)}


def calculate_compost_fertilizer(cow_ratio, pig_ratio, fowl_ratio, sawdust_ratio, area, organic_matter):
    """퇴비 추천량 계산"""
    try:
        # 기본 퇴비 추천량 계산 (간단한 공식 - 실제는 더 복잡함)
        base_compost = 2000  # kg/ha 기준
        area_ha = float(area) / 10000  # m²를 ha로 변환

        # 유기물 함량에 따른 조정
        om_val = float(organic_matter)
        if om_val > 30:
            adjustment = 0.5  # 유기물이 높으면 퇴비 감량
        elif om_val < 20:
            adjustment = 1.2  # 유기물이 낮으면 퇴비 증량
        else:
            adjustment = 1.0

        compost_recommendation = base_compost * area_ha * adjustment

        return {"compost_recommendation": f"{compost_recommendation:.1f}"}
    except Exception as e:
        return {"error": str(e)}


def prescription(request):
    """비료사용처방 메인 페이지"""
    return render(request, 'fertilizer/prescription.html')


def experience(request):
    """비료사용처방 체험하기 페이지"""
    return render(request, 'fertilizer/experience.html')


def standard(request):
    """비료 표준사용량 처방 페이지"""
    return render(request, 'fertilizer/standard.html')


@csrf_exempt
def experience_api(request):
    """비료사용처방 체험하기 API 엔드포인트"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST 요청만 허용됩니다.'})

    action = request.POST.get('action')

    try:
        # 1. 작물 목록 조회
        if action == 'get_crops':
            crop_type = request.POST.get('crop_type', '').strip()
            if not crop_type:
                return JsonResponse({'success': False, 'error': '작물 유형이 필요합니다.'})

            result = get_crop_list(crop_type)
            return JsonResponse({'success': True, 'data': result})

        # 2. 작물명 키워드 검색
        elif action == 'search_crops':
            keyword = request.POST.get('keyword', '').strip()
            if not keyword:
                return JsonResponse({'success': False, 'error': '검색 키워드가 필요합니다.'})

            result = search_crops_by_keyword(keyword)
            return JsonResponse({'success': True, 'data': result})

        # 3. 비료처방 계산
        elif action == 'calculate_prescription':
            # 필수 파라미터 검증
            required_params = ['exam_type', 'crop_cd', 'param_crop_gbn', 'acid', 'om', 'vldpha',
                               'posifert_k', 'posifert_ca', 'posifert_mg', 'area1', 'area2']

            params = {}
            for param in required_params:
                value = request.POST.get(param, '').strip()
                if not value:
                    return JsonResponse({'success': False, 'error': f'{param} 파라미터가 누락되었습니다.'})
                params[param] = value

            # 선택적 파라미터들
            optional_params = [
                'rice_fert', 'vldsia', 'selc', 'limeamo', 'cec', 'nit', 'ammo'
            ]

            for param in optional_params:
                params[param] = request.POST.get(param, '').strip()

            # 기본 파라미터 추가
            params.update({
                'nh_pre_fert_n': '0',
                'nh_pre_fert_p': '0',
                'nh_pre_fert_k': '0',
                'nh_pre_fert_qy': '20',
                'nh_post_fert_n': '0',
                'nh_post_fert_p': '0',
                'nh_post_fert_k': '0',
                'nh_post_fert_qy': '20',
                'cow_drop_qy': '25',
                'pig_drop_qy': '14',
                'fowl_drop_qy': '26',
                'sawdust_drop_qy': '21',
                'checkProgram': 'main',
                'type': 'S',
                'flag': 'COMPUTE',
                '_': str(int(time.time() * 1000))
            })

            result = calculate_prescription_api(params)
            if 'error' not in result:
                return JsonResponse({'success': True, 'data': result})
            else:
                return JsonResponse({'success': False, 'error': result['error']})

        # 4. 복합비료 추천 순위 조회
        elif action == 'get_fertilizer_recommendations':
            pre_n = request.POST.get('pre_n', '0').strip()
            pre_p = request.POST.get('pre_p', '0').strip()
            pre_k = request.POST.get('pre_k', '0').strip()
            post_n = request.POST.get('post_n', '0').strip()
            post_p = request.POST.get('post_p', '0').strip()
            post_k = request.POST.get('post_k', '0').strip()
            crop_cd = request.POST.get('crop_cd', '').strip()
            param_crop_gbn = request.POST.get('crop_gbn', '').strip()

            if not crop_cd or not param_crop_gbn:
                return JsonResponse({'success': False, 'error': '작물 정보가 필요합니다.'})

            result = get_fertilizer_recommendations(pre_n, pre_p, pre_k, post_n, post_p, post_k, crop_cd,
                                                    param_crop_gbn)
            return JsonResponse({'success': True, 'data': result})

        # 5. 복합비료 계산
        elif action == 'calculate_fertilizer':
            # 필요한 모든 파라미터 수집
            required_params = ['exam_type', 'crop_cd', 'param_crop_gbn']
            params = {}

            for param in required_params:
                value = request.POST.get(param, '').strip()
                if not value:
                    return JsonResponse({'success': False, 'error': f'{param} 파라미터가 누락되었습니다.'})
                params[param] = value

            # 추가 파라미터들
            optional_params = [
                'nh_pre_fert_n', 'nh_pre_fert_p', 'nh_pre_fert_k', 'nh_pre_fert_qy',
                'nh_post_fert_n', 'nh_post_fert_p', 'nh_post_fert_k', 'nh_post_fert_qy',
                'cow_drop_qy', 'pig_drop_qy', 'fowl_drop_qy', 'sawdust_drop_qy',
                'acid', 'om', 'vldpha', 'posifert_k', 'posifert_ca', 'posifert_mg',
                'vldsia', 'selc', 'limeamo', 'cec', 'nit', 'ammo', 'area1', 'area2',
                'rice_fert', 'prscrptn_cnd'
            ]

            for param in optional_params:
                default_value = '20' if 'qy' in param else ('1' if param == 'prscrptn_cnd' else '0')
                params[param] = request.POST.get(param, default_value).strip()

            params.update({
                'checkProgram': 'main',
                'type': 'S',
                'flag': 'COMPUTE',
                '_': str(int(time.time() * 1000))
            })

            result = calculate_prescription_api(params)
            if 'error' not in result:
                return JsonResponse({'success': True, 'data': result})
            else:
                return JsonResponse({'success': False, 'error': result['error']})

        # 6. 석회질비료 계산
        elif action == 'calculate_lime_fertilizer':
            lime_code = request.POST.get('lime_code', '').strip()
            lime_amount = request.POST.get('lime_amount', '0').strip()
            area = request.POST.get('area', '0').strip()

            if not lime_code:
                return JsonResponse({'success': False, 'error': '석회질비료 코드가 필요합니다.'})

            result = calculate_lime_fertilizer(lime_code, lime_amount, area)
            if 'error' not in result:
                return JsonResponse({'success': True, 'data': result})
            else:
                return JsonResponse({'success': False, 'error': result['error']})

        # 7. 퇴비 계산
        elif action == 'calculate_compost':
            cow_ratio = request.POST.get('cow_ratio', '25').strip()
            pig_ratio = request.POST.get('pig_ratio', '14').strip()
            fowl_ratio = request.POST.get('fowl_ratio', '26').strip()
            sawdust_ratio = request.POST.get('sawdust_ratio', '21').strip()
            area = request.POST.get('area', '0').strip()
            organic_matter = request.POST.get('organic_matter', '0').strip()

            if not area or not organic_matter:
                return JsonResponse({'success': False, 'error': '면적과 유기물 함량이 필요합니다.'})

            result = calculate_compost_fertilizer(cow_ratio, pig_ratio, fowl_ratio, sawdust_ratio, area, organic_matter)
            if 'error' not in result:
                return JsonResponse({'success': True, 'data': result})
            else:
                return JsonResponse({'success': False, 'error': result['error']})

        else:
            return JsonResponse({'success': False, 'error': f'지원하지 않는 액션: {action}'})

    except Exception as e:
        return JsonResponse({'success': False, 'error': f'처리 중 오류: {str(e)}'})


@csrf_exempt
def prescription_api(request):
    """비료사용처방 API 엔드포인트 - 기존 기능 유지"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST 요청만 허용됩니다.'})

    action = request.POST.get('action')

    try:
        # 지역 정보 조회
        if action == 'get_region':
            code = request.POST.get('code', '').strip()
            if not code:
                return JsonResponse({'success': False, 'error': '지역 코드가 필요합니다.'})

            result = get_region_list(code)
            return JsonResponse({'success': True, 'data': result})

        # 작물 목록 조회
        elif action == 'get_crops':
            crop_type = request.POST.get('crop_type', '').strip()
            if not crop_type:
                return JsonResponse({'success': False, 'error': '작물 유형이 필요합니다.'})

            result = get_crop_list(crop_type)
            return JsonResponse({'success': True, 'data': result})

        # 작물명 키워드 검색
        elif action == 'search_crops':
            keyword = request.POST.get('keyword', '').strip()
            if not keyword:
                return JsonResponse({'success': False, 'error': '검색 키워드가 필요합니다.'})

            result = search_crops_by_keyword(keyword)
            return JsonResponse({'success': True, 'data': result})

        # 지번 목록 조회
        elif action == 'get_jibn':
            sgg_cd = request.POST.get('sgg_cd', '').strip()
            umd_cd = request.POST.get('umd_cd', '').strip()
            if not sgg_cd or not umd_cd:
                return JsonResponse({'success': False, 'error': '지역 코드가 필요합니다.'})

            result = get_jibn_list(sgg_cd, umd_cd)
            return JsonResponse({'success': True, 'data': result})

        # 검정일자 목록 조회
        elif action == 'get_exam_dates':
            sgg_cd = request.POST.get('sgg_cd', '').strip()
            umd_cd = request.POST.get('umd_cd', '').strip()
            jibn = request.POST.get('jibn', '').strip()
            exam_type = request.POST.get('exam_type', '').strip()

            if not all([sgg_cd, umd_cd, jibn]):
                return JsonResponse({'success': False, 'error': '필수 파라미터가 누락되었습니다.'})

            result = get_exam_dates(sgg_cd, umd_cd, jibn, exam_type)
            return JsonResponse({'success': True, 'data': result})

        # 비료처방 데이터 조회
        elif action == 'get_fertilizer_prescription':
            exam_data_str = request.POST.get('exam_data', '').strip()
            crop_code = request.POST.get('crop_code', '').strip()
            rice_fert = request.POST.get('rice_fert', '').strip()
            organic_at = request.POST.get('organic_at', 'N').strip()

            if not exam_data_str or not crop_code:
                return JsonResponse({'success': False, 'error': '필수 파라미터가 누락되었습니다.'})

            try:
                exam_data = json.loads(exam_data_str)
                result = get_fertilizer_prescription_data(exam_data, crop_code, rice_fert, organic_at)

                if result:
                    return JsonResponse({'success': True, 'data': result})
                else:
                    return JsonResponse({'success': False, 'error': '비료처방 데이터 조회 실패'})
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'error': '검정일자 데이터 형식 오류'})

        # 복합비료 추천 순위 조회
        elif action == 'get_fertilizer_recommendations':
            pre_n = request.POST.get('pre_n', '0').strip()
            pre_p = request.POST.get('pre_p', '0').strip()
            pre_k = request.POST.get('pre_k', '0').strip()
            post_n = request.POST.get('post_n', '0').strip()
            post_p = request.POST.get('post_p', '0').strip()
            post_k = request.POST.get('post_k', '0').strip()
            crop_cd = request.POST.get('crop_code', '').strip()
            param_crop_gbn = request.POST.get('crop_gbn', '').strip()

            if not crop_cd or not param_crop_gbn:
                return JsonResponse({'success': False, 'error': '작물 정보가 필요합니다.'})

            result = get_fertilizer_recommendations(pre_n, pre_p, pre_k, post_n, post_p, post_k, crop_cd,
                                                    param_crop_gbn)
            return JsonResponse({'success': True, 'data': result})

        # 화학성 평균 조회
        elif action == 'get_chemical_data':
            sido_cd = request.POST.get('sido_cd', '').strip()
            sgg_cd = request.POST.get('sgg_cd', '').strip()
            umd_cd = request.POST.get('umd_cd', '').strip()
            ri_cd = request.POST.get('ri_cd', '00').strip()

            if not all([sido_cd, sgg_cd, umd_cd]):
                return JsonResponse({'success': False, 'error': '필수 파라미터가 누락되었습니다.'})

            result = get_chemical_data(sido_cd, sgg_cd, umd_cd, ri_cd)
            if result:
                return JsonResponse({'success': True, 'data': result})
            else:
                return JsonResponse({'success': False, 'error': '화학성 데이터 조회 실패'})

        # 복합비료 계산
        elif action == 'calculate_fertilizer':
            required_params = ['exam_type', 'crop_cd', 'param_crop_gbn']
            params = {}

            for param in required_params:
                value = request.POST.get(param, '').strip()
                if not value:
                    return JsonResponse({'success': False, 'error': f'{param} 파라미터가 누락되었습니다.'})
                params[param] = value

            optional_params = [
                'nh_pre_fert_n', 'nh_pre_fert_p', 'nh_pre_fert_k', 'nh_pre_fert_qy',
                'nh_post_fert_n', 'nh_post_fert_p', 'nh_post_fert_k', 'nh_post_fert_qy',
                'cow_drop_qy', 'pig_drop_qy', 'fowl_drop_qy', 'sawdust_drop_qy',
                'acid', 'om', 'vldpha', 'posifert_k', 'posifert_ca', 'posifert_mg',
                'vldsia', 'selc', 'limeamo', 'cec', 'nit', 'ammo', 'area1', 'area2',
                'rice_fert', 'prscrptn_cnd'
            ]

            for param in optional_params:
                default_value = '20' if 'qy' in param else ('1' if param == 'prscrptn_cnd' else '0')
                params[param] = request.POST.get(param, default_value).strip()

            params.update({
                'checkProgram': 'main',
                'type': 'S',
                'flag': 'COMPUTE',
                '_': str(int(time.time() * 1000))
            })

            result = calculate_prescription_api(params)
            if 'error' not in result:
                return JsonResponse({'success': True, 'data': result})
            else:
                return JsonResponse({'success': False, 'error': result['error']})

        else:
            return JsonResponse({'success': False, 'error': f'지원하지 않는 액션: {action}'})

    except Exception as e:
        return JsonResponse({'success': False, 'error': f'처리 중 오류: {str(e)}'})


def get_region_list(code):
    """지역 목록 조회 (기존 prescription 기능에서 가져옴)"""
    params = {
        "mode": "ADDR",
        "code": code,
        "full_yn": "Y",
        "_": int(time.time() * 1000)
    }
    response = api_request("https://soil.rda.go.kr/cmm/common/ajaxCall.do", params=params)
    if response:
        return parse_options(response.text)
    return {}


def get_jibn_list(sgg_cd, umd_cd):
    """지번 목록 조회 (기존 prescription 기능에서 가져옴)"""
    params = {
        "mode": "JIBN",
        "sgg_cd": sgg_cd,
        "umd_cd": umd_cd,
        "exam_type": "",
        "exam_day_str": "20200101",
        "exam_day_end": "20250825",
        "_": int(time.time() * 1000)
    }
    html_response = api_request("https://soil.rda.go.kr/sibi/sibiPrescriptProc.do", params=params)
    if not html_response:
        return {}

    soup = BeautifulSoup(html_response.text, 'html.parser')
    result = {}
    for option in soup.find_all('option'):
        value = option.get('value', '').strip()
        text = option.get_text(strip=True)
        if value and text:
            result[value] = text
    return result


def get_exam_dates(sgg_cd, umd_cd, jibn, exam_type):
    """검정일자 목록 조회 (기존 prescription 기능에서 가져옴)"""
    params = {
        "sgg_cd": sgg_cd,
        "umd_cd": umd_cd,
        "jibn": jibn,
        "exam_type": exam_type,
        "exam_day_str": "20200101",
        "exam_day_end": "20250825",
        "flag": "2",
        "_": int(time.time() * 1000)
    }
    html_response = api_request("https://soil.rda.go.kr/sibi/sibiPrescriptDetail.do", params=params)
    if not html_response:
        return {}

    soup = BeautifulSoup(html_response.text, 'html.parser')
    select_elem = soup.find('select', {'name': 'exam_day_search'})
    if not select_elem:
        return {}

    result = {}
    for option in select_elem.find_all('option'):
        value = option.get('value', '').strip()
        text = option.get_text(strip=True)
        if value and text:
            result[value] = text
    return result


def get_fertilizer_prescription_data(exam_data, crop_cd, rice_fert='', organic_at='N'):
    """비료처방 데이터 조회 (기존 prescription 기능에서 가져옴)"""
    try:
        params = {
            'exam_type': exam_data.get('exam_type', ''),
            'nh_pre_fert_n': '0',
            'nh_pre_fert_p': '0',
            'nh_pre_fert_k': '0',
            'nh_pre_fert_qy': '20',
            'nh_post_fert_n': '0',
            'nh_post_fert_p': '0',
            'nh_post_fert_k': '0',
            'nh_post_fert_qy': '20',
            'cow_drop_qy': '25',
            'pig_drop_qy': '14',
            'fowl_drop_qy': '26',
            'sawdust_drop_qy': '21',
            'checkProgram': 'main',
            'type': 'S',
            'flag': 'COMPUTE',
            'crop_cd': crop_cd,
            'rice_fert': rice_fert,
            'param_crop_gbn': crop_cd[:2] if crop_cd else '',
            'prscrptn_cnd': '2' if organic_at == 'Y' else '1',
            '_': str(int(time.time() * 1000))
        }

        # exam_data의 모든 키를 params에 추가
        for key in ['acid', 'om', 'vldpha', 'posifert_k', 'posifert_ca', 'posifert_mg',
                    'vldsia', 'selc', 'limeamo', 'cec', 'nit', 'ammo', 'area1', 'area2']:
            if key in exam_data:
                params[key] = exam_data[key]

        response = requests.get("https://soil.rda.go.kr/exam/prescript/examPrescriptProc.do",
                                params=params, headers=HEADERS, timeout=10)

        if response.status_code == 200:
            return json.loads(response.text)
        return None
    except Exception as e:
        print(f"비료처방 데이터 조회 오류: {str(e)}")
        return None


def get_chemical_data(sido_cd, sgg_cd, umd_cd, ri_cd):
    """화학성 평균 데이터 조회 (기존 prescription 기능에서 가져옴)"""
    data = {"sgg_cd": f"{sido_cd}{sgg_cd}", "umd_cd": f"{umd_cd}{ri_cd}", "exam_type": "", "gubun": "P"}
    html_response = api_request("https://soil.rda.go.kr/sibi/sibiAvgChemical.do", data=data)
    if not html_response:
        return None

    soup = BeautifulSoup(html_response.text, 'html.parser')
    table = soup.find('table')
    if not table:
        return None

    for row in table.find_all('tr'):
        cells = row.find_all('td')
        if len(cells) >= 7:
            try:
                data = {}
                fields = ['pH', '유기물', '유효인산', '칼륨', '칼슘', '마그네슘', '전기전도도']
                for i, field in enumerate(fields):
                    data[field] = float(cells[i].get_text().strip())

                if len(cells) >= 8:
                    data['유효규산'] = float(cells[7].get_text().strip())
                return data
            except (ValueError, IndexError):
                continue
    return None


@csrf_exempt
def get_standard_api(request):
    """비료 표준사용량 처방 API - 최소 응답"""
    return JsonResponse({'success': False, 'error': '기능이 비활성화되었습니다.'})