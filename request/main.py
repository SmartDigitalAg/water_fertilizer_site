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

# 과채류 작물 목록
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


def get_fertilizer_data(crop_code, area, area_unit):
    """흙토람 API에서 비료 데이터 조회"""
    try:
        # 입력된 면적을 그대로 사용
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
    with st.expander("🌾 지원 작물 목록 (과채류 32종)"):
        # 3열로 표시
        col1, col2, col3 = st.columns(3)
        crop_items = list(CROPS.items())

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
        if crop_category == "04":  # 과채류 선택시
            crop_options = [""] + list(CROPS.keys())
            crop_code = st.selectbox(
                "작물",
                options=crop_options,
                format_func=lambda x: "작물 선택" if x == "" else CROPS[x],
                key="crop_select"
            )
        else:
            # 다른 작물유형 선택시 또는 미선택시
            st.selectbox(
                "작물",
                options=[""],
                format_func=lambda x: "작물 선택",
                key="crop_select_disabled",
                disabled=True
            )
            crop_code = ""

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
        # 과채류가 선택되고 작물도 선택되고 면적이 입력된 경우에만 검색 버튼 활성화
        search_enabled = (crop_category == "04" and
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

        # 선택 정보 표시
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("선택 작물", CROPS[crop_code])
        with col2:
            unit_text = "㎡" if area_unit == "1" else "평"
            st.metric("대상지 면적", f"{area:,.1f} {unit_text}")
        with col3:
            st.metric("작물 코드", crop_code)

        # API 호출
        with st.spinner("데이터 조회 중..."):
            result = get_fertilizer_data(crop_code, area, area_unit)

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