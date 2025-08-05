// {# 주소검색으로 실제 흙토람이랑 연결 - 디폴트 + 생육단계별 물 필요량 시각화 + 선택 가능 기간 안내 + 지역별 작물분류 필터링 추가#}
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소들 가져오기
    const sidoSelect = document.getElementById('sido');
    const sggSelect = document.getElementById('sgg');
    const cropGbnSelect = document.getElementById('crop_gbn');
    const cropSelect = document.getElementById('crop');
    const examDayInput = document.getElementById('exam_day');
    const recommendedSpan = document.getElementById('recommended');
    const weatherSelect = document.getElementById('weather');
    const irrigationSelect = document.getElementById('irrigation');
    const areaInput = document.getElementById('area');
    const searchBtn = document.getElementById('search');
    const resetBtn = document.getElementById('reset');
    const resultDiv = document.getElementById('result');

    // 주소 검색 관련 요소들
    const addressInput = document.getElementById('address-input');
    const addressSearchBtn = document.getElementById('address-search-btn');
    const addressClearBtn = document.querySelector('.address-clear-btn');
    const modalBg = document.getElementById('modal-postcode-bg');
    const modalInput = document.getElementById('modal-postcode-input');
    const modalSearchBtn = document.querySelector('.modal-postcode-search-btn');
    const modalClearBtn = document.querySelector('.modal-postcode-clear-btn');
    const modalCloseBtn = document.querySelector('.modal-postcode-close');
    const modalResultList = document.getElementById('modal-postcode-result-list');
    const modalPagination = document.getElementById('modal-postcode-pagination');

    // 전역 변수
    let recommendedDates = [];
    let allowedRanges = [];
    let plantingDatesData = {};
    let addressSearchResults = [];
    let addressSearchTotal = 0;
    let selectedSidoCode = '';
    let selectedSggCode = '';
    let selectedSidoName = '';
    let selectedSggName = '';

    // ========== 지역별 작물분류 필터링 함수들 추가 ==========

    // 작물분류 데이터 존재 여부 확인 함수
    async function checkAvailableCropCategories(sidoCode) {
        const availableCategories = new Set();

        // 모든 작물분류에 대해 데이터 존재 여부 확인
        const cropCategoryPromises = Object.keys(cropCategories).map(async (categoryCode) => {
            try {
                const data = await callWaterAPI('crops', {
                    sido_code: sidoCode,
                    crop_gbn: categoryCode
                });

                if (data.success && data.data && Object.keys(data.data).length > 0) {
                    availableCategories.add(categoryCode);
                }
            } catch (error) {
                console.log(`작물분류 ${categoryCode} 확인 중 오류:`, error);
            }
        });

        await Promise.all(cropCategoryPromises);
        return availableCategories;
    }

    // 작물분류 옵션 업데이트 함수
    function updateCropCategoryOptions(availableCategories) {
        // 기존 옵션들 모두 제거 (첫 번째 기본 옵션 제외)
        while (cropGbnSelect.children.length > 1) {
            cropGbnSelect.removeChild(cropGbnSelect.lastChild);
        }

        // 사용 가능한 작물분류만 추가 (데이터가 없는 것은 아예 제외)
        for (const [code, name] of Object.entries(cropCategories)) {
            if (availableCategories.has(code)) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = name;
                cropGbnSelect.appendChild(option);
            }
        }

        // 사용 가능한 작물분류가 없는 경우
        if (availableCategories.size === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '해당 지역에 작물 정보가 없습니다';
            option.disabled = true;
            cropGbnSelect.appendChild(option);
        }
    }

    // ========== 주소에서 지역 정보 추출 및 API 연동 ==========
    function extractRegionFromAddress(address) {
        const parts = address.split(' ').filter(part => part.trim());

        if (parts.length >= 2) {
            const sido = parts[0];
            const sgg = parts[1];
            return { sido, sgg };
        }

        return { sido: null, sgg: null };
    }

    // Promise 기반으로 수정된 getSidoSggCodes 함수 (작물분류 필터링 적용)
    function getSidoSggCodes(sidoName, sggName, fullAddress) {
        return new Promise((resolve, reject) => {
            // 시도 코드 매핑
            const sidoMapping = {
                "강원특별자치도": "51", "강원도": "51",
                "경기도": "41",
                "경상남도": "48", "경남": "48",
                "경상북도": "47", "경북": "47",
                "광주광역시": "29", "광주시": "29",
                "대구광역시": "27", "대구시": "27",
                "대전광역시": "30", "대전시": "30",
                "부산광역시": "26", "부산시": "26",
                "서울특별시": "11", "서울시": "11",
                "세종특별자치시": "36", "세종시": "36",
                "울산광역시": "31", "울산시": "31",
                "인천광역시": "28", "인천시": "28",
                "전라남도": "46", "전남": "46",
                "전북특별자치도": "52", "전라북도": "52", "전북": "52",
                "제주특별자치도": "50", "제주도": "50",
                "충청남도": "44", "충남": "44",
                "충청북도": "43", "충북": "43"
            };

            const sidoCode = sidoMapping[sidoName];

            if (!sidoCode) {
                reject(new Error('지원하지 않는 지역입니다: ' + sidoName));
                return;
            }

            selectedSidoCode = sidoCode;
            selectedSidoName = sidoName;

            // 시군구 코드 조회
            callWaterAPI('sgg', { sido_code: sidoCode })
            .then(data => {
                if (data.success) {
                    const sggCode = findSggCode(data.data, sggName);
                    if (sggCode) {
                        selectedSggCode = sggCode;
                        selectedSggName = sggName;

                        // 지역이 변경될 때 작물 관련 정보 초기화
                        cropGbnSelect.value = '';
                        cropSelect.innerHTML = '<option value="">작물</option>';
                        resetPlantingInfo();

                        // 작물분류 로딩 중 비활성화
                        cropGbnSelect.disabled = true;

                        // 해당 지역의 사용 가능한 작물분류 확인 및 업데이트
                        checkAvailableCropCategories(sidoCode)
                        .then(availableCategories => {
                            updateCropCategoryOptions(availableCategories);
                            cropGbnSelect.disabled = false; // 로딩 완료 후 활성화

                            console.log(`지역 설정 완료: ${sidoName}(${sidoCode}) ${sggName}(${sggCode})`);
                            console.log('사용 가능한 작물분류:', Array.from(availableCategories));

                            resolve({ sidoCode, sggCode, sidoName, sggName });
                        })
                        .catch(error => {
                            console.error('작물분류 확인 중 오류:', error);
                            // 오류 발생 시에도 모든 분류를 표시 (기본 동작)
                            const allCategories = new Set(Object.keys(cropCategories));
                            updateCropCategoryOptions(allCategories);
                            cropGbnSelect.disabled = false;
                            resolve({ sidoCode, sggCode, sidoName, sggName });
                        });
                    } else {
                        reject(new Error('해당 시군구를 찾을 수 없습니다: ' + sggName));
                    }
                } else {
                    reject(new Error('시군구 정보 조회에 실패했습니다.'));
                }
            })
            .catch(error => {
                reject(new Error('시군구 정보 조회 중 오류가 발생했습니다.'));
            });
        });
    }

    function findSggCode(sggData, sggName) {
        // 정확한 매칭 먼저 시도
        for (const [name, code] of Object.entries(sggData)) {
            if (name === sggName) {
                return code;
            }
        }

        // 부분 매칭 시도
        for (const [name, code] of Object.entries(sggData)) {
            if (name.includes(sggName) || sggName.includes(name)) {
                return code;
            }
        }

        return null;
    }

    // ========== 주소 검증 및 검색 로직 추가 ==========

    // 주소 검색 결과를 처리하는 함수
    function processAddressSearchResult(query) {
        return new Promise((resolve, reject) => {
            const params = new URLSearchParams({
                q: query,
                page: 1,
                per_page: 2000,
                list: 1
            });

            fetch(`/water/get_latlon/?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const results = data.items || [];
                resolve(results);
            })
            .catch(error => {
                console.error('Address search error:', error);
                reject(error);
            });
        });
    }

    // 주소 검색 및 처리 함수
    function handleAddressSearch(addressValue) {
        return new Promise((resolve, reject) => {
            processAddressSearchResult(addressValue)
            .then(results => {
                if (results.length === 0) {
                    // 0개: 검색 결과 없음 - 모달 열기
                    openAddressModal(addressValue);
                    reject(new Error('검색 결과가 없습니다. 주소를 다시 입력해주세요.'));
                } else if (results.length === 1) {
                    // 1개: 자동으로 선택하여 검색 진행
                    const address = results[0].address;
                    const addressParts = extractRegionFromAddress(address);

                    if (addressParts.sido && addressParts.sgg) {
                        // 주소 입력 필드 업데이트
                        addressInput.value = address;

                        // 시도/시군구 코드 조회 및 설정
                        getSidoSggCodes(addressParts.sido, addressParts.sgg, address)
                        .then(() => {
                            resolve({ address, region: addressParts });
                        })
                        .catch(error => {
                            reject(error);
                        });
                    } else {
                        reject(new Error('주소에서 지역 정보를 추출할 수 없습니다.'));
                    }
                } else {
                    // 2개 이상: 모달 열어서 선택하도록 함
                    openAddressModal(addressValue);
                    reject(new Error('여러 개의 주소가 검색되었습니다. 정확한 주소를 선택해주세요.'));
                }
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    // ========== 주소 검색 모달 기능 추가 ==========
    function openAddressModal(searchQuery = '') {
        modalBg.style.display = 'block';
        modalInput.value = searchQuery;
        modalInput.focus();
        modalResultList.innerHTML = '';
        modalPagination.innerHTML = '';
        addressSearchResults = [];
        addressSearchTotal = 0;

        if (searchQuery.trim()) {
            doAddressSearch();
        }
    }

    function closeAddressModal() {
        modalBg.style.display = 'none';
    }

    function doAddressSearch() {
        const query = modalInput.value.trim();
        if (!query) {
            modalInput.focus();
            return;
        }

        modalResultList.innerHTML = '<li class="no-result">검색 중...</li>';

        // GET 방식으로 변경 (CSRF 토큰 불필요)
        const params = new URLSearchParams({
            q: query,
            page: 1,
            per_page: 2000,
            list: 1
        });

        fetch(`/water/get_latlon/?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            addressSearchResults = data.items || [];
            addressSearchTotal = data.total || addressSearchResults.length;
            renderAddressList(1);
        })
        .catch(error => {
            console.error('Address search error:', error);
            modalResultList.innerHTML = '<li class="no-result">검색 중 오류가 발생했습니다. 다시 시도해주세요.</li>';
        });
    }

    function renderAddressList(page) {
        let html = '';
        const start = (page - 1) * 10;
        const end = start + 10;
        const items = addressSearchResults.slice(start, end);

        if (addressSearchTotal >= 300) {
            html = '<li class="too-many-result">검색결과가 너무 많습니다.<br>더 상세한 주소를 입력해 주세요</li>';
        } else if (items.length === 0) {
            html = '<li class="no-result">검색 결과가 없습니다.</li>';
        } else {
            items.sort((a, b) => a.address.localeCompare(b.address, 'ko'));
            items.forEach(addr => {
                html += `<li data-address="${addr.address.replace(/"/g, '&quot;')}">${addr.address}</li>`;
            });
        }
        modalResultList.innerHTML = html;

        // 페이지네이션
        if (addressSearchTotal > 10) {
            const maxPage = Math.ceil(addressSearchTotal / 10);
            let prevBtn = (page > 1)
                ? `<button class="modal-page-btn" data-page="${page-1}" style="width:58px;">이전</button>`
                : `<button class="modal-page-btn" style="width:58px; visibility:hidden;">이전</button>`;
            let nextBtn = (page < maxPage)
                ? `<button class="modal-page-btn" data-page="${page+1}" style="width:58px;">다음</button>`
                : `<button class="modal-page-btn" style="width:58px; visibility:hidden;">다음</button>`;

            modalPagination.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; gap:5px; padding:7px 0;">
                    <div style="flex:0 0 58px; display:flex; justify-content:flex-end;">${prevBtn}</div>
                    <div style="flex:0 0 56px; text-align:center; font-size:0.98em;">${page}/${maxPage}</div>
                    <div style="flex:0 0 58px; display:flex; justify-content:flex-start;">${nextBtn}</div>
                </div>
            `;
        }
    }

    // 주소 검색 이벤트 리스너들
    addressSearchBtn?.addEventListener('click', function() {
        const currentAddress = addressInput.value.trim();
        openAddressModal(currentAddress);
    });

    addressClearBtn?.addEventListener('click', function() {
        addressInput.value = '';
        addressInput.focus();
    });

    modalClearBtn?.addEventListener('click', function() {
        modalInput.value = '';
        modalInput.focus();
    });

    modalCloseBtn?.addEventListener('click', closeAddressModal);

    modalBg?.addEventListener('click', function(e) {
        if (e.target === this) closeAddressModal();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeAddressModal();
    });

    modalSearchBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        doAddressSearch();
    });

    modalInput?.addEventListener('keypress', function(e) {
        if (e.which === 13) {
            doAddressSearch();
            return false;
        }
    });

    // 페이지네이션 버튼 클릭
    modalPagination?.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-page-btn')) {
            const page = parseInt(e.target.dataset.page);
            if (page > 0) renderAddressList(page);
        }
    });

    // 주소 결과 클릭 (개선된 버전)
    modalResultList?.addEventListener('click', function(e) {
        if (e.target.dataset.address) {
            const address = e.target.dataset.address;

            // 주소에서 시도, 시군구 추출
            const addressParts = extractRegionFromAddress(address);

            if (addressParts.sido && addressParts.sgg) {
                addressInput.value = address;

                // 시도/시군구 코드 조회 및 설정
                getSidoSggCodes(addressParts.sido, addressParts.sgg, address)
                .then(() => {
                    closeAddressModal();
                    addressInput.focus();
                    console.log('주소가 설정되었습니다:', address);
                })
                .catch(error => {
                    alert(error.message);
                });
            } else {
                alert('주소에서 지역 정보를 추출할 수 없습니다.');
            }
        }
    });

    // ========== 1. 초기화 (수정됨) ==========
    function initializeSelects() {
        // 작물분류는 지역 선택 후 동적으로 추가됨 (초기에는 기본 옵션만)

        // 기본값 설정
        weatherSelect.value = '3';
        irrigationSelect.value = '02';
        areaInput.value = '1000';

        // 작물분류는 주소 선택 후 활성화
        cropGbnSelect.disabled = true;

        // 숫자만 입력 허용
        areaInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }

    // ========== 2. 통합 API 호출 함수 ==========
    function callWaterAPI(mode, params) {
        const formData = new FormData();
        formData.append('mode', mode);

        for (const [key, value] of Object.entries(params)) {
            formData.append(key, value);
        }

        return fetch('/water/api/', {
            method: 'POST',
            body: formData
        }).then(response => response.json());
    }

    // ========== 3. 시도 선택 이벤트 (주소 선택 시 자동 실행됨) ==========
    sidoSelect?.addEventListener('change', function() {
        const sidoCode = this.value;
        sggSelect.innerHTML = '<option value="">선택</option>';
        cropGbnSelect.value = '';
        cropSelect.innerHTML = '<option value="">작물</option>';
        resetPlantingInfo();

        if (sidoCode) {
            loadSggList(sidoCode);
        }
    });

    // ========== 4. 시군구 목록 로드 ==========
    function loadSggList(sidoCode) {
        callWaterAPI('sgg', { sido_code: sidoCode })
        .then(data => {
            if (data.success) {
                for (const [name, code] of Object.entries(data.data)) {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = name;
                    sggSelect.appendChild(option);
                }
            } else {
                alert('시군구 정보를 불러올 수 없습니다: ' + data.error);
            }
        })
        .catch(error => {
            alert('시군구 정보를 불러오는 중 오류가 발생했습니다.');
        });
    }

    // ========== 5. 작물분류 선택 이벤트 ==========
    cropGbnSelect?.addEventListener('change', function() {
        const cropGbn = this.value;
        const sidoCode = selectedSidoCode; // 주소에서 설정된 시도 코드 사용
        cropSelect.innerHTML = '<option value="">작물</option>';
        resetPlantingInfo();

        if (cropGbn && sidoCode) {
            loadCrops(sidoCode, cropGbn);
        }
    });

    // ========== 6. 작물 목록 로드 ==========
    function loadCrops(sidoCode, cropGbn) {
        callWaterAPI('crops', { sido_code: sidoCode, crop_gbn: cropGbn })
        .then(data => {
            if (data.success) {
                for (const [name, code] of Object.entries(data.data)) {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = name;
                    cropSelect.appendChild(option);
                }
            } else {
                alert('작물 정보를 불러올 수 없습니다: ' + data.error);
            }
        })
        .catch(error => {
            alert('작물 정보를 불러오는 중 오류가 발생했습니다.');
        });
    }

    // ========== 7. 작물 선택 이벤트 ==========
    cropSelect?.addEventListener('change', function() {
        const cropCode = this.value;
        const sidoCode = selectedSidoCode; // 주소에서 설정된 시도 코드 사용
        resetPlantingInfo();

        if (cropCode && sidoCode) {
            loadPlantingDates(sidoCode, cropCode);
        }
    });

    // ========== 8. 파종·정식시기 로드 ==========
    function loadPlantingDates(sidoCode, cropCode) {
        callWaterAPI('planting', { sido_code: sidoCode, crop_code: cropCode })
        .then(data => {
            if (data.success) {
                recommendedDates = data.recommended_dates || Object.keys(data.data);
                plantingDatesData = data.data || {};

                if (recommendedDates.length > 0) {
                    recommendedSpan.textContent = `권장 파종·정식시기: ${recommendedDates.join(', ')}`;

                    // 날짜 범위 계산 및 제약 설정
                    calculateDateRanges();
                    setDateConstraints();

                    // 기본값을 첫 번째 권장시기로 설정
                    const firstRecommended = parseDateString(recommendedDates[0]);
                    if (firstRecommended) {
                        examDayInput.value = firstRecommended.toISOString().split('T')[0];
                    }
                } else {
                    recommendedSpan.textContent = '권장 파종·정식시기: 정보 없음';
                }
            } else {
                recommendedSpan.textContent = '권장 파종·정식시기: 조회 실패';
            }
        })
        .catch(error => {
            recommendedSpan.textContent = '권장 파종·정식시기: 조회 오류';
        });
    }

    // ========== 9. 날짜 관련 함수들 ==========
    function parseDateString(dateStr) {
        if (dateStr && dateStr.includes('월') && dateStr.includes('일')) {
            const monthMatch = dateStr.match(/(\d+)월/);
            const dayMatch = dateStr.match(/(\d+)일/);
            if (monthMatch && dayMatch) {
                const month = parseInt(monthMatch[1]);
                const day = parseInt(dayMatch[1]);
                return new Date(2025, month - 1, day, 12, 0, 0);
            }
        }
        return null;
    }

    // ✅ 수정: calculateDateRanges 함수에 안내 멘트 업데이트 추가
    function calculateDateRanges() {
        allowedRanges = [];

        for (const dateStr of recommendedDates) {
            const parsedDate = parseDateString(dateStr);
            if (parsedDate) {
                const year = parsedDate.getFullYear();
                const month = parsedDate.getMonth();
                const day = parsedDate.getDate();

                const minDate = new Date(year, month, day - 10);
                const maxDate = new Date(year, month, day + 10);

                allowedRanges.push({
                    min: minDate,
                    max: maxDate,
                    recommended: dateStr,
                    recommendedDate: parsedDate
                });
            }
        }

        // ✅ 추가: 날짜 범위 안내 멘트 업데이트
        updateDateRangeInfo();
    }

    // ✅ 추가: 날짜 범위 안내 정보 업데이트 함수
    function updateDateRangeInfo() {
        const dateRangeInfo = document.getElementById('date-range-info');
        const availablePeriods = document.getElementById('available-periods');

        if (allowedRanges.length > 0) {
            // 각 범위를 MM/DD 형식으로 표시
            const rangeTexts = allowedRanges.map(range => {
                const minStr = `${(range.min.getMonth() + 1).toString().padStart(2, '0')}/${range.min.getDate().toString().padStart(2, '0')}`;
                const maxStr = `${(range.max.getMonth() + 1).toString().padStart(2, '0')}/${range.max.getDate().toString().padStart(2, '0')}`;
                return `${minStr} ~ ${maxStr}`;
            });

            availablePeriods.textContent = `선택 가능 기간: ${rangeTexts.join(', ')}`;
            dateRangeInfo.style.display = 'block';
        } else {
            dateRangeInfo.style.display = 'none';
        }
    }

    // HTML input 제약 설정 - 실제 허용 범위만 설정
    function setDateConstraints() {
        if (allowedRanges.length > 0) {
            // 권장시기가 1개인 경우: 그 시기의 ±10일
            if (allowedRanges.length === 1) {
                const minDate = new Date(allowedRanges[0].min);
                minDate.setDate(minDate.getDate() + 1);
                examDayInput.min = minDate.toISOString().split('T')[0];

                const maxDate = new Date(allowedRanges[0].max);
                maxDate.setDate(maxDate.getDate() + 1);
                examDayInput.max = maxDate.toISOString().split('T')[0];
            }
            // 권장시기가 여러 개인 경우: 전체 범위 설정 (불연속 구간은 JavaScript로 검증)
            else {
                const allMins = allowedRanges.map(r => r.min);
                const allMaxs = allowedRanges.map(r => r.max);
                const overallMin = new Date(Math.min(...allMins));
                const overallMax = new Date(Math.max(...allMaxs));

                overallMin.setDate(overallMin.getDate() + 1);
                overallMax.setDate(overallMax.getDate() + 1);

                examDayInput.min = overallMin.toISOString().split('T')[0];
                examDayInput.max = overallMax.toISOString().split('T')[0];
            }
        }
    }

    function isDateAllowed(selectedDate) {
        if (allowedRanges.length === 0) return true;

        const selected = new Date(selectedDate + 'T00:00:00');

        for (const range of allowedRanges) {
            if (selected >= range.min && selected <= range.max) {
                return true;
            }
        }
        return false;
    }

    function getMatchingRecommendedDate(selectedDate) {
        const selected = new Date(selectedDate + 'T00:00:00');

        for (const range of allowedRanges) {
            if (selected >= range.min && selected <= range.max) {
                return range.recommended;
            }
        }
        return recommendedDates[0] || '';
    }

    // 날짜 입력 검증
    examDayInput?.addEventListener('change', function() {
        const selectedDate = this.value;
        if (selectedDate && !isDateAllowed(selectedDate)) {
            alert('선택된 날짜가 권장 파종·정식시기 범위(±10일)를 벗어났습니다.');

            if (allowedRanges[0] && allowedRanges[0].recommendedDate) {
                this.value = allowedRanges[0].recommendedDate.toISOString().split('T')[0];
            }
        }
    });

    // ========== 실제 검색을 진행하는 함수 ==========
    function proceedWithSearch() {
        // 지역 설정 여부 재확인
        if (!selectedSidoCode || !selectedSggCode) {
            alert('올바른 주소를 선택해주세요.');
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<span class="icon"></span>검색';
            return;
        }

        const cropGbn = cropGbnSelect?.value;
        const cropGbnName = cropGbnSelect?.options[cropGbnSelect.selectedIndex]?.text;
        const cropCode = cropSelect?.value;
        const cropName = cropSelect?.options[cropSelect.selectedIndex]?.text;

        // 필수 입력값 검증
        if (!cropGbn || !cropCode || !examDayInput?.value ||
            !weatherSelect?.value || !irrigationSelect?.value || !areaInput?.value ||
            parseInt(areaInput.value) <= 0) {
            alert('모든 정보를 올바르게 입력해주세요.');
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<span class="icon"></span>검색';
            return;
        }

        // 날짜 유효성 검증
        if (!isDateAllowed(examDayInput.value)) {
            alert('선택된 날짜가 허용 범위를 벗어났습니다.');
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<span class="icon"></span>검색';
            return;
        }

        // 선택된 날짜에 해당하는 권장시기 정보 찾기
        const matchingRecommended = getMatchingRecommendedDate(examDayInput.value);
        const termCode = plantingDatesData[matchingRecommended] || '';

        // 검색 실행
        searchBtn.innerHTML = '<span class="icon"></span>검색 중...';
        executeSearch({
            sido_code: selectedSidoCode,
            sido_name: selectedSidoName,
            sgg_code: selectedSggCode,
            sgg_name: selectedSggName,
            crop_gbn: cropGbn,
            crop_gbn_name: cropGbnName,
            crop_code: cropCode,
            crop_name: cropName,
            planting_date: examDayInput.value,
            recommended_date: matchingRecommended,
            planting_term_code: termCode,
            weather_period: weatherSelect.value,
            irrigation_code: irrigationSelect.value,
            irrigation_name: irrigationSelect.options[irrigationSelect.selectedIndex].text,
            area: areaInput.value,
            address: addressInput.value
        });
    }

    // ========== 10. 개선된 검색 버튼 이벤트 ==========
    searchBtn?.addEventListener('click', function() {
        // 주소 입력 여부 확인
        const addressValue = addressInput?.value?.trim();
        if (!addressValue) {
            alert('주소를 입력해주세요.');
            return;
        }

        // 이미 지역이 설정되어 있고, 입력된 주소와 일치하는 경우 바로 검색 진행
        if (selectedSidoCode && selectedSggCode && addressInput.value.includes(selectedSidoName) && addressInput.value.includes(selectedSggName)) {
            proceedWithSearch();
            return;
        }

        // 주소 검색 및 검증 시작
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="icon"></span>주소 확인 중...';

        handleAddressSearch(addressValue)
        .then(() => {
            // 주소 설정 성공 시 검색 진행
            setTimeout(() => {
                proceedWithSearch();
            }, 500); // 지역 설정이 완료될 시간 확보
        })
        .catch(error => {
            // 주소 검색 실패 시 (모달이 열리거나 오류 발생)
            console.log('주소 검색 결과:', error.message);
            // 모달이 열린 경우이므로 버튼 상태만 복구
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<span class="icon"></span>검색';
        });
    });

    // ========== 11. 검색 실행 함수 ==========
    function executeSearch(searchParams) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="icon"></span>검색 중...';

        callWaterAPI('report', searchParams)
        .then(data => {
            if (data.success) {
                displayResults(data, searchParams);
            } else {
                alert('오류: ' + data.error);
            }
        })
        .catch(error => {
            console.error('검색 오류:', error);
            alert('검색 중 오류가 발생했습니다.');
        })
        .finally(() => {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<span class="icon"></span>검색';
        });
    }

    // ========== 12. 결과 표시 함수 (Streamlit 스타일 적용) ==========
    function displayResults(data, searchParams) {
        let html = `
            <h2>물관리 처방서 결과</h2>
            
            <div style="background: #f0f8ff; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h4>📋 노지 밭 물사용 처방서 활용시 주의사항</h4>
                <ol>
                    <li>본 처방서는 강수가 발생하지 않는 조건에서 물 필요량을 산정한 결과입니다.</li>
                    <li>물은 생육기간 중 물 필요량 내에서 주되, 기상 및 토양상태에 따라 관수량과 관수주기를 조절합니다.</li>
                    <li>지하수위가 높거나 경사가 심한 밭에는 현장여건에 맞게 물량을 조절합니다.</li>
                    <li>파종 및 정식 전후 관수는 작물 및 토양조건에 따라 관수합니다.</li>
                </ol>
            </div>

            <div style="margin-bottom: 20px;">
                <h3>🔍 검색 조건</h3>
                <div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; font-weight: bold; color: #333;">
                    지역: ${searchParams.address || '-'}
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background: #e9ecef;">
                            <th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">시도</th>
                            <th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">시군구</th>
                            <th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">작물</th>
                            <th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">파종·정식시기</th>
                            <th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">기상정보</th>
                            <th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">관수방법</th>
                            <th style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">관수면적(m²)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${searchParams.sido_name}</td>
                            <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${searchParams.sgg_name}</td>
                            <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${data.crop_name || searchParams.crop_name}</td>
                            <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${data.selected_date || searchParams.planting_date}</td>
                            <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${weatherSelect.options[weatherSelect.selectedIndex].text}</td>
                            <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${searchParams.irrigation_name}</td>
                            <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${parseInt(searchParams.area).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        if (data.results && data.results.length > 0) {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0;">📊 생육단계별 물 필요량</h3>
                    <button onclick="downloadCSV()" style="
                        background: white;
                        border: 1px solid #d0d0d0;
                        padding: 8px 16px;
                        border-radius: 4px;
                        color: #333;
                        cursor: pointer;
                        font-size: 14px;
                        transition: border-color 0.2s;
                    " onmouseover="this.style.borderColor='#999'" onmouseout="this.style.borderColor='#d0d0d0'">
                        결과 다운로드 (CSV)
                    </button>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">생육단계</th>
                            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">생육기간(월/일)</th>
                            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">생육단계별 물 필요량(톤/${parseInt(searchParams.area).toLocaleString()}m²)</th>
                            <th style="border: 1px solid #dee2e6; padding: 12px; text-align: center;">일별 물 필요량(톤/day)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.results.forEach(row => {
                const isTotal = row['생육단계'] === '계';

                html += `
                    <tr>
                        <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${row['생육단계']}</td>
                        <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${row['생육기간(월/일)']}</td>
                        <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${row['생육단계별 물 필요량(톤/1000m²)']}</td>
                        <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${row['일별 물 필요량(톤/day)']}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
                
                <h3>📊 생육단계별 물 필요량 시각화</h3>
                <canvas id="waterChart" style="width: 100%; height: 400px; margin-bottom: 20px;"></canvas>
            `;
        } else {
            html += `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <p>검색 결과가 없습니다.</p>
                </div>
            `;
        }

        resultDiv.innerHTML = html;
        resultDiv.style.display = 'block';

        // 다운로드 함수를 전역으로 등록
        window.downloadCSV = function() {
            const csvContent = convertToCSV(data.results);
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `물관리처방서_${searchParams.crop_name}_${searchParams.planting_date}.csv`;
            link.click();
        };

        // 차트 생성 (계 행 제외)
        if (data.results && data.results.length > 1) {
            createWaterChart(data.results, searchParams.area);
        }
    }

    // ========== 13. 차트 생성 함수 (툴팁 기능 추가) ==========
    function createWaterChart(results, area) {
        // 계 행 제외한 데이터만 필터링
        const chartData = results.filter(row => row['생육단계'] !== '계');

        if (chartData.length === 0) return;

        const canvas = document.getElementById('waterChart');
        const ctx = canvas.getContext('2d');

        // Canvas 크기 설정
        canvas.width = canvas.offsetWidth;
        canvas.height = 400;

        // 데이터 추출
        const stages = chartData.map(row => row['생육단계']);
        const waterAmounts = chartData.map(row => {
            const amount = row['생육단계별 물 필요량(톤/1000m²)'];
            return parseFloat(amount.toString().replace(/,/g, '')) || 0;
        });

        // 차트 그리기
        const dataPoints = drawLineChart(ctx, stages, waterAmounts, canvas.width, canvas.height, area);

        // 기존 툴팁 제거
        const existingTooltip = document.getElementById('chartTooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // 툴팁 요소 생성
        const tooltip = document.createElement('div');
        tooltip.id = 'chartTooltip';
        tooltip.style.cssText = `
            position: fixed !important;
            background: rgba(0,0,0,0.9) !important;
            color: white !important;
            padding: 10px 14px !important;
            border-radius: 6px !important;
            font-size: 13px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            pointer-events: none !important;
            z-index: 9999 !important;
            display: none !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
            white-space: nowrap !important;
        `;
        document.body.appendChild(tooltip);

        // 기존 이벤트 리스너 제거
        const newCanvas = canvas.cloneNode(true);
        canvas.parentNode.replaceChild(newCanvas, canvas);
        const ctx2 = newCanvas.getContext('2d');

        // 차트 다시 그리기
        const newDataPoints = drawLineChart(ctx2, stages, waterAmounts, newCanvas.width, newCanvas.height, area);

        // 마우스 이벤트 추가
        newCanvas.addEventListener('mousemove', function(e) {
            const rect = newCanvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let foundPoint = null;
            let minDistance = Infinity;

            // 가장 가까운 포인트 찾기
            for (let i = 0; i < newDataPoints.length; i++) {
                const point = newDataPoints[i];
                const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
                if (distance <= 15 && distance < minDistance) {
                    minDistance = distance;
                    foundPoint = { ...point, index: i };
                }
            }

            if (foundPoint) {
                newCanvas.style.cursor = 'pointer';
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY - 35) + 'px';
                tooltip.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 4px;">${stages[foundPoint.index]}</div>
                    <div>물 필요량: ${waterAmounts[foundPoint.index].toFixed(1)}톤/${parseInt(area).toLocaleString()}m²</div>
                `;
            } else {
                newCanvas.style.cursor = 'default';
                tooltip.style.display = 'none';
            }
        });

        newCanvas.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
            newCanvas.style.cursor = 'default';
        });
    }

    function drawLineChart(ctx, labels, data, width, height, area) {
        const padding = 60;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        const dataPoints = []; // 데이터 포인트 위치 저장

        // 배경 지우기
        ctx.clearRect(0, 0, width, height);

        // 최대값, 최소값 계산
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const valueRange = maxValue - minValue || 1;

        // 축 그리기
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;

        // Y축
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();

        // X축
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // 격자선 그리기
        ctx.strokeStyle = '#f8f9fa';
        ctx.lineWidth = 0.5;

        // 수평 격자선
        for (let i = 1; i <= 5; i++) {
            const y = padding + (chartHeight * i / 6);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // 수직 격자선
        for (let i = 1; i < labels.length; i++) {
            const x = padding + (chartWidth * i / (labels.length - 1));
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }

        // 데이터 포인트 및 선 그리기
        ctx.strokeStyle = '#1f77b4';
        ctx.fillStyle = '#1f77b4';
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const x = padding + (chartWidth * i / (data.length - 1));
            const y = height - padding - ((data[i] - minValue) / valueRange) * chartHeight;

            // 데이터 포인트 위치 저장
            dataPoints.push({ x, y });

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // 데이터 포인트 그리기
        for (let i = 0; i < data.length; i++) {
            const x = dataPoints[i].x;
            const y = dataPoints[i].y;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        }

        // 레이블 그리기
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';

        // X축 레이블
        for (let i = 0; i < labels.length; i++) {
            const x = padding + (chartWidth * i / (labels.length - 1));
            ctx.fillText(labels[i], x, height - padding + 20);
        }

        // Y축 레이블
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = height - padding - (chartHeight * i / 5);
            const value = minValue + (valueRange * i / 5);
            ctx.fillText(value.toFixed(1), padding - 10, y + 4);
        }

        // 제목
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`생육단계별 물 필요량 (톤/${parseInt(area).toLocaleString()}m²)`, width / 2, 30);

        return dataPoints; // 데이터 포인트 위치 반환
    }

    // ========== 14. CSV 변환 함수 ==========
    function convertToCSV(data) {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });
        return csvRows.join('\n');
    }

    // ========== 15. 초기화 함수 수정 ==========
    function resetPlantingInfo() {
        recommendedSpan.textContent = '권장 파종·정식시기: ―';
        examDayInput.value = '';
        examDayInput.removeAttribute('min');
        examDayInput.removeAttribute('max');
        recommendedDates = [];
        allowedRanges = [];
        plantingDatesData = {};
        resultDiv.style.display = 'none';

        // ✅ 추가: 날짜 범위 안내 숨기기
        const dateRangeInfo = document.getElementById('date-range-info');
        if (dateRangeInfo) {
            dateRangeInfo.style.display = 'none';
        }
    }

    // ========== 16. 초기화 버튼 이벤트 (수정됨) ==========
    resetBtn?.addEventListener('click', function() {
        // 주소 관련 초기화
        addressInput.value = '';
        selectedSidoCode = '';
        selectedSggCode = '';
        selectedSidoName = '';
        selectedSggName = '';

        // 폼 초기화
        cropGbnSelect.value = '';
        cropGbnSelect.disabled = true;

        // 작물분류 옵션들을 모두 제거 (기본 옵션만 남김)
        while (cropGbnSelect.children.length > 1) {
            cropGbnSelect.removeChild(cropGbnSelect.lastChild);
        }

        cropSelect.innerHTML = '<option value="">작물</option>';
        examDayInput.value = '';
        weatherSelect.value = '3';
        irrigationSelect.value = '02';
        areaInput.value = '1000';
        resetPlantingInfo();
    });

    // ========== 17. 페이지 로드시 초기화 실행 ==========
    initializeSelects();
});