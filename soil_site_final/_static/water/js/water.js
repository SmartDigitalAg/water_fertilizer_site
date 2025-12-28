document.addEventListener('DOMContentLoaded', function() {
    const sidoSelect = document.getElementById('sido'), sggSelect = document.getElementById('sgg');
    const cropGbnSelect = document.getElementById('crop_gbn'), cropSelect = document.getElementById('crop');
    const examDayInput = document.getElementById('exam_day'), recommendedSpan = document.getElementById('recommended');
    const weatherSelect = document.getElementById('weather'), irrigationSelect = document.getElementById('irrigation');
    const areaInput = document.getElementById('area'), searchBtn = document.getElementById('search'), resetBtn = document.getElementById('reset');
    const resultDiv = document.getElementById('result'), addressInput = document.getElementById('address-input');
    const addressSearchBtn = document.getElementById('address-search-btn'), addressClearBtn = document.querySelector('.address-clear-btn');
    const modalBg = document.getElementById('modal-postcode-bg'), modalInput = document.getElementById('modal-postcode-input');
    const modalSearchBtn = document.querySelector('.modal-postcode-search-btn'), modalClearBtn = document.querySelector('.modal-postcode-clear-btn');
    const modalCloseBtn = document.querySelector('.modal-postcode-close'), modalResultList = document.getElementById('modal-postcode-result-list');
    const modalPagination = document.getElementById('modal-postcode-pagination');

    let recommendedDates = [], allowedRanges = [], plantingDatesData = {}, addressSearchResults = [], addressSearchTotal = 0;
    let selectedSidoCode = '', selectedSggCode = '', selectedSidoName = '', selectedSggName = '', selectedSigCode = '', selectedSigName = '', selectedFullAddress = '';
    let slopeMap = null, geoJsonLayer = null, sigLayer = null, emdLayer = null, geoJsonData = null, sigGeoJsonData = null, emdGeoJsonData = null, koreaGeometry = null;
    let currentMapScale = 'all', slopePointLayer = null, allSlopeData = [], navInfoControl = null, currentNav = { scale: 'all', sido: null, sgg: null, sggCode: null };
    let currentRainfallData = {}, currentRainfallAddress = '', isRainfallDataLoaded = false, growthStageRainfall = {}, auxiliaryIndicators = { recentSevenDays: 0, consecutiveDryDays: 0, postPlanting: 0 };
    let avgClimateData = [];

    const LOCATION_141 = ["강릉 안반덕이", "강진군 군동면", "거제시 거제면", "거창군 거창읍", "거창군 동변리", "거창군 주상면", "경산시 자인면", "고흥군 풍양면", "공주시 우성면", "광주시 목현동", "구례군 구례읍", "구미시 선산읍", "구미시 옥성면", "군산시 개정면", "군위군 소보면", "금산군 금성면", "김제시 부량면", "김포시 월곶면", "김해시 전하동", "나주시 금천면", "나주시 산포면", "남양주 진건읍", "남원시 운봉읍", "남원시 이백면", "남해군 이동면", "논산시 광석면", "대구시 북구", "동해시 북평동", "무안군 청계면", "무주군 무주읍", "밀양시 산내면", "밀양시 상남면", "보령시 주교면", "보성군 보성읍", "봉화군 봉성면", "봉화군 석포면", "봉화군 외삼리", "부산시 강서구", "부안군 계화면", "부여군 규암면", "사천시 송포동", "사천시 용현면", "삼척시 근덕면", "삼척시 미로면", "상주시 공성면", "상주시 외서면", "상주시 초산동", "서귀포 대정읍", "서귀포 덕수리", "서귀포 신효동", "서귀포 창천리", "서귀포 하원동", "성주군 대가면", "성주군 대천리", "수원시 서둔동", "순천시 주암면", "시흥시 하중동", "아산시 염치읍", "안동시 북후면", "안동시 송천동", "양양군 양양읍", "양주시 은현면", "양평군 양평읍", "여수시 주삼동", "여주시 상거동", "연천군 신서면", "영양군 대천리", "영양군 영양읍", "영월군 영월읍", "영주시 봉현면", "영주시 부석면", "영주시 안정로", "영주시 안풍리", "영주시 용산리", "영주시 평은면", "영천시 금호읍", "영천시 오미동", "예천군 예천읍", "옥천군 옥천읍", "옹진군 영흥면", "완주군 고산면", "완주군 반교리", "완주군 이서면", "용인시 처인구", "울주군 서생면", "울진군 매화면", "원주시 흥업면", "의성군 봉양면", "의성군 옥산면", "의성군 의성읍", "이천시 장호원", "이천시 중리동", "이천시 진암리", "인제군 인제읍", "임실군 신평면", "장성군 장성읍", "장수군 개정리", "장수군 장수읍", "장흥군 장흥읍", "정선군 신동읍", "정선군 임계면", "정선군 정선읍", "정읍시 정우면", "제주시 구좌읍", "제주시 금악리", "제주시 신엄리", "제주시 오등동", "제천시 봉양읍", "진안군 진안읍", "진주시 초전동", "진천군 진천읍", "창녕군 대지면", "천안시 성환읍", "천안시 직산읍", "청도군 각북면", "청도군 구라리", "청도군 이서면", "청송군 부남면", "청양군 청양읍", "청주시 남일면", "춘천시 신북읍", "충주시 안림동", "칠곡군 약목면", "태백 귀네미골", "태백시 매봉산", "태백시 황지동", "통영시 광도면", "평창군 운교리", "평창군 진부면", "포천시 영북면", "포항시 북구", "하동군 화개면", "합천군 용주면", "해남군 삼산면", "해남군 옥천면", "홍성군 홍성읍", "홍천군 자운리", "홍천군 화동리", "화성시 마도면", "화천군 화천읍", "횡성군 공근면"];
    const REGION_MAPPING = {"강원특별자치도": "강릉 안반덕이", "강원도": "강릉 안반덕이", "전라남도": "강진군 군동면", "전남": "강진군 군동면", "경상남도": "거제시 거제면", "경남": "거제시 거제면", "경상북도": "경산시 자인면", "경북": "경산시 자인면", "충청남도": "공주시 우성면", "충남": "공주시 우성면", "전북특별자치도": "김제시 부량면", "전라북도": "김제시 부량면", "전북": "김제시 부량면", "경기도": "김포시 월곶면", "경기": "김포시 월곶면", "대구광역시": "대구시 북구", "대구": "대구시 북구", "부산광역시": "부산시 강서구", "부산": "부산시 강서구", "제주특별자치도": "서귀포 대정읍", "제주도": "서귀포 대정읍", "제주": "서귀포 대정읍", "충청북도": "옥천군 옥천읍", "충북": "옥천군 옥천읍", "울산광역시": "울주군 서생면", "울산": "울주군 서생면", "인천광역시": "옹진군 영흥면", "인천": "옹진군 영흥면", "광주광역시": "강진군 군동면", "광주": "강진군 군동면", "대전광역시": "공주시 우성면", "대전": "공주시 우성면", "세종특별자치시": "공주시 우성면", "세종": "공주시 우성면", "서울특별시": "김포시 월곶면", "서울": "김포시 월곶면"};
    const SCALE_ZOOM = { all: 6.5, sido: 8.5, sgg: 10.5 };
    const SIDO_CODE_MAP = {'서울특별시': '11', '부산광역시': '26', '대구광역시': '27', '인천광역시': '28', '광주광역시': '29', '대전광역시': '30', '울산광역시': '31', '세종특별자치시': '36', '경기도': '41', '강원특별자치도': '51', '강원도': '51', '충청북도': '43', '충청남도': '44', '전북특별자치도': '52', '전라북도': '52', '전라남도': '46', '경상북도': '47', '경상남도': '48', '제주특별자치도': '50', '제주도': '50'};
    const sidoNormalizeMap = {"부산": "부산광역시", "대구": "대구광역시", "인천": "인천광역시", "광주": "광주광역시", "대전": "대전광역시", "울산": "울산광역시", "서울": "서울특별시", "세종": "세종특별자치시", "경기": "경기도", "강원": "강원특별자치도", "강원도": "강원특별자치도", "충북": "충청북도", "충남": "충청남도", "전북": "전북특별자치도", "전라북도": "전북특별자치도", "전남": "전라남도", "경북": "경상북도", "경남": "경상남도", "제주": "제주특별자치도", "제주도": "제주특별자치도"};

    function normalizeAddress(address) {
        if (!address) return address;
        const parts = address.trim().split(' ');
        if (parts.length === 0) return address;
        const firstPart = parts[0];
        if (sidoNormalizeMap[firstPart]) {
            parts[0] = sidoNormalizeMap[firstPart];
            console.log(`✅ 시도명 변환: ${firstPart} → ${parts[0]}`);
        }
        return parts.join(' ');
    }

    function findLocationFromAddress(address) {
        if (!address) return null;
        for (const location of LOCATION_141) {
            const parts = location.split(' ');
            if (parts.length >= 2) {
                const first = parts[0], second = parts[1];
                if (address.includes(first) && address.includes(second)) {
                    console.log(`✅ 141개 지점 매칭: ${location}`);
                    return location;
                }
            }
        }
        const addressParts = address.split(' ');
        if (addressParts.length > 0) {
            const sido = addressParts[0], mappedLocation = REGION_MAPPING[sido];
            if (mappedLocation) {
                console.log(`✅ 광역시/도 대표지점: ${sido} → ${mappedLocation}`);
                return mappedLocation;
            }
        }
        console.warn(`⚠️ 매칭되는 지점 없음: ${address}`);
        return null;
    }

    function calculateFAOPenmanMonteith(tmax, tmin, rhum, wspd, rsds) {
        const T = (tmax + tmin) / 2;
        const es_tmax = 0.6108 * Math.exp((17.27 * tmax) / (tmax + 237.3));
        const es_tmin = 0.6108 * Math.exp((17.27 * tmin) / (tmin + 237.3));
        const es = (es_tmax + es_tmin) / 2, ea = es * (rhum / 100), vpdValue = es - ea;
        const delta = 4098 * es / Math.pow(T + 237.3, 2), gamma = 0.0674, Rn = rsds, G = 0, u2 = wspd;
        const numerator = 0.408 * delta * (Rn - G) + gamma * (900 / (T + 273)) * u2 * vpdValue;
        const denominator = delta + gamma * (1 + 0.34 * u2);
        return { ETo: numerator / denominator, Rn, G, T, u2, es, ea, vpd: vpdValue, delta, gamma };
    }

    async function loadAvgClimateData() {
        if (avgClimateData.length > 0) {
            console.log('✅ 평균 기후 데이터 재사용');
            return avgClimateData;
        }
        try {
            const response = await fetch('/static/water/data/avg_weather_2022_2024.csv.gz');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text(), lines = text.trim().split('\n');
            avgClimateData = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = line.split(',');
                if (cols.length < 7) continue;
                const location = cols[0].trim(), dateStr = cols[1].trim();
                const hghst_Artmp = parseFloat(cols[2].trim()), lowst_Artmp = parseFloat(cols[3].trim());
                const hum = parseFloat(cols[4].trim()), wind = parseFloat(cols[5].trim()), srqty = parseFloat(cols[6].trim());
                if (dateStr) {
                    let month, day, dateParts = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
                    if (dateParts) { month = parseInt(dateParts[1]); day = parseInt(dateParts[2]); }
                    else {
                        dateParts = dateStr.match(/(\d{1,2})-(\d{1,2})/);
                        if (dateParts) { month = parseInt(dateParts[1]); day = parseInt(dateParts[2]); }
                    }
                    if (month && day) {
                        avgClimateData.push({location, date: dateStr, month, day, tmax: isNaN(hghst_Artmp) ? null : hghst_Artmp, tmin: isNaN(lowst_Artmp) ? null : lowst_Artmp, rhum: isNaN(hum) ? null : hum, wspd: isNaN(wind) ? null : wind, rsds: isNaN(srqty) ? null : srqty});
                    }
                }
            }
            console.log(`✅ 평균 기후 데이터 로드: ${avgClimateData.length}개`);
            return avgClimateData;
        } catch (e) {
            console.error('❌ 평균 기후 데이터 로드 오류:', e);
            alert('기후 데이터 파일을 불러올 수 없습니다: ' + e.message);
            return [];
        }
    }

    function getClimateDataByDateAndLocation(month, day, address) {
        const location = findLocationFromAddress(address);
        if (!location) { console.warn('⚠️ 지점을 찾을 수 없습니다. 주소:', address); return null; }
        const results = avgClimateData.filter(d => d.location === location && d.month === month && d.day === day);
        if (results.length === 0) { console.warn(`⚠️ 데이터 없음: ${location}, ${month}월 ${day}일`); return null; }
        const data = results[0];
        return {month: data.month, day: data.day, tmax: data.tmax, tmin: data.tmin, rhum: data.rhum, wspd: data.wspd, rsds: data.rsds};
    }

    function renderClimateDataSearch() {
        const currentDate = new Date(), currentMonth = currentDate.getMonth() + 1, currentDay = currentDate.getDate();
        return `<div style="margin: 40px 0 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;"><h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">기후 데이터 조회</h3><div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;"><div style="display: flex; align-items: center; gap: 10px;"><label style="font-weight: 600; color: #555; min-width: 30px;">월</label><select id="climate-month" style="padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; min-width: 80px; background: white;">${Array.from({length: 12}, (_, i) => {const month = i + 1; return `<option value="${month}" ${month === currentMonth ? 'selected' : ''}>${month}월</option>`;}).join('')}</select></div><div style="display: flex; align-items: center; gap: 10px;"><label style="font-weight: 600; color: #555; min-width: 30px;">일</label><select id="climate-day" style="padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; min-width: 80px; background: white;">${Array.from({length: 31}, (_, i) => {const day = i + 1; return `<option value="${day}" ${day === currentDay ? 'selected' : ''}>${day}일</option>`;}).join('')}</select></div><button id="climate-search-btn" style="padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">데이터 불러오기</button></div><div id="climate-result-box" style="display: none;"><h4 style="margin: 20px 0 15px 0; padding: 10px; background: #e7f3ff; border-left: 4px solid #007bff; color: #0056b3; font-size: 15px;"><span id="climate-result-title"></span></h4><table style="width: 100%; border-collapse: collapse; background: white; margin-bottom: 20px;"><thead><tr style="background: #435d7d;"><th colspan="2" style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: white; font-size: 14px;">기후요소</th></tr></thead><tbody style="background: #f0f8ff;"><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa; width: 40%;">상대습도 (rhum)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="climate-rhum">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">일사량 (rsds)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="climate-rsds">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">최고기온 (tmax)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="climate-tmax">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">최저기온 (tmin)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="climate-tmin">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">풍속 (wspd)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="climate-wspd">-</td></tr></tbody></table><table style="width: 100%; border-collapse: collapse; background: white;"><thead><tr style="background: #435d7d;"><th colspan="2" style="border: 1px solid #dee2e6; padding: 12px; text-align: center; color: white; font-size: 14px;">FAO Penman-Monteith 계산 결과</th></tr></thead><tbody style="background: #e8f4f8;"><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa; width: 40%;">ETo (기준증발산량)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px; font-weight: 700; color: #0056b3;" id="fao-eto">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">Rn (순복사량)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="fao-rn">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">G (토양열류속)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="fao-g">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">T (일평균기온)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="fao-t">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">u2 (풍속)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="fao-u2">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">es (포화증기압)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="fao-es">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">ea (실제증기압)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="fao-ea">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">es - ea (포화증기압차)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="fao-vpd">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">Δ (포화증기압곡선 기울기)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="fao-delta">-</td></tr><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: 600; background: #f8f9fa;">γ (건습계상수)</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 15px;" id="fao-gamma">-</td></tr></tbody></table></div></div>`;
    }

    function bindClimateSearchEvents() {
        const searchBtn = document.getElementById('climate-search-btn');
        const monthSelect = document.getElementById('climate-month'), daySelect = document.getElementById('climate-day');
        if (searchBtn) {
            searchBtn.addEventListener('click', async () => {
                const month = parseInt(monthSelect.value), day = parseInt(daySelect.value);
                await loadAvgClimateData();
                const data = getClimateDataByDateAndLocation(month, day, selectedFullAddress);
                const resultBox = document.getElementById('climate-result-box'), resultTitle = document.getElementById('climate-result-title');
                if (data) {
                    resultTitle.textContent = `${month}월 ${day}일 기후 데이터 조회 결과`;
                    document.getElementById('climate-rhum').textContent = data.rhum.toFixed(2);
                    document.getElementById('climate-rsds').textContent = data.rsds.toFixed(2) + ' MJ m⁻² day⁻¹';
                    document.getElementById('climate-tmax').textContent = data.tmax.toFixed(1) + ' °C';
                    document.getElementById('climate-tmin').textContent = data.tmin.toFixed(1) + ' °C';
                    document.getElementById('climate-wspd').textContent = data.wspd.toFixed(4) + ' m s⁻¹';
                    const fao = calculateFAOPenmanMonteith(data.tmax, data.tmin, data.rhum, data.wspd, data.rsds);
                    document.getElementById('fao-eto').textContent = fao.ETo.toFixed(4) + ' mm day⁻¹';
                    document.getElementById('fao-rn').textContent = fao.Rn.toFixed(2) + ' MJ m⁻² day⁻¹';
                    document.getElementById('fao-g').textContent = fao.G.toFixed(4) + ' MJ m⁻² day⁻¹';
                    document.getElementById('fao-t').textContent = fao.T.toFixed(2) + ' °C';
                    document.getElementById('fao-u2').textContent = fao.u2.toFixed(4) + ' m s⁻¹';
                    document.getElementById('fao-es').textContent = fao.es.toFixed(4) + ' kPa';
                    document.getElementById('fao-ea').textContent = fao.ea.toFixed(4) + ' kPa';
                    document.getElementById('fao-vpd').textContent = fao.vpd.toFixed(4) + ' kPa';
                    document.getElementById('fao-delta').textContent = fao.delta.toFixed(4) + ' kPa °C⁻¹';
                    document.getElementById('fao-gamma').textContent = fao.gamma.toFixed(4) + ' kPa °C⁻¹';
                    resultBox.style.display = 'block';
                } else { alert('해당 날짜의 데이터가 없습니다.'); resultBox.style.display = 'none'; }
            });
            searchBtn.addEventListener('mouseover', () => searchBtn.style.background = '#0056b3');
            searchBtn.addEventListener('mouseout', () => searchBtn.style.background = '#007bff');
        }
    }

    function colorForSlope(v) {
        const p = v * 100;
        return p < 2 ? '#D4E7D7' : p < 7 ? '#FFFF00' : p < 15 ? '#FCD37F' : p < 30 ? '#FFAA00' : p < 60 ? '#E60000' : '#730000';
    }

    function isPointInPolygon(point, polygon) {
        const x = point[1], y = point[0];
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1], xj = polygon[j][0], yj = polygon[j][1];
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    }

    function isPointInGeometry(lat, lon, geometry) {
        if (!geometry) return true;
        if (geometry.type === 'Polygon') return isPointInPolygon([lat, lon], geometry.coordinates[0]);
        if (geometry.type === 'MultiPolygon') return geometry.coordinates.some(polygon => isPointInPolygon([lat, lon], polygon[0]));
        return true;
    }

    function mergeAllGeometries(features) {
        const allCoordinates = [];
        features.forEach(f => {
            const g = f.geometry;
            if (g.type === 'Polygon') allCoordinates.push(...g.coordinates);
            else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => allCoordinates.push(...p));
        });
        return { type: 'MultiPolygon', coordinates: allCoordinates.map(c => [c]) };
    }

    function findSigCodeFromGeoJson(sidoCode, sggCode, fullAddress) {
        if (!sigGeoJsonData) return null;
        const parts = fullAddress.split(' ').filter(p => p.trim()), fullSggCode = sidoCode + sggCode;
        let sggFeature = sigGeoJsonData.features.find(f => f.properties.SIG_CD === fullSggCode);
        if (!sggFeature && parts.length >= 2) {
            const candidates = [], sameSido = sigGeoJsonData.features.filter(f => f.properties.SIG_CD && f.properties.SIG_CD.startsWith(sidoCode));
            for (let i = 1; i < parts.length; i++) {
                const term = parts.slice(1, i + 1).join(' ');
                sameSido.forEach(f => {
                    const nm = f.properties.SIG_KOR_NM;
                    if (nm && nm.includes(term)) candidates.push({ feature: f, matchLength: term.length, sigKorNm: nm });
                });
            }
            if (candidates.length > 0) {
                candidates.sort((a, b) => b.matchLength - a.matchLength);
                sggFeature = candidates[0].feature;
                console.log(`주소 부분 매칭: ${candidates[0].sigKorNm}`);
            }
        }
        return sggFeature ? { SIG_CD: sggFeature.properties.SIG_CD, SIG_KOR_NM: sggFeature.properties.SIG_KOR_NM } : null;
    }

    function addNavInfoControl(map) {
        const ctrl = L.control({ position: 'topleft' });
        ctrl.onAdd = function() {
            const div = L.DomUtil.create('div', 'map-nav-info');
            div.style.display = 'none';
            div.innerHTML = `<div class="breadcrumb"><span data-level="all" class="crumb active">전체</span><span class="sep">›</span><span data-level="sido" class="crumb disabled">시/도</span><span class="sep">›</span><span data-level="sgg" class="crumb disabled">시/군/구</span></div>`;
            L.DomEvent.disableClickPropagation(div);
            return div;
        };
        ctrl.addTo(map);
        return ctrl;
    }

    function updateNavUI() {
        const navInfo = document.querySelector('.map-nav-info');
        if (!navInfo) return;
        if (currentNav.scale === 'all') { navInfo.style.display = 'none'; return; }
        navInfo.style.display = 'block';
        const allCrumb = navInfo.querySelector('[data-level="all"]'), sidoCrumb = navInfo.querySelector('[data-level="sido"]'), sggCrumb = navInfo.querySelector('[data-level="sgg"]');
        allCrumb.classList.remove('active', 'disabled'); sidoCrumb.classList.remove('active', 'disabled'); sggCrumb.classList.remove('active', 'disabled');
        if (currentNav.scale === 'sido') {
            allCrumb.classList.remove('active'); sidoCrumb.textContent = currentNav.sido || '시/도'; sidoCrumb.classList.add('active');
            sggCrumb.classList.add('disabled'); sggCrumb.textContent = '시/군/구';
        } else if (currentNav.scale === 'sgg') {
            allCrumb.classList.remove('active'); sidoCrumb.textContent = currentNav.sido || '시/도';
            sggCrumb.textContent = currentNav.sgg || '시/군/구'; sggCrumb.classList.add('active');
        }
    }

    async function checkAvailableCropCategories(sidoCode) {
        const available = new Set();
        await Promise.all(Object.keys(cropCategories).map(async (code) => {
            try {
                const data = await callWaterAPI('crops', {sido_code: sidoCode, crop_gbn: code});
                if (data.success && data.data && Object.keys(data.data).length > 0) available.add(code);
            } catch (e) { console.log(`작물분류 ${code} 확인 오류:`, e); }
        }));
        return available;
    }

    function updateCropCategoryOptions(available) {
        while (cropGbnSelect.children.length > 1) cropGbnSelect.removeChild(cropGbnSelect.lastChild);
        for (const [code, name] of Object.entries(cropCategories)) {
            if (available.has(code)) {
                const opt = document.createElement('option');
                opt.value = code; opt.textContent = name; cropGbnSelect.appendChild(opt);
            }
        }
        if (available.size === 0) {
            const opt = document.createElement('option');
            opt.value = ''; opt.textContent = '해당 지역에 작물 정보가 없습니다'; opt.disabled = true; cropGbnSelect.appendChild(opt);
        }
    }

    function extractRegionFromAddress(addr) {
        const parts = addr.split(' ').filter(p => p.trim());
        return parts.length >= 2 ? {sido: parts[0], sgg: parts[1]} : {sido: null, sgg: null};
    }

    async function getSidoSggCodes(sidoName, sggName, fullAddress) {
        return new Promise(async (resolve, reject) => {
            const sidoMapping = {"강원특별자치도": "51", "강원도": "51", "경기도": "41", "경상남도": "48", "경남": "48", "경상북도": "47", "경북": "47", "광주광역시": "29", "광주": "29", "대구광역시": "27", "대구": "27", "대전광역시": "30", "대전": "30", "부산광역시": "26", "부산": "26", "서울특별시": "11", "서울": "11", "세종특별자치시": "36", "세종": "36", "울산광역시": "31", "울산": "31", "인천광역시": "28", "인천": "28", "전라남도": "46", "전남": "46", "전북특별자치도": "52", "전라북도": "52", "전북": "52", "제주특별자치도": "50", "제주도": "50", "충청남도": "44", "충남": "44", "충청북도": "43", "충북": "43"};
            const metropolitanCities = ["광주광역시", "광주", "대구광역시", "대구", "대전광역시", "대전", "부산광역시", "부산", "서울특별시", "서울", "울산광역시", "울산", "인천광역시", "인천"];
            const metropolitanGuns = {"대구광역시": ["군위군", "달성군"], "대구": ["군위군", "달성군"], "부산광역시": ["기장군"], "부산": ["기장군"], "울산광역시": ["울주군"], "울산": ["울주군"], "인천광역시": ["강화군", "옹진군"], "인천": ["강화군", "옹진군"]};
            const sidoCode = sidoMapping[sidoName];
            if (!sidoCode) return reject(new Error('지원하지 않는 지역: ' + sidoName));
            selectedSidoCode = sidoCode; selectedSidoName = sidoName; selectedFullAddress = fullAddress;
            if (currentRainfallAddress !== fullAddress) {
                currentRainfallData = {}; isRainfallDataLoaded = false; growthStageRainfall = {};
                auxiliaryIndicators = { recentSevenDays: 0, consecutiveDryDays: 0, postPlanting: 0 };
                currentRainfallAddress = ''; console.log('🔄 새 주소 - 강수량 초기화');
            }
            try {
                const isMetropolitan = metropolitanCities.includes(sidoName);
                if (isMetropolitan) {
                    const guns = metropolitanGuns[sidoName] || [];
                    let isGun = false;
                    for (const gun of guns) {
                        if (fullAddress.includes(gun)) { isGun = true; sggName = gun; break; }
                    }
                    if (!isGun) {
                        selectedSggCode = '000'; selectedSggName = sidoName;
                        if (!sigGeoJsonData) await loadSigGeoJson();
                        const sigInfo = findSigCodeFromGeoJson(sidoCode, '000', fullAddress);
                        if (sigInfo) { selectedSigCode = sigInfo.SIG_CD; selectedSigName = sigInfo.SIG_KOR_NM; console.log(`✅ SIG: ${selectedSigName} (${selectedSigCode})`); }
                        cropGbnSelect.value = ''; cropSelect.innerHTML = '<option value="">작물</option>'; resetPlantingInfo();
                        cropGbnSelect.disabled = true;
                        const available = await checkAvailableCropCategories(sidoCode);
                        updateCropCategoryOptions(available); cropGbnSelect.disabled = false;
                        console.log(`✅ 광역시 직할: ${sidoName}(${sidoCode}) → 000`);
                        resolve({sidoCode, sggCode: '000', sidoName, sggName: sidoName});
                        return;
                    }
                }
                const data = await callWaterAPI('sgg', {sido_code: sidoCode});
                if (data.success) {
                    const sggCode = findSggCode(data.data, sggName, isMetropolitan);
                    if (sggCode) {
                        selectedSggCode = sggCode; selectedSggName = sggName;
                        if (!sigGeoJsonData) await loadSigGeoJson();
                        const sigInfo = findSigCodeFromGeoJson(sidoCode, sggCode, fullAddress);
                        if (sigInfo) { selectedSigCode = sigInfo.SIG_CD; selectedSigName = sigInfo.SIG_KOR_NM; console.log(`✅ SIG: ${selectedSigName} (${selectedSigCode})`); }
                        else console.warn('⚠️ SIG 매칭 실패');
                        cropGbnSelect.value = ''; cropSelect.innerHTML = '<option value="">작물</option>'; resetPlantingInfo();
                        cropGbnSelect.disabled = true;
                        const available = await checkAvailableCropCategories(sidoCode);
                        updateCropCategoryOptions(available); cropGbnSelect.disabled = false;
                        console.log(`지역: ${sidoName}(${sidoCode}) ${sggName}(${sggCode})`);
                        resolve({sidoCode, sggCode, sidoName, sggName});
                    } else reject(new Error('시군구를 찾을 수 없음: ' + sggName));
                } else reject(new Error('시군구 조회 실패'));
            } catch (e) {
                console.error('작물분류 확인 오류:', e);
                updateCropCategoryOptions(new Set(Object.keys(cropCategories)));
                cropGbnSelect.disabled = false; reject(e);
            }
        });
    }

    function findSggCode(sggData, sggName, isMetropolitan = false) {
        if (isMetropolitan) {
            for (const [name, code] of Object.entries(sggData)) {
                if (name.includes('군') && (name === sggName || name.includes(sggName) || sggName.includes(name))) return code;
            }
            return '000';
        }
        for (const [name, code] of Object.entries(sggData)) if (name === sggName) return code;
        for (const [name, code] of Object.entries(sggData)) if (name.includes(sggName) || sggName.includes(name)) return code;
        return null;
    }

    function processAddressSearchResult(query) {
        return new Promise((resolve, reject) => {
            const params = new URLSearchParams({q: query, page: 1, per_page: 2000, list: 1});
            fetch(`/water/get_latlon/?${params}`, {method: 'GET', headers: {'Content-Type': 'application/json'}})
            .then(r => r.ok ? r.json() : Promise.reject(`HTTP error! status: ${r.status}`))
            .then(data => resolve(data.items || []))
            .catch(e => { console.error('Address search error:', e); reject(e); });
        });
    }

    function handleAddressSearch(addressValue) {
        return new Promise((resolve, reject) => {
            const normalizedAddress = normalizeAddress(addressValue);
            processAddressSearchResult(normalizedAddress)
            .then(results => {
                if (results.length === 0) { document.getElementById('latlon-inline').textContent = ''; openAddressModal(addressValue); reject(new Error('검색 결과 없음')); }
                else if (results.length === 1) {
                    const addr = results[0].address, parts = extractRegionFromAddress(addr);
                    const lat = results[0].lat || '', lon = results[0].lon || '';
                    if (parts.sido && parts.sgg) {
                        addressInput.value = addr;
                        if (lat && lon) {
                            document.getElementById('latlon-inline').innerHTML = `<b>위도</b>: ${lat} &nbsp; <b>경도</b>: ${lon}`;
                            window.currentLatLon = {lat, lon};
                        } else { document.getElementById('latlon-inline').textContent = ''; window.currentLatLon = null; }
                        getSidoSggCodes(parts.sido, parts.sgg, addr).then(() => resolve({address: addr, region: parts, lat, lon})).catch(reject);
                    } else reject(new Error('지역 정보 추출 실패'));
                } else { document.getElementById('latlon-inline').textContent = ''; window.currentLatLon = null; openAddressModal(addressValue); reject(new Error('여러 주소 검색됨')); }
            }).catch(reject);
        });
    }

    function openAddressModal(q = '') {
        modalBg.style.display = 'block'; modalInput.value = q; modalInput.focus();
        modalResultList.innerHTML = ''; modalPagination.innerHTML = '';
        addressSearchResults = []; addressSearchTotal = 0;
        if (q.trim()) doAddressSearch();
    }

    function closeAddressModal() { modalBg.style.display = 'none'; }

    function doAddressSearch() {
        const q = modalInput.value.trim();
        if (!q) { modalInput.focus(); return; }
        const normalizedQuery = normalizeAddress(q);
        modalResultList.innerHTML = '<li class="no-result">검색 중...</li>';
        const params = new URLSearchParams({q: normalizedQuery, page: 1, per_page: 2000, list: 1});
        fetch(`/water/get_latlon/?${params}`, {method: 'GET', headers: {'Content-Type': 'application/json'}})
        .then(r => r.ok ? r.json() : Promise.reject(`HTTP error! ${r.status}`))
        .then(data => { addressSearchResults = data.items || []; addressSearchTotal = data.total || addressSearchResults.length; renderAddressList(1); })
        .catch(e => { console.error('Address search error:', e); modalResultList.innerHTML = '<li class="no-result">오류 발생</li>'; });
    }

    function renderAddressList(page) {
        let html = '';
        const start = (page - 1) * 10, items = addressSearchResults.slice(start, start + 10);
        if (addressSearchTotal >= 300) html = '<li class="too-many-result">검색결과가 너무 많습니다.<br>더 상세한 주소를 입력하세요</li>';
        else if (items.length === 0) html = '<li class="no-result">검색 결과 없음</li>';
        else { items.sort((a, b) => a.address.localeCompare(b.address, 'ko')); items.forEach(a => { html += `<li data-address="${a.address.replace(/"/g, '&quot;')}">${a.address}</li>`; }); }
        modalResultList.innerHTML = html;
        if (addressSearchTotal > 10) {
            const maxPage = Math.ceil(addressSearchTotal / 10);
            let prevBtn = page > 1 ? `<button class="modal-page-btn" data-page="${page-1}" style="width:58px;">이전</button>` : `<button class="modal-page-btn" style="width:58px; visibility:hidden;">이전</button>`;
            let nextBtn = page < maxPage ? `<button class="modal-page-btn" data-page="${page+1}" style="width:58px;">다음</button>` : `<button class="modal-page-btn" style="width:58px; visibility:hidden;">다음</button>`;
            modalPagination.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; gap:5px; padding:7px 0;"><div style="flex:0 0 58px; display:flex; justify-content:flex-end;">${prevBtn}</div><div style="flex:0 0 56px; text-align:center; font-size:0.98em;">${page}/${maxPage}</div><div style="flex:0 0 58px; display:flex; justify-content:flex-start;">${nextBtn}</div></div>`;
        }
    }

    addressSearchBtn?.addEventListener('click', () => openAddressModal(addressInput.value.trim()));
    addressClearBtn?.addEventListener('click', () => {addressInput.value = ''; addressInput.focus();});
    modalClearBtn?.addEventListener('click', () => {modalInput.value = ''; modalInput.focus();});
    modalCloseBtn?.addEventListener('click', closeAddressModal);
    modalBg?.addEventListener('click', (e) => {if (e.target === modalBg) closeAddressModal();});
    document.addEventListener('keydown', (e) => {if (e.key === 'Escape') closeAddressModal();});
    modalSearchBtn?.addEventListener('click', (e) => {e.preventDefault(); doAddressSearch();});
    modalInput?.addEventListener('keypress', (e) => {if (e.which === 13) {doAddressSearch(); return false;}});
    modalPagination?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-page-btn')) {
            const page = parseInt(e.target.dataset.page);
            if (page > 0) renderAddressList(page);
        }
    });
    modalResultList?.addEventListener('click', (e) => {
        if (e.target.dataset.address) {
            const addr = e.target.dataset.address, parts = extractRegionFromAddress(addr);
            const selectedItem = addressSearchResults.find(item => item.address === addr);
            const lat = selectedItem?.lat || '', lon = selectedItem?.lon || '';
            if (parts.sido && parts.sgg) {
                addressInput.value = addr;
                if (lat && lon) { document.getElementById('latlon-inline').innerHTML = `<b>위도</b>: ${lat} &nbsp; <b>경도</b>: ${lon}`; window.currentLatLon = {lat, lon}; }
                else { document.getElementById('latlon-inline').textContent = ''; window.currentLatLon = null; }
                getSidoSggCodes(parts.sido, parts.sgg, addr).then(() => { closeAddressModal(); addressInput.focus(); console.log('주소:', addr); }).catch(e => alert(e.message));
            } else alert('지역 정보 추출 실패');
        }
    });
    document.addEventListener('click', (e) => {
        const crumb = e.target.closest('.map-nav-info .crumb');
        if (crumb && !crumb.classList.contains('disabled')) {
            const level = crumb.dataset.level;
            if (level === 'all') changeMapScale('all');
            else if (level === 'sido' && currentNav.sido) changeMapScale('sido', currentNav.sido);
            else if (level === 'sgg' && currentNav.sgg) changeMapScale('sgg', currentNav.sido, currentNav.sggCode);
        }
    });

    function fetchSlopeData(lat, lon) {
        return new Promise((resolve, reject) => {
            if (!lat || !lon) { reject(new Error('위도/경도 없음')); return; }
            const fd = new FormData();
            fd.append('mode', 'slope'); fd.append('lat', lat); fd.append('lon', lon);
            fetch('/water/api/', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                if (data.success) { console.log(`✅ 경사도: ${data.slope_percent}%`); resolve(data); }
                else { console.warn('⚠️ 경사도 조회 실패:', data.error); reject(new Error(data.error)); }
            })
            .catch(e => { console.error('❌ 경사도 조회 오류:', e); reject(e); });
        });
    }

    function initializeSelects() {
        weatherSelect.value = '3'; irrigationSelect.value = '02'; areaInput.value = '1000'; cropGbnSelect.disabled = true;
        areaInput.addEventListener('input', function() {this.value = this.value.replace(/[^0-9]/g, '');});
    }

    function callWaterAPI(mode, params) {
        const fd = new FormData(); fd.append('mode', mode);
        for (const [k, v] of Object.entries(params)) fd.append(k, v);
        return fetch('/water/api/', {method: 'POST', body: fd}).then(r => r.json());
    }

    cropGbnSelect?.addEventListener('change', function() {
        const gbn = this.value; cropSelect.innerHTML = '<option value="">작물</option>'; resetPlantingInfo();
        if (gbn && selectedSidoCode) loadCrops(selectedSidoCode, gbn);
    });

    function loadCrops(sidoCode, gbn) {
        callWaterAPI('crops', {sido_code: sidoCode, crop_gbn: gbn})
        .then(data => {
            if (data.success) {
                for (const [name, code] of Object.entries(data.data)) {
                    const opt = document.createElement('option');
                    opt.value = code; opt.textContent = name; cropSelect.appendChild(opt);
                }
                if (gbn === '02') {
                    const cabbageOption = document.createElement('option');
                    cabbageOption.value = 'CABBAGE_CUSTOM'; cabbageOption.textContent = '양배추'; cropSelect.appendChild(cabbageOption);
                }
            } else alert('작물 조회 실패: ' + data.error);
        }).catch(() => alert('작물 조회 오류'));
    }

    cropSelect?.addEventListener('change', function() {
        const code = this.value; resetPlantingInfo();
        if (code && selectedSidoCode) loadPlantingDates(selectedSidoCode, code);
    });

    function loadPlantingDates(sidoCode, cropCode) {
        if (cropCode === 'CABBAGE_CUSTOM') {
            recommendedDates = ['7월 1일']; plantingDatesData = { '7월 1일': 'CABBAGE_TERM_001' };
            recommendedSpan.textContent = `권장 파종·정식시기: ${recommendedDates.join(', ')}`;
            calculateDateRanges(); setDateConstraints();
            const firstRecommended = parseDateString(recommendedDates[0]);
            if (firstRecommended) examDayInput.value = firstRecommended.toISOString().split('T')[0];
            return;
        }
        callWaterAPI('planting', {sido_code: sidoCode, crop_code: cropCode})
        .then(data => {
            if (data.success) {
                recommendedDates = data.recommended_dates || Object.keys(data.data); plantingDatesData = data.data || {};
                if (recommendedDates.length > 0) {
                    recommendedSpan.textContent = `권장 파종·정식시기: ${recommendedDates.join(', ')}`;
                    calculateDateRanges(); setDateConstraints();
                    const firstRecommended = parseDateString(recommendedDates[0]);
                    if (firstRecommended) examDayInput.value = firstRecommended.toISOString().split('T')[0];
                } else recommendedSpan.textContent = '권장 파종·정식시기: 정보 없음';
            } else recommendedSpan.textContent = '권장 파종·정식시기: 조회 실패';
        }).catch(() => {recommendedSpan.textContent = '권장 파종·정식시기: 조회 오류';});
    }

    function parseDateString(str) {
        if (str && str.includes('월') && str.includes('일')) {
            const m = str.match(/(\d+)월/), d = str.match(/(\d+)일/);
            if (m && d) return new Date(2025, parseInt(m[1]) - 1, parseInt(d[1]), 12, 0, 0);
        }
        return null;
    }

    function calculateDateRanges() {
        allowedRanges = [];
        for (const str of recommendedDates) {
            const parsed = parseDateString(str);
            if (parsed) {
                const y = parsed.getFullYear(), m = parsed.getMonth(), d = parsed.getDate();
                allowedRanges.push({min: new Date(y, m, d - 10), max: new Date(y, m, d + 10), recommended: str, recommendedDate: parsed});
            }
        }
        updateDateRangeInfo();
    }

    function updateDateRangeInfo() {
        const info = document.getElementById('date-range-info'), periods = document.getElementById('available-periods');
        if (allowedRanges.length > 0) {
            const texts = allowedRanges.map(r => {
                const minStr = `${(r.min.getMonth() + 1).toString().padStart(2, '0')}/${r.min.getDate().toString().padStart(2, '0')}`;
                const maxStr = `${(r.max.getMonth() + 1).toString().padStart(2, '0')}/${r.max.getDate().toString().padStart(2, '0')}`;
                return `${minStr} ~ ${maxStr}`;
            });
            periods.textContent = `선택 가능 기간: ${texts.join(', ')}`; info.style.display = 'block';
        } else info.style.display = 'none';
    }

    function setDateConstraints() {
        if (allowedRanges.length > 0) {
            if (allowedRanges.length === 1) {
                const minDate = new Date(allowedRanges[0].min); minDate.setDate(minDate.getDate() + 1);
                examDayInput.min = minDate.toISOString().split('T')[0];
                const maxDate = new Date(allowedRanges[0].max); maxDate.setDate(maxDate.getDate() + 1);
                examDayInput.max = maxDate.toISOString().split('T')[0];
            } else {
                const overallMin = new Date(Math.min(...allowedRanges.map(r => r.min)));
                const overallMax = new Date(Math.max(...allowedRanges.map(r => r.max)));
                overallMin.setDate(overallMin.getDate() + 1); overallMax.setDate(overallMax.getDate() + 1);
                examDayInput.min = overallMin.toISOString().split('T')[0]; examDayInput.max = overallMax.toISOString().split('T')[0];
            }
        }
    }

    function isDateAllowed(selectedDate) {
        if (allowedRanges.length === 0) return true;
        const sel = new Date(selectedDate + 'T00:00:00');
        for (const r of allowedRanges) if (sel >= r.min && sel <= r.max) return true;
        return false;
    }

    function getMatchingRecommendedDate(selectedDate) {
        const sel = new Date(selectedDate + 'T00:00:00');
        for (const r of allowedRanges) if (sel >= r.min && sel <= r.max) return r.recommended;
        return recommendedDates[0] || '';
    }

    examDayInput?.addEventListener('change', function() {
        const sel = this.value;
        if (sel && !isDateAllowed(sel)) {
            alert('선택된 날짜가 권장 파종·정식시기 범위(±10일)를 벗어남');
            if (allowedRanges[0]?.recommendedDate) this.value = allowedRanges[0].recommendedDate.toISOString().split('T')[0];
        }
    });

    function proceedWithSearch() {
        if (!selectedSidoCode || !selectedSggCode) { alert('올바른 주소 선택'); searchBtn.disabled = false; searchBtn.innerHTML = '<span class="icon"></span>검색'; return; }
        const gbn = cropGbnSelect?.value, gbnName = cropGbnSelect?.options[cropGbnSelect.selectedIndex]?.text;
        const code = cropSelect?.value, name = cropSelect?.options[cropSelect.selectedIndex]?.text;
        if (!gbn || !code || !examDayInput?.value || !weatherSelect?.value || !irrigationSelect?.value || !areaInput?.value || parseInt(areaInput.value) <= 0) {
            alert('모든 정보를 올바르게 입력'); searchBtn.disabled = false; searchBtn.innerHTML = '<span class="icon"></span>검색'; return;
        }
        if (!isDateAllowed(examDayInput.value)) { alert('선택된 날짜가 허용 범위 벗어남'); searchBtn.disabled = false; searchBtn.innerHTML = '<span class="icon"></span>검색'; return; }
        const matching = getMatchingRecommendedDate(examDayInput.value), termCode = plantingDatesData[matching] || '';
        searchBtn.innerHTML = '<span class="icon"></span>검색 중...';
        executeSearch({sido_code: selectedSidoCode, sido_name: selectedSidoName, sgg_code: selectedSggCode, sgg_name: selectedSggName, crop_gbn: gbn, crop_gbn_name: gbnName, crop_code: code, crop_name: name, planting_date: examDayInput.value, recommended_date: matching, planting_term_code: termCode, weather_period: weatherSelect.value, irrigation_code: irrigationSelect.value, irrigation_name: irrigationSelect.options[irrigationSelect.selectedIndex].text, area: areaInput.value, address: addressInput.value});
    }

    searchBtn?.addEventListener('click', function() {
        const addr = addressInput?.value?.trim();
        if (!addr) { alert('주소 입력'); return; }
        if (selectedSidoCode && selectedSggCode && addressInput.value.includes(selectedSidoName) && addressInput.value.includes(selectedSggName)) {
            proceedWithSearch(); return;
        }
        searchBtn.disabled = true; searchBtn.innerHTML = '<span class="icon"></span>주소 확인 중...';
        handleAddressSearch(addr).then(() => setTimeout(() => proceedWithSearch(), 500)).catch(e => {
            console.log('주소 검색:', e.message); searchBtn.disabled = false; searchBtn.innerHTML = '<span class="icon"></span>검색';
        });
    });

    async function calculateCabbageWaterRequirement(startDate, area, address) {
        await loadAvgClimateData();
        const formatDate = (date) => {
            const month = String(date.getMonth() + 1).padStart(2, '0'), day = String(date.getDate()).padStart(2, '0');
            return `${month}/${day}`;
        };
        const stages = [{name: '유묘기', days: 40, kc: 0.7}, {name: '경엽신장기', days: 50, kc: 1.05}, {name: '결구기', days: 15, kc: 0.95}];
        const results = [];
        let currentDate = new Date(startDate);
        for (const stage of stages) {
            let stageWaterNeed = 0;
            const stageStart = new Date(currentDate);
            for (let i = 0; i < stage.days; i++) {
                const month = currentDate.getMonth() + 1, day = currentDate.getDate();
                const climateData = getClimateDataByDateAndLocation(month, day, address);
                if (climateData) {
                    const fao = calculateFAOPenmanMonteith(climateData.tmax, climateData.tmin, climateData.rhum, climateData.wspd, climateData.rsds);
                    stageWaterNeed += fao.ETo * stage.kc;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            const stageEnd = new Date(currentDate);
            stageEnd.setDate(stageEnd.getDate() - 1);
            const areaRatio = area / 1000;
            results.push({'생육단계': stage.name, '생육기간(월/일)': `${formatDate(stageStart)}~${formatDate(stageEnd)}`, '생육단계별 물 필요량(톤/1000m²)': (stageWaterNeed * areaRatio).toFixed(2), '일별 물 필요량(톤/day)': (stageWaterNeed / stage.days * areaRatio).toFixed(2)});
        }
        const totalWater = results.reduce((sum, r) => sum + parseFloat(r['생육단계별 물 필요량(톤/1000m²)']), 0);
        const totalDays = stages.reduce((sum, s) => sum + s.days, 0);
        results.push({'생육단계': '계', '생육기간(월/일)': '-', '생육단계별 물 필요량(톤/1000m²)': totalWater.toFixed(2), '일별 물 필요량(톤/day)': (totalWater / totalDays).toFixed(2)});
        return results;
    }

    async function executeSearch(params) {
        searchBtn.disabled = true; searchBtn.innerHTML = '<span class="icon"></span>검색 중...';
        if (params.crop_code === 'CABBAGE_CUSTOM') {
            try {
                const cabbageResults = await calculateCabbageWaterRequirement(params.planting_date, parseInt(params.area), params.address);
                const fakeData = {success: true, crop_name: '양배추', selected_date: params.planting_date, results: cabbageResults};
                displayResults(fakeData, params);
            } catch (error) { console.error('양배추 물 필요량 계산 오류:', error); alert('양배추 물 필요량 계산 중 오류가 발생했습니다.'); }
            searchBtn.disabled = false; searchBtn.innerHTML = '<span class="icon"></span>검색'; return;
        }
        callWaterAPI('report', params)
        .then(data => { if (data.success) displayResults(data, params); else alert('오류: ' + data.error); })
        .catch(error => { console.error('검색 오류:', error); alert('검색 중 오류가 발생했습니다.'); })
        .finally(() => { searchBtn.disabled = false; searchBtn.innerHTML = '<span class="icon"></span>검색'; });
    }

    async function loadGeoJson() {
        try { const r = await fetch('/static/water/data/CTPRVN_wgs84.json.gz'); geoJsonData = await r.json(); return geoJsonData; }
        catch (e) { console.error('GeoJSON 로드 오류:', e); return null; }
    }

    async function loadSigGeoJson() {
        try { const r = await fetch('/static/water/data/SIG_wgs84.json.gz'); sigGeoJsonData = await r.json(); return sigGeoJsonData; }
        catch (e) { console.error('시군구 GeoJSON 로드 오류:', e); return null; }
    }

    async function loadEmdGeoJson() {
        try { const r = await fetch('/static/water/data/EMD_wgs84.json.gz'); emdGeoJsonData = await r.json(); return emdGeoJsonData; }
        catch (e) { console.error('읍면동 GeoJSON 로드 오류:', e); return null; }
    }

    async function loadSlopeData() {
        if (allSlopeData.length > 0) return allSlopeData;
        try { const r = await fetch('/static/water/data/slope.csv.gz'); return parseSlopeCSV(await r.text()); }
        catch (e) { console.error('경사도 로드 오류:', e); return []; }
    }

    function parseSlopeCSV(text) {
        const lines = text.trim().split('\n'), data = [];
        const firstLine = lines[0].trim(), startIdx = (firstLine.toLowerCase().includes('latitude') || firstLine.toLowerCase().includes('lat')) ? 1 : 0;
        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            let cols = line.split(',');
            if (cols.length < 3) cols = line.split('\t');
            if (cols.length < 3) cols = line.split(/\s+/);
            if (cols.length >= 3) {
                const lat = parseFloat(cols[0].trim()), lon = parseFloat(cols[1].trim()), slope = parseFloat(cols[2].trim());
                if (!isNaN(lat) && !isNaN(lon) && !isNaN(slope) && slope >= 0) data.push({ lat, lon, slope });
            }
        }
        console.log(`경사도 데이터 ${data.length}개 로드`); allSlopeData = data; return data;
    }

    function drawSlopePoints(slopeData, filterGeometry = null) {
        if (slopePointLayer) { slopeMap.removeLayer(slopePointLayer); slopePointLayer = null; }
        if (!slopeData || slopeData.length === 0) return;
        const renderer = L.canvas({ padding: 0.5, pane: 'slopePane' });
        slopePointLayer = L.layerGroup([], { renderer }).addTo(slopeMap);
        const R = 2, BATCH = 10000;
        let i = 0;
        function drawBatch() {
            const end = Math.min(i + BATCH, slopeData.length);
            for (; i < end; i++) {
                const d = slopeData[i];
                if (d.slope < 0 || d.slope > 1 || isNaN(d.slope)) continue;
                if (filterGeometry && !isPointInGeometry(d.lat, d.lon, filterGeometry)) continue;
                L.circleMarker([d.lat, d.lon], {radius: R, fillColor: colorForSlope(d.slope), fillOpacity: 0.7, stroke: false, pane: 'slopePane', renderer}).addTo(slopePointLayer);
            }
            if (i < slopeData.length) requestAnimationFrame(drawBatch);
            else { console.log(`✅ 경사도 점 ${i}개 생성`); updateNavUI(); }
        }
        requestAnimationFrame(drawBatch);
    }

    async function changeMapScale(scale, clickedSidoName = null, clickedSggCode = null) {
        if (!slopeMap) return;
        currentMapScale = scale;
        document.querySelectorAll('.map-scale-btn').forEach(btn => {
            if (btn.dataset.scale === scale) btn.classList.add('active'); else btn.classList.remove('active');
        });
        if (geoJsonLayer) { slopeMap.removeLayer(geoJsonLayer); geoJsonLayer = null; }
        if (sigLayer) { slopeMap.removeLayer(sigLayer); sigLayer = null; }
        if (emdLayer) { slopeMap.removeLayer(emdLayer); emdLayer = null; }
        const slopeData = await loadSlopeData();
        if (scale === 'all') {
            currentNav = { scale: 'all', sido: null, sgg: null, sggCode: null };
            if (!geoJsonData) geoJsonData = await loadGeoJson();
            if (geoJsonData && geoJsonData.features) {
                geoJsonLayer = L.geoJSON(geoJsonData, {
                    style: { color: '#000000', weight: 2, fillOpacity: 0, opacity: 0.8 }, pane: 'overlayPane',
                    onEachFeature: (f, l) => {
                        l.bindTooltip(f.properties.CTP_KOR_NM, {permanent: false, direction: 'center', className: 'region-tooltip'});
                        l.on('mouseover', function(e) {this.setStyle({ color: '#0046FF', weight: 3, opacity: 1 }); this.bringToFront();});
                        l.on('mouseout', function(e) {this.setStyle({ color: '#000000', weight: 2, opacity: 0.8 });});
                        l.on('click', function(e) { const sido = f.properties.CTP_KOR_NM; console.log('클릭:', sido); changeMapScale('sido', sido); });
                    }
                }).addTo(slopeMap);
                koreaGeometry = mergeAllGeometries(geoJsonData.features);
            }
            slopeMap.setView([36, 127.8], SCALE_ZOOM.all); drawSlopePoints(slopeData, koreaGeometry);
        } else if (scale === 'sido') {
            const targetSido = clickedSidoName || selectedSidoName;
            if (!targetSido) { alert('지역 선택 필요'); changeMapScale('all'); return; }
            currentNav = { scale: 'sido', sido: targetSido, sgg: null, sggCode: null };
            if (!geoJsonData) geoJsonData = await loadGeoJson();
            if (!sigGeoJsonData) sigGeoJsonData = await loadSigGeoJson();
            const sidoFeature = geoJsonData.features.find(f => f.properties.CTP_KOR_NM === targetSido);
            if (!sidoFeature) { alert(`${targetSido} 지도 데이터 없음`); changeMapScale('all'); return; }
            geoJsonLayer = L.geoJSON(sidoFeature, {style: { color: '#000000', weight: 2, fillOpacity: 0, opacity: 1 }, pane: 'overlayPane'}).addTo(slopeMap);
            const sidoCode = SIDO_CODE_MAP[targetSido], sigFeatures = sigGeoJsonData.features.filter(f => f.properties.SIG_CD && f.properties.SIG_CD.startsWith(sidoCode));
            if (sigFeatures.length > 0) {
                sigLayer = L.geoJSON(sigFeatures, {
                    style: { color: '#000000', weight: 2, fillOpacity: 0, opacity: 0.6 }, pane: 'overlayPane',
                    onEachFeature: (f, l) => {
                        l.bindTooltip(f.properties.SIG_KOR_NM, {permanent: false, direction: 'center', className: 'region-tooltip'});
                        l.on('mouseover', function(e) {this.setStyle({ color: '#0046FF', weight: 3, opacity: 1 }); this.bringToFront();});
                        l.on('mouseout', function(e) {this.setStyle({ color: '#000000', weight: 2, opacity: 0.6 });});
                        l.on('click', function(e) { const code = f.properties.SIG_CD, name = f.properties.SIG_KOR_NM; console.log('클릭:', name, code); changeMapScale('sgg', targetSido, code); });
                    }
                }).addTo(slopeMap);
            }
            const bounds = geoJsonLayer.getBounds(); slopeMap.fitBounds(bounds, { padding: [50, 50], maxZoom: SCALE_ZOOM.sido });
            drawSlopePoints(slopeData, sidoFeature.geometry);
        } else if (scale === 'sgg') {
            const targetCode = clickedSggCode || selectedSigCode, targetSido = clickedSidoName || currentNav.sido || selectedSidoName;
            if (!targetCode) { alert('시군구 선택 필요'); changeMapScale('sido', targetSido); return; }
            if (!sigGeoJsonData) sigGeoJsonData = await loadSigGeoJson();
            if (!emdGeoJsonData) emdGeoJsonData = await loadEmdGeoJson();
            const sggFeature = sigGeoJsonData.features.find(f => f.properties.SIG_CD === targetCode);
            if (!sggFeature) { alert('시군구 지도 데이터 없음'); changeMapScale('sido', targetSido); return; }
            currentNav = {scale: 'sgg', sido: targetSido, sgg: sggFeature.properties.SIG_KOR_NM, sggCode: targetCode};
            geoJsonLayer = L.geoJSON(sggFeature, {style: { color: '#000000', weight: 2, fillOpacity: 0, opacity: 1 }, pane: 'overlayPane'}).addTo(slopeMap);
            const emdFeatures = emdGeoJsonData.features.filter(f => f.properties.EMD_CD && f.properties.EMD_CD.startsWith(targetCode));
            if (emdFeatures.length > 0) {
                emdLayer = L.geoJSON(emdFeatures, {
                    style: { color: '#000000', weight: 2, fillOpacity: 0, opacity: 0.5 }, pane: 'overlayPane',
                    onEachFeature: (f, l) => {
                        l.bindTooltip(f.properties.EMD_KOR_NM, {permanent: false, direction: 'center', className: 'region-tooltip'});
                        l.on('mouseover', function(e) {this.setStyle({ color: '#0046FF', weight: 3, opacity: 1 }); this.bringToFront();});
                        l.on('mouseout', function(e) {this.setStyle({ color: '#000000', weight: 2, opacity: 0.5 });});
                    }
                }).addTo(slopeMap);
            }
            const bounds = geoJsonLayer.getBounds(); slopeMap.fitBounds(bounds, { padding: [50, 50], maxZoom: SCALE_ZOOM.sgg });
            drawSlopePoints(slopeData, sggFeature.geometry);
        }
        updateNavUI();
    }

    function initializeSlopeMap(sidoName) {
        const mapContainer = document.getElementById('slope-map');
        if (!mapContainer) { console.error('slope-map 없음'); return; }
        if (slopeMap) { slopeMap.off(); slopeMap.remove(); slopeMap = null; }
        mapContainer.innerHTML = '';
        if (mapContainer._leaflet_id) delete mapContainer._leaflet_id;
        const legend = document.createElement('div');
        legend.className = 'map-legend';
        legend.innerHTML = `<h6>경사도</h6><div class="legend-content-discrete"><div class="legend-item"><div class="legend-color legend-color-1"></div><span>0-2%</span></div><div class="legend-item"><div class="legend-color legend-color-2"></div><span>2-7%</span></div><div class="legend-item"><div class="legend-color legend-color-3"></div><span>7-15%</span></div><div class="legend-item"><div class="legend-color legend-color-4"></div><span>15-30%</span></div><div class="legend-item"><div class="legend-color legend-color-5"></div><span>30-60%</span></div><div class="legend-item"><div class="legend-color legend-color-6"></div><span>60-100%</span></div></div>`;
        mapContainer.appendChild(legend);
        slopeMap = L.map('slope-map', {center: [36, 127.8], zoom: SCALE_ZOOM.all, zoomControl: false, scrollWheelZoom: true, dragging: true, minZoom: 6.2, maxZoom: 12.0, zoomSnap: 0.1, zoomDelta: 0.5, wheelPxPerZoomLevel: 120, preferCanvas: true});
        console.log('지도 초기화');
        navInfoControl = addNavInfoControl(slopeMap); currentNav = { scale: 'all', sido: null, sgg: null, sggCode: null };
        L.control.zoom({ position: 'topleft' }).addTo(slopeMap);
        const white = L.tileLayer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', {attribution: ''});
        white.addTo(slopeMap);
        if (!slopeMap.getPane('slopePane')) { slopeMap.createPane('slopePane'); slopeMap.getPane('slopePane').style.zIndex = 350; }
        Promise.all([loadGeoJson(), loadSlopeData()]).then(([geoJson, slopeData]) => {
            console.log('데이터 로드 완료');
            if (geoJson && geoJson.features) {
                geoJsonLayer = L.geoJSON(geoJson, {
                    style: { color: '#000000', weight: 2, fillOpacity: 0, opacity: 0.8 }, pane: 'overlayPane',
                    onEachFeature: (f, l) => {
                        l.bindTooltip(f.properties.CTP_KOR_NM, {permanent: false, direction: 'center', className: 'region-tooltip'});
                        l.on('mouseover', function(e) {this.setStyle({ color: '#0046FF', weight: 3, opacity: 1 }); this.bringToFront();});
                        l.on('mouseout', function(e) {this.setStyle({ color: '#000000', weight: 2, opacity: 0.8 });});
                        l.on('click', function(e) { const sido = f.properties.CTP_KOR_NM; console.log('클릭:', sido); changeMapScale('sido', sido); });
                    }
                }).addTo(slopeMap);
                koreaGeometry = mergeAllGeometries(geoJson.features);
                console.log('한반도 경계 생성');
            }
            if (slopeData && slopeData.length > 0) { console.log('경사도 점 생성 시작...'); drawSlopePoints(slopeData, koreaGeometry); }
            else console.error('경사도 데이터 없음');
        }).catch(e => { console.error('❌ 지도 데이터 로드 오류:', e); });
    }

    function renderDailyForecast(dailyList) {
        const host = document.getElementById('daily-forecast');
        if (!host) return;
        if (!dailyList || dailyList.length === 0) {
            host.innerHTML = '<div class="forecast-title">일별 예보</div><div style="text-align:center; padding:30px; color:#999;">일별 예보 데이터 불러오는 중…</div>'; return;
        }
        const data = dailyList.slice(0, 4);
        let html = '<div class="forecast-title">일별 예보</div><table><thead><tr><th>날짜</th>';
        data.forEach(d => {
            const todayClass = d.isToday ? ' today-date' : '';
            if (d.isPlusOne) html += `<th class="date-header${todayClass}"><span class="date-num">${d.dateNum || '-'}</span><span class="date-dow">${d.dateDow ? `(${d.dateDow})` : ''}</span></th>`;
            else html += `<th class="date-header${todayClass}"><span class="date-day">${d.dateDay || '-'}</span><span class="date-label">${d.dateLabel || ''}</span></th>`;
        });
        html += '</tr></thead><tbody><tr><td>시각</td>'; data.forEach(d => { html += `<td>${d.timeLabel || '-'}</td>`; });
        html += '</tr><tr><td>날씨</td>';
        data.forEach(d => {
            const iconAM = d.iconAM || 'DB01', iconPM = d.iconPM || 'DB01';
            html += `<td><img src="/static/water/images/${iconAM}.png" alt="${d.weatherAM || '-'}" style="width:24px; height:24px; vertical-align:middle;" title="${d.weatherAM || '-'}"> / <img src="/static/water/images/${iconPM}.png" alt="${d.weatherPM || '-'}" style="width:24px; height:24px; vertical-align:middle;" title="${d.weatherPM || '-'}"></td>`;
        });
        html += '</tr><tr><td>기온</td>'; data.forEach(d => { html += `<td>${d.tmin || '-'}° / ${d.tmax || '-'}°</td>`; });
        html += '</tr><tr><td>강수확률</td>'; data.forEach(d => { html += `<td>${d.popAM || '-'}% / ${d.popPM || '-'}%</td>`; });
        html += '</tr></tbody></table>'; host.innerHTML = html;
    }

    function renderHourlyForecast(hourlyList) {
        const container = document.getElementById('hourly-forecast');
        if (!container) return;
        if (!hourlyList || hourlyList.length === 0) {
            container.innerHTML = '<div class="forecast-title">시간별 예보</div><div class="hf-scroll"><div style="text-align:center; padding:20px; color:#999;">시간별 예보 데이터 불러오는 중…</div></div>'; return;
        }
        let html = '<div class="forecast-title">시간별 예보</div><div class="hf-scroll"><table class="hf-table"><thead><tr><th>시각</th>';
        hourlyList.forEach(h => {
            const todayClass = h.isToday ? 'today-hour' : '';
            html += `<th class="${todayClass}">${h.time || '-'}</th>`;
        });
        html += '</tr></thead><tbody><tr><td>날씨</td>';
        hourlyList.forEach(h => {
            const icon = h.icon || 'DB01';
            html += `<td><img src="/static/water/images/${icon}.png" alt="${h.desc || '-'}" style="width:22px; height:22px;" title="${h.desc || '-'}"></td>`;
        });
        html += '</tr><tr><td>강수량<br>(mm)</td>'; hourlyList.forEach(h => { html += `<td>${h.rn || '-'}</td>`; });
        html += '</tr><tr><td>강수확률</td>'; hourlyList.forEach(h => { html += `<td>${h.pop != null ? h.pop : '-'}</td>`; });
        html += '</tr></tbody></table></div>'; container.innerHTML = html;
    }

    function fetchAndRenderShortForecast(address) {
        const fd = new FormData(); fd.append('mode', 'short_forecast'); fd.append('address', address);
        fetch('/water/api/', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (!data.success) { console.warn('단기예보 실패:', data.error); return; }
            renderDailyForecast(data.daily); renderHourlyForecast(data.hourly);
        }).catch(e => { console.error('단기예보 오류:', e); });
    }

    function fetchAllRainfallData(address) {
        return new Promise((resolve, reject) => {
            if (isRainfallDataLoaded && currentRainfallAddress === address) { console.log('✅ 강수량 재사용:', address); resolve(currentRainfallData); return; }
            console.log('📊 강수량 크롤링:', address);
            const fd = new FormData(); fd.append('mode', 'rainfall_all'); fd.append('address', address);
            fetch('/water/api/', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    console.log(`✅ 강수량 로드 (${data.data_count}개)`);
                    currentRainfallData = data.rainfall_data || {}; currentRainfallAddress = address; isRainfallDataLoaded = true;
                    resolve(currentRainfallData);
                } else { console.error('강수량 로드 실패:', data.error); reject(new Error(data.error)); }
            }).catch(e => { console.error('강수량 요청 오류:', e); reject(e); });
        });
    }

    function calculateRecentSevenDaysRainfall() {
        const today = new Date();
        let total = 0;
        for (let i = 1; i <= 7; i++) {
            const target = new Date(today); target.setDate(today.getDate() - i);
            const key = `${target.getFullYear()}-${(target.getMonth() + 1).toString().padStart(2, '0')}-${target.getDate().toString().padStart(2, '0')}`;
            if (currentRainfallData[key] !== undefined) total += currentRainfallData[key];
        }
        return total;
    }

    function calculateConsecutiveDryDays() {
        const today = new Date();
        let dry = 0, offset = 1;
        while (true) {
            const target = new Date(today); target.setDate(today.getDate() - offset);
            const key = `${target.getFullYear()}-${(target.getMonth() + 1).toString().padStart(2, '0')}-${target.getDate().toString().padStart(2, '0')}`;
            if (currentRainfallData[key] === undefined) break;
            if (currentRainfallData[key] > 0) break;
            dry++; offset++;
            if (offset > 365) break;
        }
        return dry;
    }

    function calculatePostPlantingRainfall(plantingDate, growthStages) {
        if (!plantingDate || !growthStages || growthStages.length === 0) return 0;
        const today = new Date(), planting = new Date(plantingDate);
        let lastGrowthDate = null;
        for (let i = growthStages.length - 1; i >= 0; i--) {
            const stage = growthStages[i], periodText = stage['생육기간(월/일)'];
            if (periodText && periodText.includes('~')) {
                const [start, end] = periodText.split('~').map(s => s.trim());
                const endDate = parsePeriodDate(end, 2025);
                if (endDate) { lastGrowthDate = endDate; break; }
            }
        }
        if (!lastGrowthDate) return 0;
        let endDate;
        if (today <= lastGrowthDate) { endDate = new Date(today); endDate.setDate(endDate.getDate() - 1); }
        else { endDate = new Date(lastGrowthDate); endDate.setHours(23, 59, 59, 999); }
        let total = 0, current = new Date(planting);
        while (current <= endDate) {
            const key = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}-${current.getDate().toString().padStart(2, '0')}`;
            if (currentRainfallData[key] !== undefined) total += currentRainfallData[key];
            current.setDate(current.getDate() + 1);
        }
        return total;
    }

    function calculateGrowthStageRainfall(growthStages) {
        growthStageRainfall = {};
        for (let i = 0; i < growthStages.length; i++) {
            const stage = growthStages[i], periodText = stage['생육기간(월/일)'];
            if (!periodText || !periodText.includes('~')) continue;
            const [start, end] = periodText.split('~').map(s => s.trim());
            const startDate = parsePeriodDate(start, 2025), endDate = parsePeriodDate(end, 2025);
            if (!startDate || !endDate) continue;
            let total = 0, current = new Date(startDate);
            current.setHours(0, 0, 0, 0);
            const endNorm = new Date(endDate); endNorm.setHours(0, 0, 0, 0);
            while (current <= endNorm) {
                const key = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}-${current.getDate().toString().padStart(2, '0')}`;
                if (currentRainfallData[key] !== undefined) total += currentRainfallData[key];
                current.setDate(current.getDate() + 1);
            }
            growthStageRainfall[stage['생육단계']] = { period: periodText, rainfall: total };
        }
        console.log('✅ 생육단계별 강수량:', growthStageRainfall);
    }

    function parsePeriodDate(dateStr, year) {
        const match = dateStr.match(/(\d+)\/(\d+)/);
        if (match) {
            const month = parseInt(match[1]) - 1, day = parseInt(match[2]);
            return new Date(year, month, day);
        }
        return null;
    }

    function renderRainfallCalendar(results, plantingDate, address) {
        const container = document.getElementById('rainfall-calendar-container');
        if (!container) return;
        const growthStages = results.filter(row => row['생육단계'] !== '계');
        const currentYear = 2025, today = new Date(), currentMonth = today.getMonth();
        function renderCalendar(year, month) {
            if (year !== 2025) { console.warn('2025년만 표시'); return; }
            let html = `<div class="rainfall-calendar-wrapper"><div class="calendar-header"><button class="calendar-nav-btn" id="prev-month" ${month === 0 ? 'disabled' : ''}>‹</button><div class="calendar-month">${year}년 ${month + 1}월</div><button class="calendar-nav-btn" id="next-month" ${month === 11 ? 'disabled' : ''}>›</button></div><table class="calendar"><thead><tr><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr></thead><tbody>`;
            const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
            const startDay = firstDay.getDay(), totalDays = lastDay.getDate();
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            const prevMonth = month === 0 ? 11 : month - 1, prevYear = month === 0 ? year - 1 : year;
            const nextMonth = month === 11 ? 0 : month + 1, nextYear = month === 11 ? year + 1 : year;
            let dayCounter = 1, nextMonthDay = 1, weekCount = Math.ceil((totalDays + startDay) / 7);
            for (let week = 0; week < weekCount; week++) {
                html += '<tr>';
                for (let day = 0; day < 7; day++) {
                    const cellIndex = week * 7 + day;
                    if (cellIndex < startDay) {
                        const prevDay = prevMonthLastDay - (startDay - cellIndex - 1);
                        const key = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${prevDay.toString().padStart(2, '0')}`;
                        const rainfall = currentRainfallData[key] !== undefined ? currentRainfallData[key] : null;
                        html += `<td class="other-month"><div class="date">${prevDay}일</div>`;
                        if (rainfall !== null) html += `<div class="rainfall-data">${rainfall.toFixed(1)}</div>`;
                        html += `</td>`;
                    } else if (dayCounter > totalDays) {
                        const key = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${nextMonthDay.toString().padStart(2, '0')}`;
                        const rainfall = currentRainfallData[key] !== undefined ? currentRainfallData[key] : null;
                        html += `<td class="other-month"><div class="date">${nextMonthDay}일</div>`;
                        if (rainfall !== null) html += `<div class="rainfall-data">${rainfall.toFixed(1)}</div>`;
                        html += `</td>`; nextMonthDay++;
                    } else {
                        const key = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayCounter.toString().padStart(2, '0')}`;
                        const rainfall = currentRainfallData[key] !== undefined ? currentRainfallData[key] : null;
                        const isToday = (year === today.getFullYear() && month === today.getMonth() && dayCounter === today.getDate());
                        let classes = ['current-month'];
                        if (isToday) classes.push('today');
                        html += `<td class="${classes.join(' ')}"><div class="date">${dayCounter}일</div>`;
                        if (rainfall !== null) html += `<div class="rainfall-data">${rainfall.toFixed(1)}</div>`;
                        html += `</td>`; dayCounter++;
                    }
                }
                html += '</tr>';
            }
            html += `</tbody></table><div class="growth-stage-summary"><h5>생육단계별 누적 강수량</h5>`;
            for (let i = 0; i < 5; i++) {
                if (i < growthStages.length) {
                    const stage = growthStages[i], stageName = stage['생육단계'], stageInfo = growthStageRainfall[stageName];
                    if (stageInfo) html += `<div class="stage-item"><span class="stage-name">${stageName} (${stageInfo.period})</span><span class="stage-rainfall">${stageInfo.rainfall.toFixed(1)} mm</span></div>`;
                    else html += `<div class="stage-item"><span class="stage-name">${stageName} (${stage['생육기간(월/일)']})</span><span class="stage-rainfall">0.0 mm</span></div>`;
                } else html += `<div class="stage-item" style="visibility: hidden;"><span class="stage-name">-</span><span class="stage-rainfall">-</span></div>`;
            }
            html += `</div></div>`; container.innerHTML = html;
            const prevBtn = document.getElementById('prev-month'), nextBtn = document.getElementById('next-month');
            if (prevBtn && !prevBtn.disabled) prevBtn.addEventListener('click', () => { if (month > 0) renderCalendar(year, month - 1); });
            if (nextBtn && !nextBtn.disabled) nextBtn.addEventListener('click', () => { if (month < 11) renderCalendar(year, month + 1); });
        }
        fetchAllRainfallData(address).then(() => {
            calculateGrowthStageRainfall(growthStages);
            auxiliaryIndicators.recentSevenDays = calculateRecentSevenDaysRainfall();
            auxiliaryIndicators.consecutiveDryDays = calculateConsecutiveDryDays();
            auxiliaryIndicators.postPlanting = calculatePostPlantingRainfall(plantingDate, growthStages);
            console.log('✅ 보조 지표:', auxiliaryIndicators);
            updateAuxiliaryIndicators(); renderCalendar(currentYear, currentMonth);
        }).catch(e => {
            console.error('강수량 로드 실패:', e);
            container.innerHTML = '<div style="text-align:center; padding:30px; color:#999;">강수량 데이터를 불러올 수 없습니다.</div>';
        });
    }

    function updateAuxiliaryIndicators() {
        const recent = document.querySelector('.summary-bar .summary-item:nth-child(1) .value');
        const dry = document.querySelector('.summary-bar .summary-item:nth-child(2) .value');
        const post = document.querySelector('.summary-bar .summary-item:nth-child(3) .value');
        if (recent) recent.textContent = `${auxiliaryIndicators.recentSevenDays.toFixed(1)} mm`;
        if (dry) dry.textContent = `${auxiliaryIndicators.consecutiveDryDays} 일`;
        if (post) post.textContent = `${auxiliaryIndicators.postPlanting.toFixed(1)} mm`;
    }

    function displayResults(data, params) {
        let html = `<h2>물관리 처방서 결과</h2><div style="background: #f0f8ff; padding: 15px; margin-bottom: 20px; border-radius: 5px;"><h4>📋 노지 밭 물사용 처방서 활용시 주의사항</h4><ol><li>본 처방서는 강수가 발생하지 않는 조건에서 물 필요량을 산정한 결과입니다.</li><li>물은 생육기간 중 물 필요량 내에서 주되, 기상 및 토양상태에 따라 관수량과 관수주기를 조절합니다.</li><li>지하수위가 높거나 경사가 심한 밭에는 현장여건에 맞게 물량을 조절합니다.</li><li>파종 및 정식 전후 관수는 작물 및 토양조건에 따라 관수합니다.</li></ol></div><div style="margin-bottom: 20px;"><h3>검색 조건</h3><div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; font-weight: bold; color: #333;">지역: ${params.address || '-'}</div><table style="width: 100%; border-collapse: collapse; margin-top: 10px;"><thead><tr style="background: #e9ecef;"><th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">시도</th><th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">시군구</th><th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">작물</th><th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">파종·정식시기</th><th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">기상정보</th><th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">관수방법</th><th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">관수면적(m²)</th></tr></thead><tbody><tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${params.sido_name}</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${params.sgg_name}</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${data.crop_name || params.crop_name}</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${data.selected_date || params.planting_date}</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${weatherSelect.options[weatherSelect.selectedIndex].text}</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${params.irrigation_name}</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${parseInt(params.area).toLocaleString()}</td></tr></tbody></table></div>`;
        if (data.results && data.results.length > 0) {
            html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><h3 style="margin: 0;">생육단계별 물 필요량</h3><button onclick="downloadCSV()" style="background: white; border: 1px solid #d0d0d0; padding: 8px 16px; border-radius: 4px; color: #333; cursor: pointer; font-size: 14px; transition: border-color 0.2s;" onmouseover="this.style.borderColor='#999'" onmouseout="this.style.borderColor='#d0d0d0'">결과 다운로드 (CSV)</button></div><table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;"><thead><tr style="background: #f8f9fa;"><th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">생육단계</th><th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">생육기간(월/일)</th><th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">생육단계별 물 필요량(톤/${parseInt(params.area).toLocaleString()}m²)</th><th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">일별 물 필요량(톤/day)</th></tr></thead><tbody>`;
            data.results.forEach(row => { html += `<tr><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${row['생육단계']}</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${row['생육기간(월/일)']}</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${row['생육단계별 물 필요량(톤/1000m²)']}</td><td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${row['일별 물 필요량(톤/day)']}</td></tr>`; });
            html += `</tbody></table>`;
            if (params.crop_code === 'CABBAGE_CUSTOM') html += renderClimateDataSearch();
            html += `<h3 style="margin-top: 40px; margin-bottom: 20px;">보조 지표</h3><div class="summary-bar"><div class="summary-item"><div class="label">최근 7일 누적 강수량</div><div class="value">계산 중...</div></div><div class="summary-item"><div class="label">연속 무강수 일수</div><div class="value">계산 중...</div></div><div class="summary-item"><div class="label">파종 후 누적 강수량</div><div class="value">계산 중...</div></div><div class="summary-item"><div class="label">경사도</div><div class="value" id="slope-value">조회 중...</div></div></div><div class="indicator-grid"><div class="indicator-box"><h4>강수량 달력</h4><div class="content" id="rainfall-calendar-container"></div></div><div class="indicator-box"><h4>단기 기상예보</h4><div class="content forecast-wrap"><section id="daily-forecast" class="daily-forecast" aria-label="일별 예보"><div class="forecast-title">일별 예보</div><div style="text-align:center; padding:30px; color:#999;">예보 데이터 불러오는 중...</div></section><section id="hourly-forecast" class="hourly-forecast" aria-label="시간별 예보"><div class="forecast-title">시간별 예보</div><div class="hf-scroll"><div style="text-align:center; padding:20px; color:#999;">예보 데이터 불러오는 중...</div></div></section></div></div></div><div class="indicator-map"><h4><span>경사도 지도</span><div class="map-scale-buttons"><button class="map-scale-btn active" data-scale="all" onclick="window.changeMapScale('all')">전체</button><button class="map-scale-btn" data-scale="sido" onclick="window.changeMapScale('sido')">광역시/도</button><button class="map-scale-btn" data-scale="sgg" onclick="window.changeMapScale('sgg')">시군구</button></div></h4><div class="content" id="slope-map"></div></div>`;
        } else html += `<div style="text-align: center; padding: 40px; color: #666;"><p>검색 결과가 없습니다.</p></div>`;
        resultDiv.innerHTML = html; resultDiv.style.display = 'block';
        window.changeMapScale = changeMapScale;
        window.downloadCSV = function() {
            const csv = convertToCSV(data.results), blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
            link.download = `물관리처방서_${params.crop_name}_${params.planting_date}.csv`; link.click();
        };
        if (data.results && data.results.length > 0) {
            if (params.crop_code === 'CABBAGE_CUSTOM') bindClimateSearchEvents();
            if (window.currentLatLon && window.currentLatLon.lat && window.currentLatLon.lon) {
                fetchSlopeData(window.currentLatLon.lat, window.currentLatLon.lon)
                .then(slopeData => {
                    const slopeValueEl = document.getElementById('slope-value');
                    if (slopeValueEl) slopeValueEl.textContent = `${slopeData.slope_percent} %`;
                })
                .catch(e => {
                    console.error('경사도 표시 실패:', e);
                    const slopeValueEl = document.getElementById('slope-value');
                    if (slopeValueEl) slopeValueEl.textContent = '- %';
                });
            } else {
                const slopeValueEl = document.getElementById('slope-value');
                if (slopeValueEl) slopeValueEl.textContent = '- %';
            }
            renderRainfallCalendar(data.results, params.planting_date, params.address);
            fetchAndRenderShortForecast(params.address);
            setTimeout(() => {
                if (slopeMap) { slopeMap.off(); slopeMap.remove(); slopeMap = null; }
                const mapEl = document.getElementById('slope-map');
                if (mapEl) { mapEl.innerHTML = ''; mapEl._leaflet_id = null; }
                initializeSlopeMap(params.sido_name);
            }, 200);
        }
    }

    function convertToCSV(data) {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]), csvRows = [headers.join(',')];
        data.forEach(row => {
            const values = headers.map(h => {
                const v = row[h] || '';
                return `"${v.toString().replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });
        return csvRows.join('\n');
    }

    function resetPlantingInfo() {
        recommendedSpan.textContent = '권장 파종·정식시기: ―'; examDayInput.value = '';
        examDayInput.removeAttribute('min'); examDayInput.removeAttribute('max');
        recommendedDates = []; allowedRanges = []; plantingDatesData = {}; resultDiv.style.display = 'none';
        const info = document.getElementById('date-range-info');
        if (info) info.style.display = 'none';
    }

    resetBtn?.addEventListener('click', function() {
        addressInput.value = ''; document.getElementById('latlon-inline').textContent = ''; window.currentLatLon = null;
        selectedSidoCode = selectedSggCode = selectedSidoName = selectedSggName = '';
        selectedSigCode = selectedSigName = selectedFullAddress = '';
        cropGbnSelect.value = ''; cropGbnSelect.disabled = true;
        while (cropGbnSelect.children.length > 1) cropGbnSelect.removeChild(cropGbnSelect.lastChild);
        cropSelect.innerHTML = '<option value="">작물</option>'; examDayInput.value = '';
        weatherSelect.value = '3'; irrigationSelect.value = '02'; areaInput.value = '1000'; resetPlantingInfo();
        currentRainfallData = {}; currentRainfallAddress = ''; isRainfallDataLoaded = false;
        growthStageRainfall = {}; auxiliaryIndicators = { recentSevenDays: 0, consecutiveDryDays: 0, postPlanting: 0 };
    });

    initializeSelects();
});