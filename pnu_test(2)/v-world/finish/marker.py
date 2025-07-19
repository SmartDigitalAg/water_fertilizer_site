#V-World 1.0으로 지도 표시 + 검색 결과 추천 + 마커표시
import streamlit as st
import requests
import folium
from streamlit_folium import folium_static

st.set_page_config(page_title="주소/지명 → 지번·도로명·위도·경도 표시", layout="centered")

# 하나의 키로 “검색 + WMTS” 권한이 모두 활성화된 경우
API_KEY = "D8A444DC-1488-3E6F-8FBC-BB9F6F4C3ED6"
SEARCH_URL = "https://api.vworld.kr/req/search"

if 'query_input' not in st.session_state:
    st.session_state.query_input = ""
if 'trigger_search' not in st.session_state:
    st.session_state.trigger_search = False

st.markdown("""
<div style='display:flex; align-items:center; justify-content:center;'>
  <div style='font-size:28px; margin-right:10px;'>🔍</div>
  <div style='font-size:28px; font-weight:bold;'>주소/지명 입력 → 지번·도로명·위도·경도 표시</div>
</div>
""", unsafe_allow_html=True)

with st.form(key="search_form", clear_on_submit=False):
    col_text, col_button = st.columns([5, 1])
    col_text.text_input(
        label="검색어",
        placeholder="주소를 입력하세요(지번, 도로명, 지명 모두 가능)",
        key="query_input",
        label_visibility="collapsed"
    )
    if col_button.form_submit_button("Search"):
        st.session_state.trigger_search = True

if st.session_state.trigger_search and st.session_state.query_input.strip():
    def fetch_results(search_type, category=None):
        params = {
            'service': 'search',
            'request': 'search',
            'version': '2.0',
            'format': 'json',
            'key': API_KEY,                  # ← 하나의 키 사용
            'query': st.session_state.query_input,
            'type': search_type,
            'crs': 'EPSG:4326'
        }
        if category:
            params['category'] = category
        return (
            requests.get(SEARCH_URL, params=params)
                    .json()
                    .get('response', {})
                    .get('result', {})
                    .get('items', [])
        )

    items = (
        fetch_results('address', 'parcel')
        or fetch_results('address', 'road')
        or fetch_results('place')
    )

    if items:
        suggestions = []
        for itm in items[:10]:
            parcel_addr = itm.get('address', {}).get('parcel')
            road_addr   = itm.get('address', {}).get('road')
            if parcel_addr and road_addr:
                display = f"{parcel_addr} ({road_addr})"
            elif parcel_addr:
                display = parcel_addr
            elif road_addr:
                display = road_addr
            else:
                display = itm.get('title') or itm.get('address', {}).get('name') or "알 수 없는 주소"
            suggestions.append(display)

        dynamic_key = f"suggestion_{st.session_state.query_input}"

        def on_select():
            chosen = st.session_state[dynamic_key]
            if " (" in chosen:
                raw_parcel = chosen.split(" (", 1)[0]
            else:
                raw_parcel = chosen
            st.session_state.query_input = raw_parcel
            st.session_state.trigger_search = True

        st.selectbox(
            "검색 결과를 선택하세요",
            suggestions,
            index=0,
            key=dynamic_key,
            on_change=on_select
        )

        chosen_address = st.session_state[dynamic_key]
        sel_idx = suggestions.index(chosen_address)
        sel_item = items[sel_idx]

        longitude = float(sel_item['point']['x'])
        latitude  = float(sel_item['point']['y'])
        parcel_id = sel_item.get('address', {}).get('parcel')
        road_name = sel_item.get('address', {}).get('road')

        # 빠진 주소 보완
        if not parcel_id or not road_name:
            rev_params = {
                'service': 'address',
                'request': 'getaddr',
                'version': '2.0',
                'format': 'json',
                'key': API_KEY,
                'point': f"{longitude},{latitude}",
                'crs': 'EPSG:4326'
            }
            rev_items = (
                requests.get(SEARCH_URL, params=rev_params)
                        .json()
                        .get('response', {})
                        .get('result', {})
                        .get('items', [])
            )
            if rev_items:
                parcel_id = parcel_id or rev_items[0]['address'].get('parcel')
                road_name = road_name or rev_items[0]['address'].get('road')

        st.write(f"• 지번주소: {parcel_id}" if parcel_id else "• 지번주소: 정보 없음")
        st.write(f"• 도로명주소: {road_name}" if road_name else "• 도로명주소: 정보 없음")
        st.write(f"• 위도: {latitude}  • 경도: {longitude}")

        # ───────────────────────────────────────────────────────────────────
        # 지도 부분: Folium WMTS를 이용해 V-World 2D 배경지도 표시 + 마커 추가
        # ───────────────────────────────────────────────────────────────────
        m = folium.Map(
            location=[latitude, longitude],
            zoom_start=12,
            tiles=None
        )
        folium.TileLayer(
            tiles=f"https://api.vworld.kr/req/wmts/1.0.0/{API_KEY}/Base/{{z}}/{{y}}/{{x}}.png",
            attr="V-World 2D 배경지도",
            overlay=False,
            control=False
        ).add_to(m)

        # 검색한 지점에 마커 추가
        folium.Marker(
            location=[latitude, longitude],
            tooltip=chosen_address  # 마커 위에 주소가 툴팁으로 표시됩니다
        ).add_to(m)

        folium_static(m, width=800, height=600)

    else:
        st.error("❌ 결과를 찾을 수 없습니다.")

    st.session_state.trigger_search = False
