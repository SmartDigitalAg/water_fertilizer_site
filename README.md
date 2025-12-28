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
  - 주소 검색 (V-World API 2.0, 최대 300건 제한)
  - 생육단계별 물필요량 표출 (흙토람 크롤링-기존 18 작물유형)
  - 생육단계별 물필요량 표출 (신규 작물 추가-양배추)
  - 강수량 데이터 (농업날씨365 215개 지점)
  - 단기 기상예보 (날씨누리)
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
python# water/views.py
get_water_api(request)                    # 통합 API 엔드포인트
handle_slope_request(request)             # 경사도 데이터 조회
handle_rainfall_all_request(request)      # 전체 강수량 조회
handle_short_forecast_request(request)    # 단기예보 조회
```
   

### 2. 미래 기후데이터

### 3. 비료사용처방

### 4. 비료사용처방 체험하기

### 5. 표준 비료사용량 처방





