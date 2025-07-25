# 복합비료 처방 시스템 - 흙토람 완전 연동
import streamlit as st
import requests
import json
import re

# 페이지 설정
st.set_page_config(
    page_title="흙토람 작물별 비료 표준사용량 처방",
    page_icon="🌱",
    layout="wide"
)

# 작물 유형 목록
CROP_CATEGORIES = {
    "": "작물유형 선택",
    "04": "과채류"
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

# 밑거름 비료 목록 (HTML에서 추출)
PRE_FERTILIZERS = {
    "12-7-8-15-흙살로POP": "흙살로POP",
    "21-6-8-20-흙사랑21": "흙사랑21",
    "12-6-8-20-휴믹황원예": "휴믹황원예",
    "10-2-7-20-헬리앤드론": "헬리앤드론",
    "12-10-9-20-한아름특호(사과,배,복숭아)": "한아름특호(사과,배,복숭아)",
    "30-6-9-20-한번에풀코스": "한번에풀코스",
    "21-10-11-20-한번에아리커": "한번에아리커",
    "18-6-11-20-한번에OK": "한번에OK",
    "25-7-8-20-한번애": "한번애",
    "30-5-7-20-하이롱": "하이롱",
    "19-19-19-25-폴리피드(19-19-19)": "폴리피드(19-19-19)",
    "22-6-9-20-파워한번에OK": "파워한번에OK",
    "12-6-6-20-파워원예복합": "파워원예복합",
    "13-8-8-20-파워성장엔(질산태, 유황함유": "파워성장엔(질산태, 유황함유",
    "11-8-9-20-파워감자": "파워감자",
    "22-8-8-20-파워22복합(완효성함유)": "파워22복합(완효성함유)",
    "21-5-8-20-파워 플러스": "파워 플러스"
}

# 웃거름 비료 목록 (HTML에서 추출)
POST_FERTILIZERS = {
    "30-0-12-20-한포로NK(원예웃거름)": "한포로NK(원예웃거름)",
    "13-2-12-20-파워성장엔추비": "파워성장엔추비",
    "30-0-1-20-칼슘요소": "칼슘요소",
    "25-0-15-20-으뜸드론 NK": "으뜸드론 NK",
    "18-0-12-20-으뜸NK802": "으뜸NK802",
    "16-0-11-20-원예추비특호": "원예추비특호",
    "13-0-13-20-원예추비": "원예추비",
    "13-0-13-20-원예웃거름특호": "원예웃거름특호",
    "14-0-12-20-원예웃거름골드(풍농)": "원예웃거름골드(풍농)",
    "13-0-13-20-원샷추비특호": "원샷추비특호",
    "25-0-10-20-원샷NK": "원샷NK",
    "18-0-10-20-엔피코 명품NK": "엔피코 명품NK"
}


def parse_fertilizer_recommendations(html_content):
    """HTML에서 복합비료 추천 정보 파싱"""
    try:
        fertilizers = {"pre": [], "post": []}

        # 밑거름 추천 비료 파싱
        pre_pattern = r'<input type="radio"[^>]*name="pre_nh"[^>]*onclick="SetNhPreNPK\(\'([^\']+)\'\)"[^>]*><label[^>]*>([^<]+)</label>'
        pre_matches = re.findall(pre_pattern, html_content)

        for match in pre_matches:
            npk_info = match[0].split('-')
            if len(npk_info) >= 4:
                fertilizers["pre"].append({
                    "name": match[1].strip(),
                    "npk": f"({npk_info[0]}-{npk_info[1]}-{npk_info[2]})",
                    "full_info": match[0]
                })

        # 웃거름 추천 비료 파싱
        post_pattern = r'<input type="radio"[^>]*name="post_nh"[^>]*onclick="SetNhPostNPK\(\'([^\']+)\'\)"[^>]*><label[^>]*>([^<]+)</label>'
        post_matches = re.findall(post_pattern, html_content)

        for match in post_matches:
            npk_info = match[0].split('-')
            if len(npk_info) >= 4:
                fertilizers["post"].append({
                    "name": match[1].strip(),
                    "npk": f"({npk_info[0]}-{npk_info[1]}-{npk_info[2]})",
                    "full_info": match[0]
                })

        return fertilizers
    except Exception as e:
        st.error(f"복합비료 정보 파싱 오류: {str(e)}")
        return {"pre": [], "post": []}


def get_fertilizer_data(crop_code, area, area_unit):
    """흙토람 API에서 기본 비료 데이터 조회"""
    try:
        if area_unit == "1":  # 제곱미터
            area1 = area
            area2 = area / 3.3058
        else:  # 평
            area1 = area * 3.3058
            area2 = area

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

        if response.status_code != 200:
            return {'success': False, 'error': f'HTTP {response.status_code}'}

        data = json.loads(response.text)

        # 복합비료 추천 정보 조회
        fertilizer_url = "https://soil.rda.go.kr/sibi/sibiPrescriptDetailNh.do"
        fertilizer_params = {
            'type': 'list',
            'pre_n': data.get('pre_N_300', 0),
            'pre_p': data.get('pre_P_300', 0),
            'pre_k': data.get('pre_K_300', 0),
            'post_n': data.get('post_N_300', 0),
            'post_p': data.get('post_P_300', 0),
            'post_k': data.get('post_K_300', 0),
            'crop_cd': crop_code,
            'crop_gbn': crop_code[:2]
        }

        fertilizer_response = requests.get(fertilizer_url, params=fertilizer_params, headers=headers, timeout=10)
        fertilizer_recommendations = {"pre": [], "post": []}
        if fertilizer_response.status_code == 200:
            fertilizer_recommendations = parse_fertilizer_recommendations(fertilizer_response.text)

        return {
            'success': True,
            'data': data,
            'fertilizers': fertilizer_recommendations,
            'area1': area1,
            'area2': area2
        }

    except Exception as e:
        return {'success': False, 'error': f'요청 오류: {str(e)}'}


def calculate_compound_fertilizer(crop_code, area1, area2, pre_n, pre_p, pre_k, pre_qy, post_n, post_p, post_k, post_qy,
                                  prescription_method):
    """복합비료 계산 API 호출"""
    try:
        url = "https://soil.rda.go.kr/exam/prescript/examPrescriptProc.do"
        params = {
            'nh_pre_fert_n': pre_n,
            'nh_pre_fert_p': pre_p,
            'nh_pre_fert_k': pre_k,
            'nh_pre_fert_qy': pre_qy,
            'nh_post_fert_n': post_n,
            'nh_post_fert_p': post_p,
            'nh_post_fert_k': post_k,
            'nh_post_fert_qy': post_qy,
            'type': 'S',
            'flag': 'STAD_COMPUTE',
            'area1': area1,
            'area2': area2,
            'crop_cd': crop_code,
            'prscrptn_cnd': prescription_method,
            '_': '1753340400894'
        }

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': 'https://soil.rda.go.kr/sibi/cropSibiPrescript.do'
        }

        response = requests.get(url, params=params, headers=headers, timeout=10)

        if response.status_code != 200:
            return {'success': False, 'error': f'HTTP {response.status_code}'}

        data = json.loads(response.text)
        return {'success': True, 'data': data}

    except Exception as e:
        return {'success': False, 'error': f'계산 오류: {str(e)}'}


