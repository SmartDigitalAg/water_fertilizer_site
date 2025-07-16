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
    # 1. AJAX: 비료사용처방 API 결과 요청일 때
    if request.method == "POST" and request.POST.get("request_prescription"):
        # 공공데이터포털 인증키 (Encoding)
        serviceKey = 'fOnrt%2FnVSCnLI05XSbmySE3F11nxviUIhefxXDnVGGbJusKK04jb0OIAkpbgUuRyca9HwxTfHbi1GiN4UyL%2FDQ%3D%3D'
        url = "http://apis.data.go.kr/1390802/SoilEnviron/FrtlzrUse/getSoilFrtlzrExamRiceInfo"
        params = {
            'serviceKey': serviceKey,
            'PNU_Code': request.POST.get("PNU_Code"),
            'crop_Code': request.POST.get("crop_Code", "00001"),        # 벼(논) 코드
            'rice_Qlt_Code': request.POST.get("rice_Qlt_Code", "1"),    # 고품질쌀(9kg)
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

    # 2. 기본(PNU코드 조회) 로직 (기존 그대로)
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
