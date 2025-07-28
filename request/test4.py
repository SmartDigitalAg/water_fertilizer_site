import streamlit as st
import pandas as pd
import requests
import json

# 페이지 설정
st.set_page_config(
    page_title="흙토람 작물별 비료 표준사용량 처방",
    page_icon="🌱",
    layout="wide"
)


@st.cache_data
def load_crop_data():
    """CSV 파일에서 작물 데이터 로드"""
    df = pd.read_csv('crops_.csv')

    # 카테고리별 작물 딕셔너리 생성
    categories = {}
    crops_dict = {}

    for _, row in df.iterrows():
        cat_code = f"{row['category_code']:02d}"
        crop_code = f"{row['crop_code']:05d}"

        if cat_code not in categories:
            categories[cat_code] = row['category_name']

        if cat_code not in crops_dict:
            crops_dict[cat_code] = {}

        crops_dict[cat_code][crop_code] = row['crop_name']

    return categories, crops_dict, df


def find_crop_by_name(crop_name, df):
    """작물명으로 검색"""
    crop_name = crop_name.strip()

    # 정확한 매칭
    exact_match = df[df['crop_name'] == crop_name]
    if not exact_match.empty:
        row = exact_match.iloc[0]
        return [(f"{row['crop_code']:05d}", f"{row['category_code']:02d}", row['crop_name'])], True

    # 부분 매칭
    partial_match = df[df['crop_name'].str.contains(crop_name, na=False)]
    if not partial_match.empty:
        results = []
        for _, row in partial_match.iterrows():
            results.append((f"{row['crop_code']:05d}", f"{row['category_code']:02d}", row['crop_name']))
        return results, False

    return [], False


def get_fertilizer_data(crop_code, area, area_unit):
    """흙토람 API에서 비료 데이터 조회"""
    try:
        if area_unit == "1":  # 제곱미터
            area1 = area
            area2 = area / 3.3058
        else:  # 평
            area1 = area * 3.3058
            area2 = area

        url = "https://soil.rda.go.kr/exam/prescript/examPrescriptProc.do"
        params = {
            'nh_pre_fert_n': 0, 'nh_pre_fert_p': 0, 'nh_pre_fert_k': 0, 'nh_pre_fert_qy': 20,
            'nh_post_fert_n': 0, 'nh_post_fert_p': 0, 'nh_post_fert_k': 0, 'nh_post_fert_qy': 20,
            'type': 'S', 'flag': 'STAD_COMPUTE', 'area1': area1, 'area2': area2,
            'crop_cd': crop_code, '_': '1753340400894'
        }

        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 200:
            return {'success': True, 'data': json.loads(response.text)}
        else:
            return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def main():
    st.title("🌱 흙토람 작물별 비료 표준사용량 처방")

    # 데이터 로드
    categories, crops_dict, df = load_crop_data()

    # 작물 목록 표시
    with st.expander(f"🌾 지원 작물 목록 (전체 {len(categories)}개 카테고리, {len(df)}종)"):
        for cat_code, cat_name in categories.items():
            if cat_code in crops_dict:
                st.write(f"**{cat_name} ({len(crops_dict[cat_code])}종)**")
                crop_names = list(crops_dict[cat_code].values())
                # 3열로 표시
                cols = st.columns(3)
                for i, name in enumerate(crop_names):
                    cols[i % 3].write(f"• {name}")

    st.markdown("---")

    # 입력 UI
    col1, col2, col3 = st.columns([2, 2, 1])

    with col1:
        # 직접 입력 방식
        crop_input = st.text_input("🔍 작물명 입력", placeholder="예: 고추, 사과, 배추...")

        selected_crop = None
        if crop_input.strip():
            results, is_exact = find_crop_by_name(crop_input, df)

            if results:
                if is_exact or len(results) == 1:
                    selected_crop = results[0]
                    st.success(f"✅ {selected_crop[2]}")
                else:
                    st.info(f"'{crop_input}' 관련 작물 {len(results)}개 발견:")

                    # 선택 버튼들 (2열로 표시)
                    for i in range(0, len(results), 2):
                        cols = st.columns(2)
                        for j in range(2):
                            if i + j < len(results):
                                crop_info = results[i + j]
                                with cols[j]:
                                    if st.button(f"📌 {crop_info[2]}", key=f"crop_{i + j}", use_container_width=True):
                                        st.session_state.selected_crop = crop_info
                                        selected_crop = crop_info
                                        st.rerun()

                    if 'selected_crop' in st.session_state:
                        selected_crop = st.session_state.selected_crop
                        st.success(f"✅ 선택됨: {selected_crop[2]}")
            else:
                st.warning(f"'{crop_input}' 작물을 찾을 수 없습니다.")

    with col2:
        area = st.number_input("📏 면적", min_value=0.1, step=0.1, placeholder="면적 입력")
        area_unit = st.radio("단위", ["1", "2"], format_func=lambda x: "㎡" if x == "1" else "평", horizontal=True)

    with col3:
        st.write("　")  # 높이 맞춤
        search_btn = st.button("🔍 검색", type="primary", use_container_width=True,
                               disabled=not (selected_crop and area and area > 0))

    # 검색 결과
    if search_btn and selected_crop and area > 0:
        st.markdown("---")

        # 검색 정보 표시
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("작물", selected_crop[2])
        with col2:
            unit_text = "㎡" if area_unit == "1" else "평"
            st.metric("면적", f"{area:,.1f} {unit_text}")
        with col3:
            st.metric("코드", selected_crop[0])

        # API 호출
        with st.spinner("데이터 조회 중..."):
            result = get_fertilizer_data(selected_crop[0], area, area_unit)

        if result['success']:
            st.success("✅ 데이터 조회 완료!")
            data = result['data']

            # 결과 테이블
            st.subheader("📊 비료 사용량")

            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**성분량 (kg/10a)**")
                component_df = pd.DataFrame({
                    "구분": ["밑거름", "웃거름"],
                    "질소": [data.get('pre_N_300', '0'), data.get('post_N_300', '0')],
                    "인산": [data.get('pre_P_300', '0'), data.get('post_P_300', '0')],
                    "칼리": [data.get('pre_K_300', '0'), data.get('post_K_300', '0')]
                })
                st.dataframe(component_df, use_container_width=True, hide_index=True)

            with col2:
                st.markdown("**추천량 (kg/실면적)**")
                recommend_df = pd.DataFrame({
                    "구분": ["밑거름", "웃거름"],
                    "요소": [data.get('pre_N1', '0'), data.get('post_N1', '0')],
                    "용성인비": [data.get('pre_P1', '0'), data.get('post_P1', '0')],
                    "염화칼리": [data.get('pre_K1', '0'), data.get('post_K1', '0')]
                })
                st.dataframe(recommend_df, use_container_width=True, hide_index=True)

            # 원시 데이터
            with st.expander("📋 원시 데이터"):
                st.json(data)
        else:
            st.error(f"❌ 조회 실패: {result['error']}")


if __name__ == "__main__":
    main()