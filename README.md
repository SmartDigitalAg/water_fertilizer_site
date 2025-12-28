# 노지 밭작물 비료 사용 및 물 사용 처방 프로그램 고도화
비료사용처방, 물사용처방을 제공하는 Django 기반 웹 서비스입니다.  

## 패키지 환경 설정
```
# 1. 프로젝트 폴더로 이동
(soil_site) C:\Users\hajon> cd C:\code\soil_site_final

# 2. requirements.txt로 패키지 설치
(soil_site) C:\code\soil_site_final> pip install -r requirements.txt

# 3. 설치 완료 후 서버 실행
(soil_site) C:\code\soil_site_final> python manage.py runserver
```

## 프로젝트 구조

```
soil_site_final/
├── fertilizer/                    # 비료 처방 
│   ├── migrations/
│   ├── static/
│   │   └── fertilizer/
│   │       ├── css/
│   │       │   ├── experience.css    #비료사용처방 체험하기
│   │       │   ├── prescription.css  #비료사용처방
│   │       │   └── standard.css      #표준 비료사용량 처방
│   │       ├── data/
│   │       ├── images/
│   │       └── js/
│   │           ├── experience.js
│   │           ├── prescription.js
│   │           └── standard.js
│   ├── templates/
│   │   └── fertilizer/
│   │       ├── experience.html
│   │       ├── prescription.html
│   │       └── standard.html
│   └── views.py
│
├── ssp/                          # 미래 기후데이터
│   ├── migrations/
│   ├── static/
│   │   └── ssp/
│   │       ├── css/
│   │       │   └── ssp.css
│   │       ├── data/
│   │       ├── js/
│   │       │   └── ssp.js
│   │       └── templates/
│   │           └── ssp/
│   │               └── ssp.html
│   ├── water_req_mme/            # 물필요량 계산(MME)
│   └── views.py
│
├── water/                        # 물처방 
│   ├── migrations/
│   ├── static/
│   │   └── water/
│   │       ├── css/
│   │       │   └── water.css
│   │       ├── data/
│   │       ├── images/
│   │       └── js/
│   │           └── water.js
│   ├── templates/
│   │       └── water.html
│   └── views.py
│
├── soil_site_prj/                # Django 프로젝트 설정
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   ├── views.py
│   └── wsgi.py
│
├── static/                       # 전역 정적 파일
│   ├── css/
│   │   ├── base.css
│   │   └── main.css
│   └── images/
│
├── templates/                    # 전역 템플릿
│   └── index.html
│
├── _media/                        
├── _static/                      # 수집된 정적 파일 (collectstatic 결과)
│
├── .dockerignore                 # 빌드 제외 목록
├── docker-compose.yml            # 컨테이너 설정
│   # - 포트: 80(외부) → 8200(내부)
│   # - 메모리: 800MB 제한, swap 2.5GB
├── Dockerfile                    # 이미지 빌드 설정
├── manage.py                     
├── db.sqlite3                    
└── requirements.txt              
```

## 주요 기능

### 1. 물사용처방
- **URL**: /water/
- **목적**: 작물별 생육단계에 따른 물필요량 계산 및 관수 의사결정 지원
- **주요기능**: 
  - 주소 검색 (V-World API 2.0, 300건 이상이면 상세 주소 입력 요청)
  - 생육단계별 물필요량 표출 (흙토람 크롤링-기존 18 작물유형)
  - 생육단계별 물필요량 표출 (신규 작물 추가-양배추)
  - 강수량 데이터 (농업날씨365-215개 지점)
  - 단기 기상예보 (날씨누리-읍면동 기준)
  - 경사도 지도(수치표고모델(=DEM) 자료)

- **주요함수**:
```javascript
// water.js
handleAddressSearch(addressValue)      // V-World API 주소 검색
fetchSlopeData(lat, lon)              // 경사도 조회
fetchAllRainfallData(address)         // 강수량 데이터 로드
fetchAndRenderShortForecast(address)  // 단기예보 조회
calculateCabbageWaterRequirement()    // 양배추 물필요량 계산
]
```
```python
# water/views.py
get_water_api(request)                    # 통합 API 엔드포인트
handle_slope_request(request)             # 경사도 데이터 조회
handle_rainfall_all_request(request)      # 전체 강수량 조회
handle_short_forecast_request(request)    # 단기예보 조회
get_latlon(request)                       # V-World API 주소 검색 (최대 300건, 위경도 반환)
```
   

### 2. 미래 기후데이터
- **URL**: /ssp/
- **목적**: 기후변화 시나리오(SSP1-2.6, SSP2-4.5, SSP3-7.0, SSP5-8.5) 기반 작물별 물필요량 예측 (2026-2100)
- **주요기능**: 
  - 4개 시나리오별 물필요량 지도 시각화
  - 167개 지점 기후데이터 기반 FAO Penman-Monteith 증발산량 산정
  - 작물계수 적용한 생육단계별 물필요량 계산
  - 시나리오별/지역별 변화 추세 및 경향을 동적/정적 지도 및 차트로 표출

