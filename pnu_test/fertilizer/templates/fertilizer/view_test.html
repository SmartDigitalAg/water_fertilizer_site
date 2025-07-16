import requests
from django.shortcuts import render
from django.http import JsonResponse


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
    return render(request, 'fertilizer/standard.html')