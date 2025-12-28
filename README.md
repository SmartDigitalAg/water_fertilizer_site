# 물처방 과제 : 노지 밭작물 비료 사용 및 물 사용 처방 프로그램 고도화
비료사용처방, 물사용처방을 제공하는 Django 기반 웹 서비스입니다.  

## 프로젝트 구조

```
soil_site_final/
├── fertilizer/                    # 비료 처방 
│   ├── migrations/
│   ├── static/
│   │   └── fertilizer/
│   │       ├── css/
│   │       │   ├── experience.css
│   │       │   ├── prescription.css
│   │       │   └── standard.css
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
