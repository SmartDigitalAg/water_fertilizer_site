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
    """흙토람 API에서 비료 데이터 및 복합비료 추천 조회"""
    try:
        if area_unit == "1":  # 제곱미터
            area1 = area
            area2 = area / 3.3058
        else:  # 평
            area1 = area * 3.3058
            area2 = area

        # 1. 기본 비료 처방 데이터 조회
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

        # 2. 복합비료 추천 정보 조회 (별도 API)
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
            'fertilizers': fertilizer_recommendations
        }

    except json.JSONDecodeError as e:
        return {'success': False, 'error': f'JSON 파싱 오류: {str(e)}'}
    except Exception as e:
        return {'success': False, 'error': f'요청 오류: {str(e)}'}


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
            format_func=lambda x: CROP_CATEGORIES[x]
        )

    with col2:
        st.write("**작물 선택**")
        if crop_category == "04":
            crop_options = [""] + list(CROPS.keys())
            crop_code = st.selectbox(
                "작물",
                options=crop_options,
                format_func=lambda x: "작물 선택" if x == "" else CROPS[x]
            )
        else:
            st.selectbox("작물", options=[""], format_func=lambda x: "작물 선택", disabled=True)
            crop_code = ""

    with col3:
        st.write("**대상지 면적**")
        area = st.number_input("면적", min_value=0.1, step=0.1, value=None, placeholder="면적을 입력하세요")

    with col4:
        st.write("**단위**")
        area_unit = st.radio("단위", options=["1", "2"], format_func=lambda x: "㎡" if x == "1" else "평")

    with col5:
        st.write("**검색**")
        search_enabled = crop_category == "04" and crop_code != "" and area is not None and area > 0
        search_btn = st.button("🔍 검색", type="primary", use_container_width=True, disabled=not search_enabled)

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
            fertilizers = result['fertilizers']

            # area1, area2 계산 (복합비료 계산에서 사용)
            if area_unit == "1":  # 제곱미터
                area1 = area
                area2 = area / 3.3058
            else:  # 평
                area1 = area * 3.3058
                area2 = area

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
                # 테이블 형태로 표시
                col1, col2 = st.columns(2)

                with col1:
                    st.markdown("**밑거름 추천**")
                    if fertilizers['pre']:
                        pre_data = []
                        for i, fert in enumerate(fertilizers['pre'][:3], 1):
                            pre_data.append([f"{i}순위", f"{fert['name']} {fert['npk']}"])

                        pre_df = {"순위": [row[0] for row in pre_data], "비료명": [row[1] for row in pre_data]}
                        st.dataframe(pre_df, hide_index=True, use_container_width=True)
                    else:
                        st.write("추천 정보 없음")

                with col2:
                    st.markdown("**웃거름 추천**")
                    if fertilizers['post']:
                        post_data = []
                        for i, fert in enumerate(fertilizers['post'][:3], 1):
                            post_data.append([f"{i}순위", f"{fert['name']} {fert['npk']}"])

                        post_df = {"순위": [row[0] for row in post_data], "비료명": [row[1] for row in post_data]}
                        st.dataframe(post_df, hide_index=True, use_container_width=True)
                    else:
                        st.write("추천 정보 없음")

                st.markdown("※ 위 추천비료는 기준값에서 질소, 인산, 칼리 순으로 근접한 비료가 선정되었습니다.")
            else:
                st.warning("복합비료 추천 정보를 불러올 수 없습니다.")

            # 복합비료 처방방식
            st.subheader("⚙️ 복합비료 처방방식")
            prescription_method = st.radio(
                "처방방식 선택",
                options=["1", "2", "3"],
                format_func=lambda x: {"1": "질소기준처방(기존방식)", "2": "인산기준처방", "3": "칼리기준처방"}[x],
                horizontal=True
            )

            # 밑거름 복합비료 처방
            st.subheader("🔽 밑거름 복합비료 처방(kg/실면적)")

            col1, col2 = st.columns([1, 1])

            with col1:
                st.write("**비종선택**")
                # 밑거름 비료 선택 옵션들 (주요 비료만 선택)
                pre_fertilizers = {
                    "": "선택",
                    "19-19-19-25-폴리피드(19-19-19)": "폴리피드(19-19-19)",
                    "10-10-7-20-맞춤25호": "맞춤25호",
                    "21-6-8-20-흙사랑21": "흙사랑21",
                    "12-6-8-20-휴믹황원예": "휴믹황원예",
                    "30-6-9-20-한번에풀코스": "한번에풀코스"
                }

                selected_pre_fertilizer = st.selectbox(
                    "밑거름 비료",
                    options=list(pre_fertilizers.keys()),
                    format_func=lambda x: pre_fertilizers[x]
                )

                pre_user_input = st.checkbox("사용자 직접 입력", key="pre_user_input")

            with col2:
                st.write("**복합비료 종류(%)**")
                col2_1, col2_2, col2_3, col2_4 = st.columns(4)

                with col2_1:
                    if selected_pre_fertilizer and not pre_user_input:
                        npk = selected_pre_fertilizer.split('-')
                        pre_n = int(npk[0]) if npk else 0
                    else:
                        pre_n = 0
                    pre_n_val = st.number_input("질소", min_value=0, max_value=100, value=pre_n, key="pre_n",
                                                disabled=not pre_user_input)

                with col2_2:
                    if selected_pre_fertilizer and not pre_user_input:
                        pre_p = int(npk[1]) if len(npk) > 1 else 0
                    else:
                        pre_p = 0
                    pre_p_val = st.number_input("인산", min_value=0, max_value=100, value=pre_p, key="pre_p",
                                                disabled=not pre_user_input)

                with col2_3:
                    if selected_pre_fertilizer and not pre_user_input:
                        pre_k = int(npk[2]) if len(npk) > 2 else 0
                    else:
                        pre_k = 0
                    pre_k_val = st.number_input("칼리", min_value=0, max_value=100, value=pre_k, key="pre_k",
                                                disabled=not pre_user_input)

                with col2_4:
                    if selected_pre_fertilizer and not pre_user_input:
                        pre_qy = int(npk[3]) if len(npk) > 3 else 20
                    else:
                        pre_qy = 20
                    pre_qy_val = st.number_input("비료(1포대당) kg", min_value=1, value=pre_qy, key="pre_qy")

            # 웃거름 복합비료 처방
            st.subheader("🔼 웃거름 복합비료 처방(kg/실면적)")

            col1, col2 = st.columns([1, 1])

            with col1:
                st.write("**비종선택**")
                # 웃거름 비료 선택 옵션들
                post_fertilizers = {
                    "": "선택",
                    "18-0-15-20-땅심엔케이": "땅심엔케이",
                    "17-0-14-20-맞춤추비30호": "맞춤추비30호",
                    "13-0-10-20-맞춤추비29호": "맞춤추비29호",
                    "25-0-10-20-원샷NK": "원샷NK",
                    "30-0-12-20-한포로NK(원예웃거름)": "한포로NK(원예웃거름)"
                }

                selected_post_fertilizer = st.selectbox(
                    "웃거름 비료",
                    options=list(post_fertilizers.keys()),
                    format_func=lambda x: post_fertilizers[x]
                )

                post_user_input = st.checkbox("사용자 직접 입력", key="post_user_input")

            with col2:
                st.write("**복합비료 종류(%)**")
                col2_1, col2_2, col2_3, col2_4 = st.columns(4)

                with col2_1:
                    if selected_post_fertilizer and not post_user_input:
                        post_npk = selected_post_fertilizer.split('-')
                        post_n = int(post_npk[0]) if post_npk else 0
                    else:
                        post_n = 0
                    post_n_val = st.number_input("질소", min_value=0, max_value=100, value=post_n, key="post_n",
                                                 disabled=not post_user_input)

                with col2_2:
                    if selected_post_fertilizer and not post_user_input:
                        post_p = int(post_npk[1]) if len(post_npk) > 1 else 0
                    else:
                        post_p = 0
                    post_p_val = st.number_input("인산", min_value=0, max_value=100, value=post_p, key="post_p",
                                                 disabled=not post_user_input)

                with col2_3:
                    if selected_post_fertilizer and not post_user_input:
                        post_k = int(post_npk[2]) if len(post_npk) > 2 else 0
                    else:
                        post_k = 0
                    post_k_val = st.number_input("칼리", min_value=0, max_value=100, value=post_k, key="post_k",
                                                 disabled=not post_user_input)

                with col2_4:
                    if selected_post_fertilizer and not post_user_input:
                        post_qy = int(post_npk[3]) if len(post_npk) > 3 else 20
                    else:
                        post_qy = 20
                    post_qy_val = st.number_input("비료(1포대당) kg", min_value=1, value=post_qy, key="post_qy")

            # 복합비료 추천량 계산 및 표시
            if st.button("복합비료 추천량 계산", type="secondary"):
                with st.spinner("복합비료 추천량 계산 중..."):
                    # API 호출로 복합비료 추천량 계산
                    calc_url = "https://soil.rda.go.kr/exam/prescript/examPrescriptProc.do"
                    calc_params = {
                        'nh_pre_fert_n': pre_n_val,
                        'nh_pre_fert_p': pre_p_val,
                        'nh_pre_fert_k': pre_k_val,
                        'nh_pre_fert_qy': pre_qy_val,
                        'nh_post_fert_n': post_n_val,
                        'nh_post_fert_p': post_p_val,
                        'nh_post_fert_k': post_k_val,
                        'nh_post_fert_qy': post_qy_val,
                        'type': 'S',
                        'flag': 'STAD_COMPUTE',
                        'area1': area1,
                        'area2': area2,
                        'crop_cd': crop_code,
                        'prscrptn_cnd': prescription_method
                    }

                    calc_headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'Referer': 'https://soil.rda.go.kr/sibi/cropSibiPrescript.do'
                    }

                    try:
                        calc_response = requests.get(calc_url, params=calc_params, headers=calc_headers, timeout=10)
                        if calc_response.status_code == 200:
                            calc_data = json.loads(calc_response.text)

                            # 복합비료 추천량 결과 표시
                            st.subheader("📋 복합비료(시중유통비료) 추천량")

                            col1, col2 = st.columns(2)

                            with col1:
                                st.write("**밑거름 추천량**")
                                if calc_data.get('nh_pre_fertResultTotal'):
                                    st.success(f"복합비료 추천량: {calc_data.get('nh_pre_fertResultTotal', 0)} kg")
                                    if calc_data.get('nh_pre_fertResultTotal2'):
                                        additional_label = {"1": "인산", "2": "질소", "3": "질소"}[prescription_method]
                                        st.info(
                                            f"{additional_label} 추가필요량: {calc_data.get('nh_pre_fertResultTotal2', 0)} kg")
                                    if calc_data.get('nh_pre_fertResultTotal3'):
                                        additional_label2 = {"1": "칼리", "2": "칼리", "3": "인산"}[prescription_method]
                                        st.info(
                                            f"{additional_label2} 추가필요량: {calc_data.get('nh_pre_fertResultTotal3', 0)} kg")
                                else:
                                    st.warning("밑거름 복합비료 추천량 계산 결과가 없습니다.")

                            with col2:
                                st.write("**웃거름 추천량**")
                                if calc_data.get('nh_post_fertResultTotal'):
                                    st.success(f"복합비료 추천량: {calc_data.get('nh_post_fertResultTotal', 0)} kg")
                                    if calc_data.get('nh_post_fertResultTotal2'):
                                        additional_label = {"1": "인산", "2": "질소", "3": "질소"}[prescription_method]
                                        st.info(
                                            f"{additional_label} 추가필요량: {calc_data.get('nh_post_fertResultTotal2', 0)} kg")
                                    if calc_data.get('nh_post_fertResultTotal3'):
                                        additional_label2 = {"1": "칼리", "2": "칼리", "3": "인산"}[prescription_method]
                                        st.info(
                                            f"{additional_label2} 추가필요량: {calc_data.get('nh_post_fertResultTotal3', 0)} kg")
                                else:
                                    st.warning("웃거름 복합비료 추천량 계산 결과가 없습니다.")

                        else:
                            st.error("복합비료 추천량 계산에 실패했습니다.")
                    except Exception as e:
                        st.error(f"복합비료 추천량 계산 오류: {str(e)}")

        else:
            st.error(f"❌ 데이터 조회 실패: {result['error']}")


if __name__ == "__main__":
    main()