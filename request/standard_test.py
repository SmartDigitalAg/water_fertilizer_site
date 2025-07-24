# 직접입력 추가
import streamlit as st
import requests
import json

# 페이지 설정
st.set_page_config(
    page_title="흙토람 작물별 비료 표준사용량 처방",
    page_icon="🌱",
    layout="wide"
)

# 작물 유형 목록
CROP_CATEGORIES = {
    "": "작물유형 선택",
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

# 전체 작물 목록 (카테고리별)
ALL_CROPS = {
    "00": {  # 곡류(벼)
        "00001": "벼"
    },
    "01": {  # 곡류(기타)
        "01031": "강낭콩",
        "01023": "귀리",
        "01015": "기장",
        "01028": "녹두",
        "01024": "동부콩",
        "01005": "맥주보리(도복강)",
        "01006": "맥주보리(도복중~약)",
        "01017": "메밀",
        "01007": "밀(도복강)",
        "01008": "밀(도복중~약)",
        "01009": "밀(제과용-고소밀)",
        "01010": "밀(제과용-조아밀)",
        "01011": "밀(제면용-수안밀)",
        "01012": "밀(제빵용-금강밀)",
        "01013": "밀(제빵용-조경밀)",
        "01002": "보리(도복강-남부)",
        "01001": "보리(도복강-중북부)",
        "01004": "보리(도복중~약-남부)",
        "01003": "보리(도복중~약-중북부)",
        "01026": "서리태콩",
        "01016": "수수",
        "01030": "아마란스",
        "01022": "옥수수(단옥수수)",
        "01021": "옥수수(보통옥수수)",
        "01025": "완두콩",
        "01032": "작두콩",
        "01014": "조",
        "01027": "쥐눈이콩",
        "01019": "콩(개간지)",
        "01018": "콩(기경지)",
        "01029": "콩(잎수확용)",
        "01020": "팥"
    },
    "02": {  # 유지류
        "02004": "들깨(종실용)",
        "02006": "땅콩(개간지)",
        "02005": "땅콩(기경지)",
        "02007": "유채",
        "02008": "유채(1대잡종)",
        "02010": "유채(사료용)",
        "02009": "유채(화산회토)",
        "02003": "참깨(2모작지)",
        "02002": "참깨(개간지)",
        "02001": "참깨(기경지)"
    },
    "03": {  # 서류
        "03002": "감자(남부해안)",
        "03001": "감자(준고냉지및고냉지)",
        "03004": "고구마(개간지)",
        "03003": "고구마(기경지)",
        "03005": "아피오스(인디언감자,콩감자)"
    },
    "04": {  # 과채류
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
    },
    "05": {  # 근채류
        "05018": "고추냉이(근경)",
        "05003": "당근(준고랭지및고랭지)",
        "05002": "당근(평난지)",
        "05004": "당근(화산,비화산회토)",
        "05005": "무(노지재배)",
        "05006": "무(시설재배)",
        "05007": "무(준고랭지및고랭지)",
        "05009": "비트(시설재배)",
        "05011": "비트(화산,비화산-가을)",
        "05010": "비트(화산,비화산-봄)",
        "05001": "생강",
        "05019": "순무",
        "05021": "알타리무",
        "05015": "야콘",
        "05020": "얌빈",
        "05013": "연근",
        "05008": "열무(시설재배)",
        "05014": "우엉",
        "05016": "콜라비",
        "05017": "콜라비(화산,비화산)",
        "05012": "토란"
    },
    "06": {  # 인경채류
        "06003": "마늘(노지재배)",
        "06002": "양파(준고랭지및고랭지)",
        "06001": "양파(평난지)"
    },
    "07": {  # 경엽채소류
        "07036": "갓(시설재배)",
        "07039": "갯방풍(해방풍)",
        "07047": "고구마순",
        "07048": "근대",
        "07012": "대파(노지재배)",
        "07013": "대파(시설재배)",
        "07042": "방울양배추",
        "07044": "방울양배추(비화산회토)",
        "07043": "방울양배추(화산회토)",
        "07031": "밭미나리(시설재배)",
        "07005": "배추(노지재배)",
        "07006": "배추(시설재배)",
        "07007": "배추(준고랭지및고랭지)",
        "07021": "부추(노지재배)",
        "07022": "부추(시설재배)",
        "07027": "브로콜리(시설재배)",
        "07029": "삼엽채(시설재배)",
        "07001": "상추(노지재배)",
        "07002": "상추(시설재배)",
        "07035": "서양냉이(시설재배)",
        "07023": "셀러리(노지재배)",
        "07024": "셀러리(시설재배)",
        "07034": "스위트펜넬(시설재배)",
        "07008": "시금치(노지재배)",
        "07009": "시금치(시설재배)",
        "07030": "신선초(시설재배)",
        "07010": "쑥갓(노지재배)",
        "07011": "쑥갓(시설재배)",
        "07049": "아스파라거스(1년-정식)",
        "07050": "아스파라거스(2년)",
        "07051": "아스파라거스(3년)",
        "07052": "아스파라거스(4년이상)",
        "07038": "아욱(시설재배)",
        "07018": "양배추(노지재배)",
        "07019": "양배추(시설재배)",
        "07045": "양배추(적채,노지)",
        "07046": "양배추(적채,시설)",
        "07020": "양배추(준고랭지및고랭지)",
        "07004": "양상추(고랭지)",
        "07003": "양상추(평야지)",
        "07040": "얼갈이배추(노지)",
        "07041": "얼갈이배추(시설)",
        "07032": "엔다이브(시설재배)",
        "07033": "오너멘탈케일(시설재배)",
        "07016": "잎들깨(노지재배)",
        "07017": "잎들깨(시설재배)",
        "07014": "쪽파(노지재배)",
        "07015": "쪽파(시설재배)",
        "07037": "청경채(시설재배)",
        "07025": "치커리(노지,시설)",
        "07026": "케일(시설재배)",
        "07028": "콜리플라워(시설재배)"
    },
    "08": {  # 산채류
        "08024": "갯기름나물(식방풍-뿌리)",
        "08028": "고들빼기",
        "08016": "고려엉겅퀴(곤드레나물)",
        "08011": "고사리(2년이하)",
        "08012": "고사리(3년이상)",
        "08005": "곤달비(시설재배)",
        "08003": "곰취(시설재배)",
        "08026": "냉이",
        "08006": "누룩치(시설재배)",
        "08013": "눈개승마(삼나물)",
        "08025": "달래",
        "08022": "돌나물",
        "08019": "두메부추(노지)",
        "08020": "두메부추(시설)",
        "08004": "머위(시설재배)",
        "08008": "모시대(시설재배)",
        "08002": "미역취(시설재배)",
        "08015": "민들레(육묘이식)",
        "08014": "민들레(직파)",
        "08021": "병풍취(병풍쌈)",
        "08023": "비름나물",
        "08010": "산마늘(시설재배)",
        "08017": "섬쑥부쟁이",
        "08029": "수리취(1년)",
        "08030": "수리취(2년)",
        "08027": "씀바귀",
        "08018": "어수리",
        "08009": "영아자(시설재배)",
        "08007": "참나물(시설재배)",
        "08001": "참취(시설재배)"
    },
    "09": {  # 과수
        "09047": "감(11년이상)",
        "09042": "감(1~2년)",
        "09043": "감(3~4년)",
        "09044": "감(5~6년)",
        "09045": "감(7~8년)",
        "09046": "감(9~10년)",
        "09120": "감(대봉)",
        "09064": "감귤(비화산회토(만감),11~19년)",
        "09062": "감귤(비화산회토(만감),1~5년)",
        "09065": "감귤(비화산회토(만감),20년이상)",
        "09063": "감귤(비화산회토(만감),6~10년)",
        "09060": "감귤(비화산회토(온주),13~17년)",
        "09061": "감귤(비화산회토(온주),18년이상)",
        "09057": "감귤(비화산회토(온주),1~2년)",
        "09058": "감귤(비화산회토(온주),3~7년)",
        "09059": "감귤(비화산회토(온주),8~12년)",
        "09055": "감귤(화산회토(만감),11~19년)",
        "09053": "감귤(화산회토(만감),1~5년)",
        "09056": "감귤(화산회토(만감),20년이상)",
        "09054": "감귤(화산회토(만감),6~10년)",
        "09051": "감귤(화산회토(온주),13~17년)",
        "09052": "감귤(화산회토(온주),18년이상)",
        "09048": "감귤(화산회토(온주),1~2년)",
        "09049": "감귤(화산회토(온주),3~7년)",
        "09050": "감귤(화산회토(온주),8~12년)",
        "09118": "꾸지뽕나무",
        "09121": "나무딸기(산딸기)",
        "09117": "다래(토종다래)",
        "09074": "대추(1년)",
        "09075": "대추(2년)",
        "09076": "대추(3년)",
        "09077": "대추(4년)",
        "09078": "대추(5년)",
        "09079": "대추(6년이상)",
        "09115": "돌배",
        "09037": "매실(1~2년)",
        "09038": "매실(3~4년)",
        "09039": "매실(5~6년)",
        "09040": "매실(7~8년)",
        "09041": "매실(9년이상)",
        "09103": "무화과(10년이상)",
        "09099": "무화과(1~2년)",
        "09100": "무화과(3~4년)",
        "09101": "무화과(5~6년)",
        "09102": "무화과(7~9년)",
        "09086": "밤(10~14년)",
        "09087": "밤(15~19년)",
        "09080": "밤(1년)",
        "09088": "밤(20년이상)",
        "09081": "밤(2년)",
        "09082": "밤(3년)",
        "09083": "밤(4년)",
        "09084": "밤(5~6년)",
        "09085": "밤(7~9년)",
        "09013": "배(비옥지-10~14년)",
        "09014": "배(비옥지-15~19년)",
        "09011": "배(비옥지-1~4년)",
        "09015": "배(비옥지-20년이상)",
        "09012": "배(비옥지-5~9년)",
        "09018": "배(척박지-10~14년)",
        "09019": "배(척박지-15~19년)",
        "09016": "배(척박지-1~4년)",
        "09020": "배(척박지-20년이상)",
        "09017": "배(척박지-5~9년)",
        "09032": "복숭아(비옥지-11년이상)",
        "09029": "복숭아(비옥지-1~2년)",
        "09030": "복숭아(비옥지-3~4년)",
        "09031": "복숭아(비옥지-5~10년)",
        "09036": "복숭아(척박지-11년이상)",
        "09033": "복숭아(척박지-1~2년)",
        "09034": "복숭아(척박지-3~4년)",
        "09035": "복숭아(척박지-5~10년)",
        "09122": "블랙베리",
        "09130": "블랙커런트(1~2년)",
        "09131": "블랙커런트(3년이상)",
        "09109": "블루베리(1~2년)",
        "09110": "블루베리(3~4년)",
        "09111": "블루베리(5~6년)",
        "09112": "블루베리(7년)",
        "09113": "블루베리(8년이상)",
        "09119": "뽕나무(오디)",
        "09003": "사과(비옥지-10~14년)",
        "09004": "사과(비옥지-15~19년)",
        "09001": "사과(비옥지-1~4년)",
        "09005": "사과(비옥지-20년이상)",
        "09002": "사과(비옥지-5~9년)",
        "09008": "사과(척박지-10~14년)",
        "09009": "사과(척박지-15~19년)",
        "09006": "사과(척박지-1~4년)",
        "09010": "사과(척박지-20년이상)",
        "09007": "사과(척박지-5~9년)",
        "09108": "살구(11년이상)",
        "09104": "살구(1~2년)",
        "09105": "살구(3~4년)",
        "09106": "살구(5~7년)",
        "09107": "살구(8~10년)",
        "09116": "서양자두(푸룬)",
        "09124": "수리취(1년)",
        "09125": "수리취(2년)",
        "09126": "아로니아(1~2년)",
        "09127": "아로니아(3년이상)",
        "09132": "앵두",
        "09072": "유자(비화산회토,11~19년)",
        "09070": "유자(비화산회토,1~5년)",
        "09073": "유자(비화산회토,20년이상)",
        "09071": "유자(비화산회토,6~10년)",
        "09068": "유자(화산회토,11~19년)",
        "09066": "유자(화산회토,1~5년)",
        "09069": "유자(화산회토,20년이상)",
        "09067": "유자(화산회토,6~10년)",
        "09094": "자두(1~2년)",
        "09095": "자두(3~4년)",
        "09096": "자두(5~6년)",
        "09097": "자두(7~8년)",
        "09098": "자두(9년이상)",
        "09089": "참다래(1년)",
        "09090": "참다래(2~3년)",
        "09091": "참다래(4~5년)",
        "09092": "참다래(6~7년)",
        "09093": "참다래(성목)",
        "09024": "포도(비옥지-11년이상)",
        "09021": "포도(비옥지-1~2년)",
        "09022": "포도(비옥지-3~4년)",
        "09023": "포도(비옥지-5~10년)",
        "09114": "포도(샤인머스캣)",
        "09028": "포도(척박지-11년이상)",
        "09025": "포도(척박지-1~2년)",
        "09026": "포도(척박지-3~4년)",
        "09027": "포도(척박지-5~10년)",
        "09123": "플럼코트",
        "09128": "허니베리(1~2년)",
        "09129": "허니베리(3년이상)"
    },
    "10": {  # 약용작물
        "10042": "감초",
        "10044": "강황",
        "10035": "결명자",
        "10016": "구기자",
        "10005": "구약감자",
        "10003": "길경",
        "10046": "단삼",
        "10018": "당귀",
        "10029": "더덕",
        "10034": "더위지기(인진쑥)",
        "10048": "땅두릅(독활)",
        "10009": "마",
        "10024": "맥문동",
        "10040": "모링가",
        "10023": "박하",
        "10004": "반하",
        "10041": "배암차즈기(곰보배추)",
        "10019": "백지",
        "10007": "복분자(1년)",
        "10008": "복분자(2년이상)",
        "10030": "산수유(성목)",
        "10031": "삼백초",
        "10045": "삽주",
        "10021": "스테비아",
        "10036": "식방풍(뿌리수확용-약재)",
        "10037": "식방풍(잎수확용-나물)",
        "10032": "어성초",
        "10033": "엉겅퀴",
        "10043": "오갈피",
        "10010": "오미자(1년)",
        "10011": "오미자(2년)",
        "10012": "오미자(3년이상)",
        "10025": "율무",
        "10022": "일천궁",
        "10013": "작약(1년생)",
        "10014": "작약(2년생)",
        "10015": "작약(3년생)",
        "10047": "잔대(뿌리)",
        "10001": "지황",
        "10002": "지황(재래종)",
        "10026": "향부자",
        "10038": "헛개나무",
        "10027": "홍화",
        "10006": "황금",
        "10028": "황금",
        "10017": "황기",
        "10020": "황련",
        "10039": "황칠나무"
    },
    "11": {  # 화훼류
        "11005": "구근류",
        "11003": "국화(노지재배)",
        "11002": "국화(온실절화)",
        "11009": "리시안서스",
        "11008": "안개초",
        "11013": "알스트로메리아",
        "11010": "용담",
        "11001": "장미",
        "11004": "카네이션",
        "11012": "코스모스",
        "11011": "프리지아",
        "11006": "화훼1년초(절화재배)",
        "11007": "화훼2년초(노지재배)"
    },
    "12": {  # 사료작물
        "12010": "귀리(사료용)",
        "12003": "목초(초지관리용-두과)",
        "12004": "목초(초지관리용-방목초지)",
        "12002": "목초(초지관리용-화본과)",
        "12001": "목초(초지조성용)",
        "12012": "사료용피(간척지)",
        "12011": "사료용피(기경지)",
        "12016": "수단그라스",
        "12007": "이탈리안라이그라스",
        "12008": "청보리",
        "12005": "청예옥수수",
        "12006": "청예용수수류",
        "12014": "케나프(간척지)",
        "12013": "케나프(기경지)",
        "12015": "트리티케일",
        "12009": "호밀(사료용)"
    },
    "13": {  # 기타
        "13002": "뽕나무(밀식기성)",
        "13001": "뽕나무(신규조성)",
        "13004": "연초(버어리종)",
        "13003": "연초(황색종)",
        "13012": "잔디(난지형)",
        "13013": "잔디(한지형)",
        "13005": "차나무(1년)",
        "13006": "차나무(2년)",
        "13007": "차나무(3년)",
        "13008": "차나무(4년)",
        "13009": "차나무(5년)",
        "13010": "차나무(6년)",
        "13011": "차나무(7년이상)"
    }
}


def find_crop_code_by_name(crop_name):
    """작물명으로 작물 코드 찾기 - 여러 결과 반환 가능"""
    crop_name = crop_name.strip()
    results = []

    # 모든 카테고리에서 작물명 검색
    for category_code, crops in ALL_CROPS.items():
        for crop_code, name in crops.items():
            # 정확히 일치하는 경우
            if crop_name == name:
                return [(crop_code, category_code, name)], True  # 정확한 매칭, 단일 결과
            # 부분 일치하는 경우
            elif crop_name in name:
                results.append((crop_code, category_code, name))

    # 정확한 매칭이 없고 부분 매칭이 있는 경우
    if results:
        return results, False  # 부분 매칭, 여러 결과 가능

    return [], False  # 매칭 없음


def get_fertilizer_data(crop_code, area, area_unit):
    """흙토람 API에서 비료 데이터 조회"""
    try:
        # 입력된 면적을 그대로 사용 (이미 올바른 단위로 변환됨)
        if area_unit == "1":  # 제곱미터
            area1 = area
            area2 = area / 3.3058
        else:  # 평
            area1 = area * 3.3058
            area2 = area

        # API 요청
        url = "https://soil.rda.go.kr/exam/prescript/examPrescriptProc.do"
        params = {
            'nh_pre_fert_n': 0,
            'nh_pre_fert_p': 0,
            'nh_pre_fert_k': 0,
            'nh_pre_fert_qy': 20,
            'nh_post_fert_n': 0,
            'nh_post_fert_p': 0,
            'nh_post_fert_k': 0,
            'nh_post_fert_qy': 20,
            'type': 'S',
            'flag': 'STAD_COMPUTE',
            'area1': area1,
            'area2': area2,
            'crop_cd': crop_code,
            '_': '1753340400894'
        }

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': 'https://soil.rda.go.kr/sibi/cropSibiPrescript.do'
        }

        response = requests.get(url, params=params, headers=headers, timeout=10)

        if response.status_code == 200:
            # JSON 응답 파싱
            data = json.loads(response.text)
            return {
                'success': True,
                'data': data
            }
        else:
            return {
                'success': False,
                'error': f'HTTP {response.status_code}',
                'response': response.text
            }

    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f'JSON 파싱 오류: {str(e)}',
            'response': response.text if 'response' in locals() else ''
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'요청 오류: {str(e)}'
        }