def main():
    st.title("🌱 흙토람 작물별 비료 표준사용량 처방")
    st.markdown("---")

    # 작물 목록 표시
    with st.expander("🌾 지원 작물 목록 (과채류 32종)"):
        col1, col2, col3 = st.columns(3)
        crop_items = list(CROPS.items())

        for i, (code, name) in enumerate(crop_items):
            col = [col1, col2, col3][i % 3]
            with col:
                st.write(f"• {name}")

    st.markdown("---")

    # 입력 섹션
    col1, col2, col3, col4, col5 = st.columns([1.5, 1.5, 2, 1, 1])

    with col1:
        st.write("**작물유형**")
        crop_category = st.selectbox(
            "작물유형",
            options=list(CROP_CATEGORIES.keys()),
            format_func=lambda x: CROP_CATEGORIES[x],
            key="crop_category_select"
        )

    with col2:
        st.write("**작물 선택**")
        if crop_category == "04":
            crop_options = [""] + list(CROPS.keys())
            crop_code = st.selectbox(
                "작물",
                options=crop_options,
                format_func=lambda x: "작물 선택" if x == "" else CROPS[x],
                key="crop_select"
            )
        else:
            st.selectbox(
                "작물",
                options=[""],
                format_func=lambda x: "작물 선택",
                disabled=True,
                key="crop_select_disabled"
            )
            crop_code = ""

    with col3:
        st.write("**대상지 면적**")
        if 'unit_select' in st.session_state:
            current_unit = st.session_state.unit_select
        else:
            current_unit = "1"

        if 'area_value' not in st.session_state:
            st.session_state.area_value = None
            st.session_state.prev_unit = current_unit

        if (st.session_state.prev_unit != current_unit and
                st.session_state.area_value is not None and
                st.session_state.area_value > 0):
            current_area = st.session_state.area_value
            if current_unit == "1":
                st.session_state.area_value = current_area * 3.3058
            else:
                st.session_state.area_value = current_area / 3.3058
            st.session_state.prev_unit = current_unit
        elif st.session_state.prev_unit != current_unit:
            st.session_state.prev_unit = current_unit

        input_value = st.session_state.area_value if st.session_state.area_value is not None else None

        area = st.number_input(
            "면적",
            min_value=0.1,
            value=input_value,
            step=0.1,
            key="area_input",
            placeholder="면적을 입력하세요"
        )

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
        # API 호출
        with st.spinner("데이터 조회 중..."):
            result = get_fertilizer_data(crop_code, area, area_unit)

        if result['success']:
            # 기본 데이터를 세션에 저장
            st.session_state.basic_data = result['data']
            st.session_state.fertilizers = result['fertilizers']
            st.session_state.area1 = result['area1']
            st.session_state.area2 = result['area2']
            st.session_state.current_crop_code = crop_code
            st.session_state.current_crop_name = CROPS[crop_code]
            st.session_state.current_area = area
            st.session_state.current_area_unit = area_unit
            st.session_state.search_completed = True

    # 검색이 완료된 경우 결과 표시
    if hasattr(st.session_state, 'search_completed') and st.session_state.search_completed:
        st.markdown("---")
        st.success("✅ 데이터 조회 완료!")

        # 선택 정보 표시
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("선택 작물", st.session_state.current_crop_name)
        with col2:
            unit_text = "㎡" if st.session_state.current_area_unit == "1" else "평"
            st.metric("대상지 면적", f"{st.session_state.current_area:,.1f} {unit_text}")
        with col3:
            st.metric("작물 코드", st.session_state.current_crop_code)

        data = st.session_state.basic_data
        fertilizers = st.session_state.fertilizers

        # 성분량 및 추천량 표시
        st.subheader("📊 성분량 및 추천량")

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**성분량(kg/10a)**")
            component_data = {
                "구분": ["밑거름", "웃거름"],
                "질소": [data.get('pre_N_300', '0'), data.get('post_N_300', '0')],
                "인산": [data.get('pre_P_300', '0'), data.get('post_P_300', '0')],
                "칼리": [data.get('pre_K_300', '0'), data.get('post_K_300', '0')]
            }
            st.dataframe(component_data, hide_index=True, use_container_width=True)

        with col2:
            st.markdown("**추천량(kg/실면적)**")
            recommend_data = {
                "구분": ["밑거름", "웃거름"],
                "요소": [data.get('pre_N1', '0'), data.get('post_N1', '0')],
                "용성인비": [data.get('pre_P1', '0'), data.get('post_P1', '0')],
                "염화칼리": [data.get('pre_K1', '0'), data.get('post_K1', '0')]
            }
            st.dataframe(recommend_data, hide_index=True, use_container_width=True)

        # 복합비료 추천 순위
        st.subheader("🏆 복합비료(시중유통비료) 추천 순위")

        if fertilizers['pre'] or fertilizers['post']:
            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**밑거름 추천**")
                if fertilizers['pre']:
                    pre_data = []
                    for i, fert in enumerate(fertilizers['pre'][:5], 1):
                        pre_data.append([f"{i}순위", f"{fert['name']} {fert['npk']}"])

                    pre_df = {"순위": [row[0] for row in pre_data], "비료명": [row[1] for row in pre_data]}
                    st.dataframe(pre_df, hide_index=True, use_container_width=True)
                else:
                    st.write("추천 정보 없음")

            with col2:
                st.markdown("**웃거름 추천**")
                if fertilizers['post']:
                    post_data = []
                    for i, fert in enumerate(fertilizers['post'][:5], 1):
                        post_data.append([f"{i}순위", f"{fert['name']} {fert['npk']}"])

                    post_df = {"순위": [row[0] for row in post_data], "비료명": [row[1] for row in post_data]}
                    st.dataframe(post_df, hide_index=True, use_container_width=True)
                else:
                    st.write("추천 정보 없음")

        # 복합비료 처방 섹션
        st.markdown("---")
        st.subheader("⚗️ 복합비료 처방")

        # 처방방식 선택
        st.markdown("**복합비료 처방방식**")
        prescription_method = st.radio(
            "처방방식 선택",
            options=["1", "2", "3"],
            format_func=lambda x: {"1": "질소기준처방(기존방식)", "2": "인산기준처방", "3": "칼리기준처방"}[x],
            horizontal=True,
            key="prescription_method"
        )

        # 처방방식에 따른 라벨 변경
        if prescription_method == "1":
            label2, label3 = "인산 추가필요량", "칼리 추가필요량"
        elif prescription_method == "2":
            label2, label3 = "질소 추가필요량", "칼리 추가필요량"
        else:
            label2, label3 = "질소 추가필요량", "인산 추가필요량"

        # 밑거름 복합비료 처방
        st.markdown("**밑거름 복합비료 처방(kg/실면적)**")

        # 라벨과 체크박스를 같은 행에 배치
        col1, col2 = st.columns([3, 1])

        with col1:
            st.write("**밑거름 비종선택**")
        with col2:
            pre_user_input = st.checkbox("사용자 직접 입력", key="pre_user_input_check")

        # 드롭다운은 별도로 배치
        pre_fert_type = st.selectbox(
            "비종선택",  # 라벨 숨김용
            options=[""] + list(PRE_FERTILIZERS.keys()),
            format_func=lambda x: "선택" if x == "" else PRE_FERTILIZERS.get(x, x),
            key="pre_fert_select",
            label_visibility="collapsed"  # 라벨 숨김
        )

        # 입력 필드나 메트릭 표시
        if pre_user_input:
            col_n, col_p, col_k, col_qy = st.columns(4)
            with col_n:
                pre_n = st.number_input("질소(%)", min_value=0.0, max_value=100.0, value=0.0, step=0.1, key="pre_n",
                                        format="%.1f")
            with col_p:
                pre_p = st.number_input("인산(%)", min_value=0.0, max_value=100.0, value=0.0, step=0.1, key="pre_p",
                                        format="%.1f")
            with col_k:
                pre_k = st.number_input("칼리(%)", min_value=0.0, max_value=100.0, value=0.0, step=0.1, key="pre_k",
                                        format="%.1f")
            with col_qy:
                pre_qy = st.number_input("비료(1포대당) kg", min_value=1.0, value=20.0, step=1.0, key="pre_qy",
                                         format="%.1f")
        elif pre_fert_type and pre_fert_type != "":
            npk_info = pre_fert_type.split('-')
            pre_n = float(npk_info[0])
            pre_p = float(npk_info[1])
            pre_k = float(npk_info[2])
            pre_qy = float(npk_info[3])

            col_a, col_b, col_c, col_d = st.columns(4)
            with col_a:
                st.metric("질소(%)", f"{pre_n:.1f}")
            with col_b:
                st.metric("인산(%)", f"{pre_p:.1f}")
            with col_c:
                st.metric("칼리(%)", f"{pre_k:.1f}")
            with col_d:
                st.metric("포대당(kg)", f"{pre_qy:.1f}")
        else:
            pre_n = pre_p = pre_k = pre_qy = 0

        # 밑거름 계산 (성분값이 모두 0이 아닐 때만)
        if pre_n + pre_p + pre_k > 0:
            if pre_n + pre_p + pre_k > 100:
                st.error("❌ 밑거름 성분의 합이 100%를 초과할 수 없습니다.")
            else:
                pre_calc_result = calculate_compound_fertilizer(
                    st.session_state.current_crop_code,
                    st.session_state.area1,
                    st.session_state.area2,
                    pre_n, pre_p, pre_k, pre_qy,
                    0, 0, 0, 20,  # 웃거름은 0으로 설정
                    prescription_method
                )

                if pre_calc_result['success']:
                    calc_data = pre_calc_result['data']

                    st.markdown("**🎯 밑거름 복합비료 추천량**")

                    pre_result = calc_data.get('nh_pre_fertResultTotal', '0')
                    pre_result2 = calc_data.get('nh_pre_fertResultTotal2', '0')
                    pre_result3 = calc_data.get('nh_pre_fertResultTotal3', '0')

                    col_a, col_b, col_c = st.columns(3)
                    with col_a:
                        st.metric("복합비료 추천량 (kg)", f"{float(pre_result):.1f}")
                    with col_b:
                        st.metric(f"{label2} (kg)", f"{float(pre_result2):.1f}")
                    with col_c:
                        st.metric(f"{label3} (kg)", f"{float(pre_result3):.1f}")

                    if calc_data.get('nh_pre_stad_msg'):
                        # 선택한 비료명 추가
                        if pre_user_input:
                            # 소수점 첫째자리로 포맷팅
                            npk_format = f"({pre_n:.1f}-{pre_p:.1f}-{pre_k:.1f})"
                            original_msg = calc_data['nh_pre_stad_msg']
                            # 기존 메시지에서 괄호 부분을 찾아서 교체
                            import re
                            modified_msg = re.sub(r'\([^)]+\)', npk_format, original_msg)
                            modified_msg = f"사용자선택 {modified_msg}"
                        elif pre_fert_type and pre_fert_type != "":
                            fertilizer_name = PRE_FERTILIZERS[pre_fert_type]
                            modified_msg = f"{fertilizer_name} {calc_data['nh_pre_stad_msg']}"
                        else:
                            modified_msg = calc_data['nh_pre_stad_msg']
                        st.info(f"📋 {modified_msg}")

                    # 처방불가 메시지
                    if float(pre_result) <= 0:
                        st.warning("⚠️ 밑거름 복합비료 추천량이 0이므로 처방을 진행할 수 없습니다.")
                else:
                    st.error(f"❌ 밑거름 복합비료 계산 실패: {pre_calc_result['error']}")

        # 웃거름 복합비료 처방
        st.markdown("**웃거름 복합비료 처방(kg/실면적)**")

        # 라벨과 체크박스를 같은 행에 배치
        col1, col2 = st.columns([3, 1])

        with col1:
            st.write("**웃거름 비종선택**")
        with col2:
            post_user_input = st.checkbox("사용자 직접 입력", key="post_user_input_check")

        # 드롭다운은 별도로 배치
        post_fert_type = st.selectbox(
            "비종선택",  # 라벨 숨김용
            options=[""] + list(POST_FERTILIZERS.keys()),
            format_func=lambda x: "선택" if x == "" else POST_FERTILIZERS.get(x, x),
            key="post_fert_select",
            label_visibility="collapsed"  # 라벨 숨김
        )

        # 입력 필드나 메트릭 표시
        if post_user_input:
            col_n, col_p, col_k, col_qy = st.columns(4)
            with col_n:
                post_n = st.number_input("질소(%)", min_value=0.0, max_value=100.0, value=0.0, step=0.1, key="post_n",
                                         format="%.1f")
            with col_p:
                post_p = st.number_input("인산(%)", min_value=0.0, max_value=100.0, value=0.0, step=0.1, key="post_p",
                                         format="%.1f")
            with col_k:
                post_k = st.number_input("칼리(%)", min_value=0.0, max_value=100.0, value=0.0, step=0.1, key="post_k",
                                         format="%.1f")
            with col_qy:
                post_qy = st.number_input("비료(1포대당) kg", min_value=1.0, value=20.0, step=1.0, key="post_qy",
                                          format="%.1f")
        elif post_fert_type and post_fert_type != "":
            npk_info = post_fert_type.split('-')
            post_n = float(npk_info[0])
            post_p = float(npk_info[1])
            post_k = float(npk_info[2])
            post_qy = float(npk_info[3])

            col_a, col_b, col_c, col_d = st.columns(4)
            with col_a:
                st.metric("질소(%)", f"{post_n:.1f}")
            with col_b:
                st.metric("인산(%)", f"{post_p:.1f}")
            with col_c:
                st.metric("칼리(%)", f"{post_k:.1f}")
            with col_d:
                st.metric("포대당(kg)", f"{post_qy:.1f}")
        else:
            post_n = post_p = post_k = post_qy = 0

        # 웃거름 계산 (성분값이 모두 0이 아닐 때만)
        if post_n + post_p + post_k > 0:
            if post_n + post_p + post_k > 100:
                st.error("❌ 웃거름 성분의 합이 100%를 초과할 수 없습니다.")
            else:
                post_calc_result = calculate_compound_fertilizer(
                    st.session_state.current_crop_code,
                    st.session_state.area1,
                    st.session_state.area2,
                    0, 0, 0, 20,  # 밑거름은 0으로 설정
                    post_n, post_p, post_k, post_qy,
                    prescription_method
                )

                if post_calc_result['success']:
                    calc_data = post_calc_result['data']

                    st.markdown("**🎯 웃거름 복합비료 추천량**")

                    post_result = calc_data.get('nh_post_fertResultTotal', '0')
                    post_result2 = calc_data.get('nh_post_fertResultTotal2', '0')
                    post_result3 = calc_data.get('nh_post_fertResultTotal3', '0')

                    col_a, col_b, col_c = st.columns(3)
                    with col_a:
                        st.metric("복합비료 추천량 (kg)", f"{float(post_result):.1f}")
                    with col_b:
                        st.metric(f"{label2} (kg)", f"{float(post_result2):.1f}")
                    with col_c:
                        st.metric(f"{label3} (kg)", f"{float(post_result3):.1f}")

                    if calc_data.get('nh_post_stad_msg'):
                        # 선택한 비료명 추가
                        if post_user_input:
                            # 소수점 첫째자리로 포맷팅
                            npk_format = f"({post_n:.1f}-{post_p:.1f}-{post_k:.1f})"
                            original_msg = calc_data['nh_post_stad_msg']
                            # 기존 메시지에서 괄호 부분을 찾아서 교체
                            import re
                            modified_msg = re.sub(r'\([^)]+\)', npk_format, original_msg)
                            modified_msg = f"사용자선택 {modified_msg}"
                        elif post_fert_type and post_fert_type != "":
                            fertilizer_name = POST_FERTILIZERS[post_fert_type]
                            modified_msg = f"{fertilizer_name} {calc_data['nh_post_stad_msg']}"
                        else:
                            modified_msg = calc_data['nh_post_stad_msg']
                        st.info(f"📋 {modified_msg}")

                    # 처방불가 메시지
                    if float(post_result) <= 0:
                        st.warning("⚠️ 웃거름 복합비료 추천량이 0이므로 처방을 진행할 수 없습니다.")
                else:
                    st.error(f"❌ 웃거름 복합비료 계산 실패: {post_calc_result['error']}")


if __name__ == "__main__":
    main()