- **주요함수**:
```javascript
// ssp.js
loadPrecomputedData(scenario)                                // 사전 계산 데이터 로드
getWaterRequirementFromPrecomputed(scenario, year, crop)     // 연도별 물필요량 조회
visualizeDataOnMap(scenario, year, crop)                     // 동적 지도 시각화
visualizeStaticMaps(crop, period = 'late')                  // 정적 지도 시각화 (전반기/중반기/후반기)
loadClimateData(scenario, crop, station, stage)             // 기후데이터 로드
```

- **데이터 구조**: 
  - 사전 계산 데이터: water_req_{scenario}.csv.gz
  - 평균 기온 데이터: avg_temp_{scenario}_{stage}_2026_2100.csv

### 3. 비료사용처방
- **URL**: /fertilizer/prescription/
- **목적**: 토양검정 결과 기반 작물별 비료 처방
- **주요기능**: 
  - 지역별 토양검정 이력 조회
  - 화학성 평균 데이터 표시
  - 비료사용처방 결과 표출

- **주요함수**:
```javascript
// prescription.js
handleAddressComplete()                                                      // 주소 선택 완료 처리
calculateFertilizer(stage, n, p, k, qy, examData, fertilizerData, cropInfo) // 복합비료 계산
```
```python
# fertilizer/views.py
get_fertilizer_prescription_data(exam_data, crop_cd, rice_fert='', organic_at='N')                      # 비료처방 데이터 조회
get_fertilizer_recommendations(pre_n, pre_p, pre_k, post_n, post_p, post_k, crop_cd, param_crop_gbn)    # 복합비료 추천 순위
get_chemical_data(sido_cd, sgg_cd, umd_cd, ri_cd)                                                       # 화학성 평균 조회
```

### 4. 비료사용처방 체험하기
- **URL**: /fertilizer/experience/
- **목적**: 토양검정 없이 사용자 입력값으로 비료처방 체험
- **주요기능**: 
  - 면적 단위 변환 (㎡ ↔ 평)
  - 화학성 데이터 직접 입력
  - 비료사용처방 체험하기 결과 표출
 
- **주요함수**:
```javascript
// experience.js
calculateFertilizer(stage, n, p, k, qy, baseData) // 복합비료 계산
```
```python
# fertilizer/views.py
calculate_prescription_api(params)      # 비료처방 계산 API
```

### 5. 표준 비료사용량 처방
- **URL**: /fertilizer/standard/
- **목적**: 작물별 표준 비료사용량 조회 및 처방
- **주요기능**: 
  - 면적 단위 변환 (㎡ ↔ 평)
  - 표준 비료사용량 처방 결과 표출

- **주요함수**:
```javascript
// standard.js
window.updateResults = function()             // 실시간 비료 계산 업데이트
setPreFertilizer() / setPostFertilizer()     // 복합비료 선택
```
```python
# fertilizer/views.py
get_standard_data(crop_code, area, area_unit, prescription_method='1',
                      pre_n=0, pre_p=0, pre_k=0, pre_qy=20,
                      post_n=0, post_p=0, post_k=0, post_qy=20)   // 표준사용량 조회
standard_result(html_content)                                     // 복합비료 추천
```

## 기술 스택
### 1. 웹 크롤링
- 흙토람 (soil.rda.go.kr): 물처방·비료처방 데이터
- 농업날씨365 (weather.rda.go.kr): 215개 지점 강수량
- 날씨누리 (weather.go.kr): 단기 기상예보
- requests, BeautifulSoup 활용
  
### 2. 지도 시각화
- Leaflet: 동적 지도 표출 (물처방)
- OpenLayers: 정적/동적 지도 표출 (미래 기후데이터)
- GeoJSON: 행정구역 경계 (CTPRVN, SIG, EMD)

### 3. 데이터 처리
- gzip: 압축 파일 읽기
- CSV 파싱: Python 표준 라이브러리 활용
  
### 4. 주소 검색
- V-World 검색 2.0 API
- 검색 제한: 300건 (초과 시 상세 입력 요청)
- 페이지당 최대 1,000개, 최대 10페이지 조회(이론적으로 10000건까지 가능) 

## 주의사항

**메모리 제한**: 서버 배포 환경에서 메모리 한도를 초과하면 컨테이너가 강제 종료될 수 있음
```yaml
mem_limit: 800m        # 컨테이너 메모리 사용 한도
memswap_limit: 2.5g    # 스왑 포함 총 메모리 한도
```
- 스왑을 포함한 총 2.5GB까지 사용 가능하지만, 성능 저하 발생 가능
- RAM 800MB 초과 시 컨테이너가 강제 종료(OOM Killed)될 수 있음