def main():
    st.title("🌱 흙토람 작물별 비료 표준사용량 처방")
    st.markdown("---")

    # 작물 목록 표시
    with st.expander("🌾 지원 작물 목록 (전체 13개 카테고리, 414종)"):
        selected_category = st.selectbox(
            "카테고리별 작물 목록 보기",
            options=list(CROP_CATEGORIES.keys())[1:],  # 빈 값 제외
            format_func=lambda x: CROP_CATEGORIES[x],
            key="view_category"
        )

        if selected_category:
            crops_in_category = ALL_CROPS[selected_category]
            st.write(f"**{CROP_CATEGORIES[selected_category]} ({len(crops_in_category)}종)**")

            # 3열로 표시
            col1, col2, col3 = st.columns(3)
            crop_items = list(crops_in_category.items())

            with col1:
                for i in range(0, len(crop_items), 3):
                    if i < len(crop_items):
                        code, name = crop_items[i]
                        st.write(f"• {name}")

            with col2:
                for i in range(1, len(crop_items), 3):
                    if i < len(crop_items):
                        code, name = crop_items[i]
                        st.write(f"• {name}")

            with col3:
                for i in range(2, len(crop_items), 3):
                    if i < len(crop_items):
                        code, name = crop_items[i]
                        st.write(f"• {name}")

    st.markdown("---")

    # 입력 섹션
    col1, col2, col3, col4, col5 = st.columns([1.5, 1.5, 2, 1, 1])

    with col1:
        st.write("**작물유형 선택**")
        crop_category = st.selectbox(
            "작물유형",
            options=list(CROP_CATEGORIES.keys()),
            format_func=lambda x: CROP_CATEGORIES[x],
            key="crop_category_select"
        )

    with col2:
        st.write("**작물 선택**")
        if crop_category and crop_category in ALL_CROPS:  # 작물유형이 선택되었을 때
            current_crops = ALL_CROPS[crop_category]
            crop_options = [""] + list(current_crops.keys())
            crop_code = st.selectbox(
                "작물",
                options=crop_options,
                format_func=lambda x: "작물 선택" if x == "" else current_crops[x],
                key="crop_select"
            )
        else:
            # 작물유형 미선택시
            st.selectbox(
                "작물",
                options=[""],
                format_func=lambda x: "작물 선택",
                key="crop_select_disabled",
                disabled=True
            )
            crop_code = ""

    # 작물 직접 입력 섹션 추가
    st.markdown("---")
    col_input1, col_input2 = st.columns([3, 1])

    with col_input1:
        st.write("**작물 직접 입력하기**")
        direct_crop_input = st.text_input(
            "작물명 직접 입력",
            placeholder="예: 고추, 사과, 배추 등...",
            key="direct_crop_input",
            disabled=not st.session_state.get('use_direct_input', False)
        )

    with col_input2:
        st.write("**직접입력 사용**")
        use_direct_input = st.checkbox(
            "직접입력 체크",
            key="use_direct_input"
        )

    # 직접입력 모드에서 실시간 검색 결과 표시
    selected_crop_info = None
    if use_direct_input and direct_crop_input.strip():
        search_results, is_exact_match = find_crop_code_by_name(direct_crop_input)

        if search_results:
            if is_exact_match:
                # 정확한 매칭 - 자동 선택
                selected_crop_info = search_results[0]
                st.success(f"✅ 작물 찾음: {selected_crop_info[2]}")
            else:
                # 여러 결과 - 사용자 선택
                if len(search_results) > 1:
                    st.info(f"'{direct_crop_input}' 관련 작물이 {len(search_results)}개 있습니다. 아래에서 선택해주세요:")

                    # 5열로 선택 가능한 작물 목록 표시
                    cols = st.columns(5)
                    for i, (crop_code_option, category_code, crop_name) in enumerate(search_results):
                        category_name = CROP_CATEGORIES[category_code]
                        col_idx = i % 5
                        with cols[col_idx]:
                            if st.button(
                                f"📌 {crop_name}\n({category_name})",
                                key=f"select_crop_{i}",
                                use_container_width=True
                            ):
                                st.session_state.selected_crop_info = (crop_code_option, category_code, crop_name)
                                selected_crop_info = (crop_code_option, category_code, crop_name)
                                st.rerun()

                    # 이전에 선택된 작물이 있다면 표시
                    if 'selected_crop_info' in st.session_state:
                        selected_crop_info = st.session_state.selected_crop_info
                        st.success(f"✅ 선택된 작물: {selected_crop_info[2]}")
                else:
                    # 단일 결과
                    selected_crop_info = search_results[0]
                    st.success(f"✅ 작물 찾음: {selected_crop_info[2]}")
        else:
            st.warning(f"'{direct_crop_input}' 작물을 찾을 수 없습니다.")

    # 직접입력 체크시 안내 메시지
    if use_direct_input:
        st.info("💡 직접입력 모드: 작물명을 입력하면 관련 작물이 표시됩니다.")

    st.markdown("---")

    with col3:
        st.write("**대상지 면적**")

        # 단위에 따른 기본값 설정
        if 'unit_select' in st.session_state:
            current_unit = st.session_state.unit_select
        else:
            current_unit = "1"  # 기본값: 제곱미터

        # 초기값 설정 (빈 상태)
        if 'area_value' not in st.session_state:
            st.session_state.area_value = None
            st.session_state.prev_unit = current_unit

        # 단위가 변경되었을 때 면적값 변환 (값이 있을 때만)
        if (st.session_state.prev_unit != current_unit and
                st.session_state.area_value is not None and
                st.session_state.area_value > 0):
            current_area = st.session_state.area_value
            if current_unit == "1":  # 평 → 제곱미터
                st.session_state.area_value = current_area * 3.3058
            else:  # 제곱미터 → 평
                st.session_state.area_value = current_area / 3.3058
            st.session_state.prev_unit = current_unit
        elif st.session_state.prev_unit != current_unit:
            # 값이 없을 때는 단위만 업데이트
            st.session_state.prev_unit = current_unit

        # 값이 있으면 그 값을, 없으면 None을 사용
        input_value = st.session_state.area_value if st.session_state.area_value is not None else None

        area = st.number_input(
            "면적",
            min_value=0.1,
            value=input_value,
            step=0.1,
            key="area_input",
            placeholder="면적을 입력하세요"
        )

        # session_state 값과 입력값 동기화
        if area != st.session_state.area_value:
            st.session_state.area_value = area

    with col4:
        st.write("**단위**")
        area_unit = st.radio(
            "단위 선택",
            options=["1", "2"],
            format_func=lambda x: "㎡" if x == "1" else "평",
            key="unit_select"
        )

    with col5:
        st.write("**검색**")

        # 검색 활성화 조건 설정
        if use_direct_input:
            # 직접입력 모드: 작물이 선택되고 면적이 입력된 경우
            search_enabled = (selected_crop_info is not None and
                              area is not None and
                              area > 0)
        else:
            # 일반 모드: 모든 작물유형이 선택되고 작물도 선택되고 면적이 입력된 경우
            search_enabled = (crop_category and
                              crop_category in ALL_CROPS and
                              crop_code != "" and
                              area is not None and
                              area > 0)

        search_btn = st.button(
            "🔍 검색",
            type="primary",
            use_container_width=True,
            disabled=not search_enabled
        )

    # 검색 결과
    if search_btn and search_enabled:
        st.markdown("---")

        # 직접입력 모드 처리
        if use_direct_input:
            if selected_crop_info:
                # 작물이 선택된 경우
                final_crop_code, final_category, final_crop_name = selected_crop_info

                # 선택 정보 표시
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("선택 작물", final_crop_name)
                with col2:
                    unit_text = "㎡" if area_unit == "1" else "평"
                    st.metric("대상지 면적", f"{area:,.1f} {unit_text}")
                with col3:
                    st.metric("작물 코드", final_crop_code)

                # API 호출
                with st.spinner("데이터 조회 중..."):
                    result = get_fertilizer_data(final_crop_code, area, area_unit)

                display_results = True

            else:
                # 작물이 선택되지 않은 경우
                st.error("❌ 작물을 선택해주세요.")
                display_results = False

        else:
            # 일반 모드 처리 (기존 코드)
            final_crop_code = crop_code
            current_crops = ALL_CROPS[crop_category]
            final_crop_name = current_crops[crop_code]

            # 선택 정보 표시
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("선택 작물", final_crop_name)
            with col2:
                unit_text = "㎡" if area_unit == "1" else "평"
                st.metric("대상지 면적", f"{area:,.1f} {unit_text}")
            with col3:
                st.metric("작물 코드", final_crop_code)

            # API 호출
            with st.spinner("데이터 조회 중..."):
                result = get_fertilizer_data(final_crop_code, area, area_unit)

            display_results = True

        # 결과 표시 (성공한 경우에만)
        if display_results and 'result' in locals():
            if result['success']:
                st.success("✅ 데이터 조회 완료!")

                data = result['data']

                # 성분량 및 추천량 표시
                st.subheader("📊 성분량 및 추천량")

                col1, col2 = st.columns(2)

                with col1:
                    st.markdown("**성분량(kg/10a)**")

                    # 성분량 테이블
                    component_data = {
                        "구분": ["밑거름", "웃거름"],
                        "질소": [
                            data.get('pre_N_300', '0'),
                            data.get('post_N_300', '0')
                        ],
                        "인산": [
                            data.get('pre_P_300', '0'),
                            data.get('post_P_300', '0')
                        ],
                        "칼리": [
                            data.get('pre_K_300', '0'),
                            data.get('post_K_300', '0')
                        ]
                    }

                    st.table(component_data)

                with col2:
                    st.markdown("**추천량(kg/실면적)**")

                    # 추천량 테이블
                    recommend_data = {
                        "구분": ["밑거름", "웃거름"],
                        "요소": [
                            data.get('pre_N1', '0'),
                            data.get('post_N1', '0')
                        ],
                        "용성인비": [
                            data.get('pre_P1', '0'),
                            data.get('post_P1', '0')
                        ],
                        "염화칼리": [
                            data.get('pre_K1', '0'),
                            data.get('post_K1', '0')
                        ]
                    }

                    st.table(recommend_data)

                # 원시 데이터 확인
                with st.expander("📋 원시 데이터 확인"):
                    st.json(data)

            else:
                st.error(f"❌ 데이터 조회 실패: {result['error']}")

                if 'response' in result and result['response']:
                    with st.expander("응답 내용 확인"):
                        st.code(result['response'])


if __name__ == "__main__":
    main()