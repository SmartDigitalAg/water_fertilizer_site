import streamlit as st
import requests

API_KEY = "D8A444DC-1488-3E6F-8FBC-BB9F6F4C3ED6"
SEARCH_URL = "https://api.vworld.kr/req/search"

st.set_page_config(page_title="주소 → 위도/경도", layout="centered")
st.title("주소/지명 → 위도, 경도 변환")

query = st.text_input("주소를 입력하세요 (지번, 도로명, 건물명 등)")

def get_latlon_and_address(query):
    # 1. 지번(토지대장) → 2. 도로명 → 3. 장소(건물명/POI)
    # 1, 2번은 category 필요, 3번은 type만 place로!
    for search in [
        {'type': 'address', 'category': 'parcel'},
        {'type': 'address', 'category': 'road'},
        {'type': 'place'}
    ]:
        params = {
            'service': 'search',
            'request': 'search',
            'version': '2.0',
            'format': 'json',
            'key': API_KEY,
            'query': query,
            'crs': 'EPSG:4326',
            'type': search['type'],
        }
        if 'category' in search:
            params['category'] = search['category']
        res = requests.get(SEARCH_URL, params=params)
        items = res.json().get('response', {}).get('result', {}).get('items', [])
        if items:
            item = items[0]
            # 주소 dict는 address에 들어 있음
            address_info = item.get('address', {})
            parcel_addr = address_info.get('parcel', None)
            road_addr = address_info.get('road', None)
            lat = item['point']['y']
            lon = item['point']['x']
            return lat, lon, parcel_addr, road_addr
    return None, None, None, None

if st.button("검색") and query.strip():
    lat, lon, parcel_addr, road_addr = get_latlon_and_address(query)
    if lat and lon:
        st.write(f"**위도**: {lat}")
        st.write(f"**경도**: {lon}")
        st.write(f"**지번주소**: {parcel_addr if parcel_addr else '정보 없음'}")
        st.write(f"**도로명주소**: {road_addr if road_addr else '정보 없음'}")
    else:
        st.error("검색 결과가 없습니다.")
