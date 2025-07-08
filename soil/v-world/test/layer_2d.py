import streamlit as st
import folium
from streamlit_folium import folium_static
import requests

apikey = 'D8A444DC-1488-3E6F-8FBC-BB9F6F4C3ED6'

m = folium.Map(location=[37.5665, 126.978], zoom_start=10, tiles=None)

folium.TileLayer(
    tiles=f'https://api.vworld.kr/req/wmts/1.0.0/{apikey}/Base/{{z}}/{{y}}/{{x}}.png',
    attr='공간정보 오픈플랫폼(브이월드)',
    name='브이월드 배경지도',
).add_to(m)

# 주제도 가시화
folium.WmsTileLayer(
 url='https://api.vworld.kr/req/wms?',
 layers='lt_c_landinfobasemap',
 request='GetMap',
 version='1.3.0',
 height=256,
 width=256,
 key=apikey,
 fmt='image/png',
transparent=True, # 주제도 투명도
name='LX맵(편집지적도)',
 ).add_to(m)

folium.LayerControl().add_to(m)    # 레이어 컨트롤 on/off

# 지오코딩
address = [
 ['공간정보산업진흥원', '경기도 성남시 분당구 삼평동 624-3'],
 ['판교역', '경기도 성남시 분당구 백현동 534-1'],
 ['성남역', '경기도 성남시 분당구 백현동 545-1'],
 ]

apiurl = 'https://api.vworld.kr/req/address?'
for addr in address:
    params = {
        'service': 'address',
        'request': 'getcoord',
        'crs': 'EPSG:4326',
        'address': addr[1],
        'format': 'json',
        'type': 'PARCEL',
        'key': apikey
    }

    response = requests.get(apiurl, params=params)
    if response.status_code == 200:
        data = response.json()

        print(data['response']['result']['point'])
        x = data['response']['result']['point']['x']
        y = data['response']['result']['point']['y']

folium.Marker([y, x],
              popup=folium.Popup(f'<b>{addr[0]}</b><br>{addr[1]}', max_width=200),
              icon=folium.Icon(color='red', icon='bookmark')
).add_to(m)

st.title('브이월드 지도')
folium_static(m)
