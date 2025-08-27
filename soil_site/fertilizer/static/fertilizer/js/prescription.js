// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        sido: document.getElementById('sido_cd'),
        sgg: document.getElementById('sgg_cd'),
        umd: document.getElementById('umd_cd'),
        ri: document.getElementById('ri_cd'),
        jibn: document.getElementById('sel_jibn'),
        examDay: document.getElementById('exam_day_search'),
        cropType: document.getElementById('crop_type'),
        cropCode: document.getElementById('crop_code'),
        riceQuality: document.getElementById('rice_fert'),
        searchBtn: document.getElementById('search'),
        resultArea: document.getElementById('result-area'),
        chemicalArea: document.getElementById('chemical-average-area'),
        addressCompleteSection: document.getElementById('address-complete-section')
    };

    const SIDO_NAMES = {
        "51": "강원특별자치도", "41": "경기도", "48": "경상남도", "47": "경상북도",
        "29": "광주광역시", "27": "대구광역시", "30": "대전광역시", "26": "부산광역시",
        "11": "서울특별시", "36": "세종특별자치시", "31": "울산광역시", "28": "인천광역시",
        "46": "전라남도", "52": "전북특별자치도", "50": "제주특별자치도",
        "44": "충청남도", "43": "충청북도"
    };

    const CROP_TYPES = {
        "00": "곡류(벼)", "01": "곡류(기타)", "02": "유지류", "03": "서류",
        "04": "과채류", "05": "근채류", "06": "인경채류", "07": "경엽채류",
        "08": "산채류", "09": "과수", "10": "약용작물", "11": "화훼류",
        "14": "사료작물", "12": "기타"
    };

    const LIME_FERTILIZERS = {
        "00001": "생석회", "00002": "소석회", "00003": "탄산석회", "00004": "석회고토",
        "00005": "부산소석회", "00006": "부산석회", "00007": "패화석"
    };

    const utils = {
        getCSRFToken: () => document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
        showLoading: () => setTimeout(() => {
            const overlay = document.getElementById('loading-overlay');
            overlay && (overlay.style.display = 'block');
        }, 2000),
        hideLoading: (timeoutId) => {
            clearTimeout(timeoutId);
            const overlay = document.getElementById('loading-overlay');
            overlay && (overlay.style.display = 'none');
        },
        updateOptions: (selectEl, options, defaultText, sortFn) => {
            selectEl.innerHTML = `<option value="">${defaultText}</option>`;
            if (!options) return;
            const entries = Object.entries(options);
            if (sortFn) entries.sort(sortFn);
            entries.forEach(([code, name]) => {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = name;
                selectEl.appendChild(option);
            });
        },
        resetChildOptions: (level) => {
            const resetMap = {
                'sido': ['sgg', 'umd', 'ri', 'jibn', 'examDay'],
                'sgg': ['umd', 'ri', 'jibn', 'examDay'],
                'umd': ['ri', 'jibn', 'examDay'],
                'ri': ['jibn', 'examDay'],
                'jibn': ['examDay']
            };
            const defaultTexts = { sgg: '시/군/구', umd: '읍/면/동', ri: '리', jibn: '지번선택', examDay: '토양검정일자' };

            if (resetMap[level]) {
                resetMap[level].forEach(key => {
                    const el = elements[key];
                    if (!el) return;
                    if (key === 'ri') {
                        utils.updateOptions(el, {}, defaultTexts[key]);
                        el.innerHTML = '<option value="">리</option>';
                    } else if (key === 'jibn' || key === 'examDay') {
                        utils.updateOptions(el, {}, defaultTexts[key]);
                    } else {
                        utils.updateOptions(el, {}, defaultTexts[key], (a, b) => a[1].localeCompare(b[1], 'ko'));
                    }
                });
            }
            utils.hideAddressCompleteSection();
            utils.removeChemicalSection();
        },
        hideAddressCompleteSection: () => {
            elements.addressCompleteSection.style.display = 'none';
            elements.jibn.disabled = true;
            elements.examDay.disabled = true;
        },
        showAddressCompleteSection: () => {
            elements.addressCompleteSection.style.display = 'block';
        },
        removeChemicalSection: () => {
            elements.chemicalArea.innerHTML = '';
        },
        displayChemicalAverage: async (sido_cd, sgg_cd, umd_cd, ri_cd) => {
            utils.removeChemicalSection();
            try {
                const result = await apiCall({
                    action: 'get_chemical_data',
                    sido_cd, sgg_cd, umd_cd,
                    ri_cd: ri_cd || '00'
                });
                if (result.success && result.data) {
                    utils.insertChemicalSection(result.data, sido_cd, sgg_cd, umd_cd, ri_cd);
                    return true;
                }
            } catch (error) {
                console.log('화학성 평균 데이터 조회 실패:', error);
            }
            return false;
        },
        insertChemicalSection: (chemicalData, sido_cd, sgg_cd, umd_cd, ri_cd) => {
            const getSelectedText = (selectElement) => {
                const selectedOption = selectElement.options[selectElement.selectedIndex];
                return selectedOption ? selectedOption.text : '';
            };
            const regionName = [
                SIDO_NAMES[sido_cd] || sido_cd,
                elements.sgg.value ? getSelectedText(elements.sgg) : '',
                elements.umd.value ? getSelectedText(elements.umd) : '',
                ri_cd && ri_cd !== '00' ? getSelectedText(elements.ri) : '전체'
            ].filter(Boolean).join(' ');
            elements.chemicalArea.innerHTML = createChemicalTable(regionName, chemicalData);
        }
    };

    function createChemicalTable(regionName, chemicalData) {
        const silicaCol = chemicalData.유효규산 ? '<th rowspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: center;">유효규산<br>(mg/kg)</th>' : '';
        const silicaData = chemicalData.유효규산 ? `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${chemicalData.유효규산}</td>` : '';
        const silicaRange = chemicalData.유효규산 ? '<td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #666; font-size: 0.9em;">130~180</td>' : '';

        return `
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h3> ${regionName} 화학성 평균</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f0f0f0;">
                            <th rowspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: center;">pH<br>(1:5)</th>
                            <th rowspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: center;">유기물<br>(g/kg)</th>
                            <th rowspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: center;">유효인산<br>(mg/kg)</th>
                            <th colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: center;">치환성 양이온(cmol⁺/kg)</th>
                            <th rowspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: center;">전기전도도<br>(dS/m)</th>
                            ${silicaCol}
                        </tr>
                        <tr style="background-color: #f0f0f0;">
                            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">칼륨</th>
                            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">칼슘</th>
                            <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">마그네슘</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            ${['pH', '유기물', '유효인산', '칼륨', '칼슘', '마그네슘', '전기전도도'].map(key => 
                                `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${chemicalData[key] || '-'}</td>`
                            ).join('')}
                            ${silicaData}
                        </tr>
                        <tr style="background-color: #f9f9f9;">
                            ${['6.0~7.0', '20~30', '300~550', '0.50~0.80', '5.0~6.0', '1.5~2.0', '0~30'].map(range => 
                                `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #666; font-size: 0.9em;">${range}</td>`
                            ).join('')}
                            ${silicaRange}
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    async function apiCall(data) {
        const timeoutId = utils.showLoading();
        try {
            const response = await fetch('/fertilizer/prescription/api/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': utils.getCSRFToken()
                },
                body: new URLSearchParams(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            utils.hideLoading(timeoutId);
            return result;
        } catch (error) {
            console.error('API 호출 오류:', error);
            utils.hideLoading(timeoutId);
            return { success: false, error: error.message };
        }
    }

    function createCropSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'crop-search-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; width: 500px; max-height: 600px; border-radius: 8px; overflow: hidden;">
                    <div style="padding: 20px; border-bottom: 1px solid #eee;">
                        <h3 style="margin: 0; font-size: 18px;">작물명 검색</h3>
                    </div>
                    <div style="padding: 20px;">
                        <input type="text" id="crop-search-input" placeholder="작물명을 입력하세요" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; margin-bottom: 15px; box-sizing: border-box;">
                        <div id="crop-search-results" style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px;">
                            <div style="padding: 20px; text-align: center; color: #666;">작물명을 입력하면 검색 결과가 표시됩니다.</div>
                        </div>
                    </div>
                    <div style="padding: 15px 20px; border-top: 1px solid #eee; text-align: right;">
                        <button id="crop-search-cancel" style="padding: 8px 15px; margin-right: 10px; background: #f5f5f5; border: 1px solid #ddd; cursor: pointer; border-radius: 4px;">취소</button>
                        <button id="crop-search-confirm" style="padding: 8px 15px; background: #6D4C41; color: white; border: none; cursor: pointer; border-radius: 4px;" disabled>선택</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    async function searchCrops(keyword) {
        if (!keyword || keyword.length < 1) return {};
        const result = await apiCall({
            action: 'search_crops',
            keyword: keyword
        });
        return result.success ? result.data : {};
    }

    function displaySearchResults(results, container, confirmBtn, modal) {
        container.innerHTML = '';
        confirmBtn.disabled = true;

        // 기존 이벤트 리스너 제거
        confirmBtn.onclick = null;

        if (Object.keys(results).length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">검색 결과가 없습니다.</div>';
            return null;
        }

        let selectedCrop = null;

        Object.entries(results).forEach(([code, cropInfo]) => {
            const item = document.createElement('div');
            item.style.cssText = 'padding: 10px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s;';
            item.innerHTML = `
                <div style="font-weight: bold;">${cropInfo.name}</div>
                <div style="font-size: 12px; color: #666; margin-top: 2px;">${cropInfo.type_name}</div>
            `;

            item.addEventListener('click', function() {
                // 모든 아이템의 선택 상태 초기화
                container.querySelectorAll('.search-result-item').forEach(el => {
                    el.style.backgroundColor = '';
                    el.classList.remove('selected');
                });

                // 현재 아이템 선택 표시
                this.style.backgroundColor = '#e3f2fd';
                this.classList.add('selected');

                selectedCrop = {
                    code,
                    name: cropInfo.name,
                    type_code: cropInfo.type_code
                };
                confirmBtn.disabled = false;
            });

            item.addEventListener('mouseenter', function() {
                if (!this.classList.contains('selected')) {
                    this.style.backgroundColor = '#f5f5f5';
                }
            });

            item.addEventListener('mouseleave', function() {
                if (!this.classList.contains('selected')) {
                    this.style.backgroundColor = '';
                }
            });

            item.className = 'search-result-item';
            container.appendChild(item);
        });

        // 확인 버튼 이벤트를 한 번만 설정
        confirmBtn.onclick = () => {
            if (selectedCrop) {
                // 작물 유형 먼저 설정
                elements.cropType.value = selectedCrop.type_code;
                elements.cropType.dispatchEvent(new Event('change'));

                // 작물 유형 변경 완료 후 작물 선택
                setTimeout(() => {
                    if (elements.cropCode.querySelector(`option[value="${selectedCrop.code}"]`)) {
                        elements.cropCode.value = selectedCrop.code;
                        elements.cropCode.dispatchEvent(new Event('change'));
                    }
                }, 300);

                // 모달창 종료
                modal.remove();
            }
        };

        return selectedCrop;
    }

    // 지역 선택 이벤트 핸들러들 (세종특별자치시 처리)
    elements.sido.addEventListener('change', async function() {
        utils.resetChildOptions('sido');
        if (!this.value) return;

        // 세종특별자치시는 시/군/구 건너뛰기
        if (this.value === '36') {
            // 세종시는 바로 읍/면/동으로
            const result = await apiCall({ action: 'get_region', code: '36110' });
            if (result.success) {
                // 시/군/구는 세종특별자치시로 고정
                elements.sgg.innerHTML = '<option value="110" selected>세종특별자치시</option>';
                elements.sgg.value = '110';
                elements.sgg.disabled = true;

                // 읍/면/동 옵션 업데이트
                utils.updateOptions(elements.umd, result.data,
                    Object.keys(result.data).length === 0 ? '없음' : '읍/면/동',
                    (a, b) => a[1].localeCompare(b[1], 'ko')
                );
            }
        } else {
            elements.sgg.disabled = false;
            const result = await apiCall({ action: 'get_region', code: this.value });
            if (result.success) {
                utils.updateOptions(elements.sgg, result.data, '시/군/구', (a, b) => a[1].localeCompare(b[1], 'ko'));
            } else {
                alert('시군구 조회 실패: ' + result.error);
            }
        }
    });

    elements.sgg.addEventListener('change', async function() {
        utils.resetChildOptions('sgg');
        if (!this.value || !elements.sido.value) return;

        const regionCode = elements.sido.value === '36' ? '36110' : `${elements.sido.value}${this.value}`;
        const result = await apiCall({ action: 'get_region', code: regionCode });

        if (result.success) {
            utils.updateOptions(elements.umd, result.data,
                Object.keys(result.data).length === 0 ? '없음' : '읍/면/동',
                (a, b) => a[1].localeCompare(b[1], 'ko')
            );
        } else {
            alert('읍면동 조회 실패: ' + result.error);
        }
    });

    elements.umd.addEventListener('change', async function() {
        utils.resetChildOptions('umd');
        if (!this.value || !elements.sido.value || (elements.sido.value !== '36' && !elements.sgg.value)) return;

        const regionCode = elements.sido.value === '36' ? '36110' : `${elements.sido.value}${elements.sgg.value}`;
        const result = await apiCall({ action: 'get_region', code: `${regionCode}${this.value}` });

        if (result.success) {
            if (Object.keys(result.data).length > 0) {
                utils.updateOptions(elements.ri, result.data, '리', (a, b) => a[1].localeCompare(b[1], 'ko'));
                const allOption = document.createElement('option');
                allOption.value = "00";
                allOption.textContent = "전체";
                elements.ri.insertBefore(allOption, elements.ri.children[1]);
            } else {
                elements.ri.innerHTML = '<option value="00">전체</option>';
                elements.ri.value = "00";
                elements.ri.disabled = true;
                await handleAddressComplete();
            }
        } else {
            alert('리 조회 실패: ' + result.error);
        }
    });

    elements.ri.addEventListener('change', async function() {
        utils.resetChildOptions('ri');
        if (!elements.sido.value || !elements.umd.value || (elements.sido.value !== '36' && !elements.sgg.value)) return;
        if (this.value) await handleAddressComplete();
    });

    async function handleAddressComplete() {
        const api_sido = elements.sido.value === '36' ? '36' : elements.sido.value;
        const api_sgg = elements.sido.value === '36' ? '110' : elements.sgg.value;
        const ri_cd = elements.ri.value || '00';

        await utils.displayChemicalAverage(api_sido, api_sgg, elements.umd.value, ri_cd);
        utils.showAddressCompleteSection();

        const regionCode = elements.sido.value === '36' ? '36110' : `${elements.sido.value}${elements.sgg.value}`;
        const result = await apiCall({
            action: 'get_jibn',
            sgg_cd: regionCode,
            umd_cd: `${elements.umd.value}${ri_cd}`
        });

        if (result.success) {
            utils.updateOptions(elements.jibn, result.data,
                Object.keys(result.data).length === 0 ? '지번이 없습니다' : '지번선택',
                (a, b) => {
                    const getNumber = (text) => {
                        const match = text.match(/\d+/);
                        return match ? parseInt(match[0]) : 0;
                    };
                    return getNumber(a[1]) - getNumber(b[1]);
                }
            );

            elements.jibn.disabled = Object.keys(result.data).length === 0;
            if (Object.keys(result.data).length === 0) {
                alert('선택한 지역에 처방된 지번이 존재하지 않습니다.');
            }
        } else {
            alert('지번 조회 실패: ' + result.error);
        }
    }

    elements.jibn.addEventListener('change', async function() {
        utils.updateOptions(elements.examDay, {}, '토양검정일자');
        elements.examDay.disabled = true;

        if (!this.value) return;

        const regionCode = elements.sido.value === '36' ? '36110' : `${elements.sido.value}${elements.sgg.value}`;
        const jibnParts = this.value.split(',');

        const result = await apiCall({
            action: 'get_exam_dates',
            sgg_cd: regionCode,
            umd_cd: `${elements.umd.value}${elements.ri.value || '00'}`,
            jibn: jibnParts[0],
            exam_type: jibnParts[1] || ''
        });

        if (result.success) {
            utils.updateOptions(elements.examDay, result.data,
                Object.keys(result.data).length === 0 ? '검정일자가 없습니다' : '토양검정일자',
                (a, b) => {
                    try {
                        const dateA = JSON.parse(a[0]).exam_day || '';
                        const dateB = JSON.parse(b[0]).exam_day || '';
                        return dateB.localeCompare(dateA);
                    } catch {
                        return b[1].localeCompare(a[1]);
                    }
                }
            );
            elements.examDay.disabled = Object.keys(result.data).length === 0;
        } else {
            alert('검정일자 조회 실패: ' + result.error);
        }
    });

    elements.cropType.addEventListener('change', async function() {
        utils.updateOptions(elements.cropCode, {}, '작물 선택');
        toggleRiceOptions(false);

        if (!this.value) return;

        const result = await apiCall({ action: 'get_crops', crop_type: this.value });
        if (result.success) {
            utils.updateOptions(elements.cropCode, result.data,
                Object.keys(result.data).length === 0 ? '작물이 없습니다' : '작물 선택',
                (a, b) => a[1].localeCompare(b[1], 'ko')
            );
        } else {
            alert('작물 조회 실패: ' + result.error);
        }

        toggleRiceOptions(this.value === '00');
    });

    function toggleRiceOptions(show) {
        const riceNotice = document.getElementById('rice-notice');
        const organicOption = document.getElementById('organic-option');

        elements.riceQuality.style.display = show ? 'inline-block' : 'none';
        if (riceNotice) riceNotice.style.display = show ? 'block' : 'none';
        if (organicOption) organicOption.style.display = show ? 'block' : 'none';
    }

    document.querySelector('.btn-crop-search')?.addEventListener('click', function() {
        const modal = createCropSearchModal();
        const searchInput = modal.querySelector('#crop-search-input');
        const resultsContainer = modal.querySelector('#crop-search-results');
        const cancelBtn = modal.querySelector('#crop-search-cancel');
        const confirmBtn = modal.querySelector('#crop-search-confirm');

        let searchTimeout = null;

        searchInput.addEventListener('input', function() {
            const keyword = this.value.trim();

            if (searchTimeout) clearTimeout(searchTimeout);

            searchTimeout = setTimeout(async () => {
                if (keyword.length >= 1) {
                    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">검색 중...</div>';
                    const results = await searchCrops(keyword);
                    displaySearchResults(results, resultsContainer, confirmBtn, modal);
                } else {
                    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">작물명을 입력하면 검색 결과가 표시됩니다.</div>';
                    confirmBtn.disabled = true;
                }
            }, 300);
        });

        cancelBtn.addEventListener('click', () => modal.remove());

        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });

        const escapeHandler = function(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        setTimeout(() => searchInput.focus(), 100);
    });

    async function displayResults(data, regionInfo) {
        if (!elements.resultArea) return;

        const { exam_data, fertilizer_data, fertilizer_recommendations, crop_info } = data;
        const regionName = [
            SIDO_NAMES[regionInfo.sido] || regionInfo.sido,
            regionInfo.sggName || '',
            regionInfo.umdName || '',
            regionInfo.riName || '전체'
        ].filter(Boolean).join(' ');

        // 화학성 평균 테이블 제거 (이미 handleAddressComplete에서 표시됨)
        elements.resultArea.innerHTML = `
            <div style="margin-top: 20px;">
                <h2> 비료처방 결과</h2>
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 10px 0;">
                    <h3> 선택 정보</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                        <div><strong>작물:</strong> ${crop_info.type_name} - ${crop_info.name}</div>
                        <div><strong>경지구분:</strong> ${exam_data.exam_type_str}</div>
                        <div><strong>면적:</strong> ${exam_data.area1}m²</div>
                        <div><strong>지역:</strong> ${regionName}</div>
                    </div>
                </div>
                ${createFertilizerTables(fertilizer_data)}
                ${createRecommendationSection(fertilizer_recommendations)}
                ${createCompoundFertilizerSection(fertilizer_recommendations)}
                ${crop_info.type_code !== '00' ? createLimeFertilizerSection(exam_data) : ''}
                ${createCompostSection()}
            </div>
        `;

        elements.resultArea.scrollIntoView({ behavior: 'smooth' });
        window.fertilizerRecommendations = fertilizer_recommendations;
        setupCompoundFertilizerEvents(exam_data, fertilizer_data, crop_info);
    }

    function createFertilizerTables(fertilizerData) {
        const createTable = (title, rows) => `<h4>${title}</h4><table style="width: 100%; border-collapse: collapse;"><tr style="background-color: #f0f0f0;"><th style="border: 1px solid #ddd; padding: 8px;">구분</th><th style="border: 1px solid #ddd; padding: 8px;">질소</th><th style="border: 1px solid #ddd; padding: 8px;">인산</th><th style="border: 1px solid #ddd; padding: 8px;">칼리</th></tr>${rows}</table>`;
        const createRow = (label, n, p, k) => `<tr><td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${label}</td><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${n || '0'}</td><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${p || '0'}</td><td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${k || '0'}</td></tr>`;

        return `<div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 10px 0;"><h3>️ 비료 성분량 및 추천량</h3><div style="display: flex; gap: 20px; margin-top: 10px;"><div style="flex: 1;">${createTable('성분량(kg/10a)', createRow('밑거름', fertilizerData.pre_N_300, fertilizerData.pre_P_300, fertilizerData.pre_K_300) + createRow('웃거름', fertilizerData.post_N_300, fertilizerData.post_P_300, fertilizerData.post_K_300))}</div><div style="flex: 1;">${createTable('추천량(kg/실면적)', createRow('밑거름', fertilizerData.pre_N1, fertilizerData.pre_P1, fertilizerData.pre_K1) + createRow('웃거름', fertilizerData.post_N1, fertilizerData.post_P1, fertilizerData.post_K1))}</div></div></div>`;
    }

    function createRecommendationSection(recommendations) {
        if (!recommendations.pre.length && !recommendations.post.length) return '';
        const createRankings = (recs, title) => recs.length > 0 ? `<div style="flex: 1;"><h4>${title}</h4>${recs.slice(0, 3).map((fert, i) => `<div style="background: white; border: 1px solid #e0e0e0; border-radius: 5px; padding: 8px; margin: 5px 0;"><strong>${i + 1}순위:</strong> ${fert.label_text}</div>`).join('')}</div>` : '';

        return `<div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 10px 0;"><h3> 복합비료(시중유통비료) 추천 순위</h3><div style="display: flex; gap: 20px; margin-top: 10px;">${createRankings(recommendations.pre, '밑거름')}${createRankings(recommendations.post, '웃거름')}</div><div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 4px; font-size: 0.9em; color: #1565c0;">※ 위 추천비료는 기준값에서 질소, 인산, 칼리 순으로 근접한 비료가 선정되었습니다.</div></div>`;
    }

    function createCompoundFertilizerSection(recommendations) {
        return `<div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 10px 0;"><h3>️ 복합비료 처방</h3><div style="margin: 15px 0;"><h4>처방방식 선택</h4><div style="display: flex; gap: 20px; margin: 10px 0;"><label><input type="radio" name="prescription_method" value="1" checked> 질소기준처방(기존방식)</label><label><input type="radio" name="prescription_method" value="2"> 인산기준처방</label><label><input type="radio" name="prescription_method" value="3"> 칼리기준처방</label></div></div>${createFertilizerStage('pre', '밑거름', recommendations)}${createFertilizerStage('post', '웃거름', recommendations)}</div>`;
    }

    function createFertilizerStage(stage, stageName, recommendations) {
        const hasRecs = recommendations[stage] && recommendations[stage].length > 0;
        return `<div style="margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px;"><h4>${stageName} 복합비료 처방 (kg/실면적)</h4><div style="margin: 10px 0;"><label style="font-weight: bold;">비종선택:</label><div style="display: flex; align-items: center; gap: 10px; margin: 5px 0;"><select id="${stage}_fertilizer_select" style="width: 300px;" ${!hasRecs ? 'disabled' : ''}><option value="">선택</option>${hasRecs ? recommendations[stage].slice(0, 3).map((fert, i) => `<option value="${fert.npk_key}">${i + 1}순위: ${fert.label_text}</option>`).join('') : ''}</select><label><input type="checkbox" id="${stage}_user_input" ${!hasRecs ? 'disabled' : ''}> 사용자 직접 입력</label></div></div>${!hasRecs ? `<div style="color: #888; font-style: italic;">ℹ️ ${stageName} 복합비료 추천 순위가 없어서 비종 선택 및 사용자 직접 입력이 불가능합니다.</div>` : ''}<div id="${stage}_fertilizer_inputs" style="margin: 10px 0;"><div style="display: flex; gap: 10px; align-items: center;"><div>질소(%): <span id="${stage}_n_display">0.0</span></div><div>인산(%): <span id="${stage}_p_display">0.0</span></div><div>칼리(%): <span id="${stage}_k_display">0.0</span></div><div>포대당(kg): <span id="${stage}_qy_display">20.0</span></div></div><div id="${stage}_user_inputs" style="display: none; margin-top: 10px;"><div style="display: flex; gap: 10px;"><input type="number" id="${stage}_n_input" placeholder="질소%" min="0" max="100" step="0.1" value="0.0"><input type="number" id="${stage}_p_input" placeholder="인산%" min="0" max="100" step="0.1" value="0.0"><input type="number" id="${stage}_k_input" placeholder="칼리%" min="0" max="100" step="0.1" value="0.0"><input type="number" id="${stage}_qy_input" placeholder="포대당kg" min="1" step="1" value="20"></div></div></div><div id="${stage}_calculation_result" style="margin: 10px 0; padding: 10px; background: #e8f5e8; border-radius: 4px; display: none;"><div style="font-weight: bold; margin-bottom: 5px;">${stageName} 복합비료 추천량</div><div style="display: flex; gap: 20px;"><div>복합비료 추천량 (kg): <span id="${stage}_result_total">0.0</span></div><div><span id="${stage}_additional_label1">인산 추가필요량</span> (kg): <span id="${stage}_result_add1">0.0</span></div><div><span id="${stage}_additional_label2">칼리 추가필요량</span> (kg): <span id="${stage}_result_add2">0.0</span></div></div></div></div>`;
    }

    function createLimeFertilizerSection(examData) {
        const ph = parseFloat(examData.acid || 0);
        const limeAmount = parseFloat(examData.limeamo || 0);
        const isDisabled = ph >= 6.5 || limeAmount === 0;

        return `<div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 10px 0;"><h3> 석회질비료 처방</h3><div style="margin: 10px 0;"><label style="font-weight: bold;">석회질비료 선택:</label><select id="lime_fertilizer_select" style="width: 200px;" ${isDisabled ? 'disabled' : ''}><option value="">석회질비료 선택</option>${Object.entries(LIME_FERTILIZERS).map(([code, name]) => `<option value="${code}">${name}</option>`).join('')}</select></div><div id="lime_calculation_result" style="margin: 10px 0; padding: 10px; background: #e8f5e8; border-radius: 4px; display: none;"><div style="font-weight: bold;">석회질비료 추천량</div><div>추천량 (kg/실면적): <span id="lime_result_amount">0.0</span></div></div>${isDisabled ? '<div style="color: #d32f2f; margin: 10px 0;">⚠️ pH가 6.5 이상이거나 석회소요량이 0인 검정자료의 경우 석회질비료를 선택할 수 없습니다.</div>' : ''}</div>`;
    }

    function createCompostSection() {
        return `<div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 10px 0;"><h3> 혼합가축분퇴비 처방</h3><div style="margin: 10px 0;"><h4>가축분 혼합 비율</h4><div style="display: flex; gap: 15px; margin: 10px 0;"><div>우분 (%): <input type="number" id="cow_ratio" min="0" max="50" step="1" value="25"></div><div>돈분 (%): <input type="number" id="pig_ratio" min="0" max="50" step="1" value="14"></div><div>계분 (%): <input type="number" id="fowl_ratio" min="0" max="50" step="1" value="26"></div><div>톱밥 (%): <input type="number" id="sawdust_ratio" min="0" max="50" step="1" value="21"></div></div><div id="ratio_warning" style="color: #d32f2f; display: none; margin: 5px 0;">❌ 가축분 혼합 비율의 합이 100%를 초과할 수 없습니다.</div><div id="compost_calculation_result" style="margin: 10px 0; padding: 10px; background: #e8f5e8; border-radius: 4px; display: none;"><div style="font-weight: bold; margin-bottom: 5px;">혼합가축분퇴비 추천량</div><div>추천량 (kg/실면적): <span id="compost_result_amount">0.0</span></div></div><div style="color: #666; font-size: 0.9em; margin: 10px 0; line-height: 1.4;">💡 퇴비에 가축분 혼합비율이 표기되어 있을 경우 입력하세요. (미입력시 평균값 적용)<br>우분, 돈분, 계분, 톱밥 중 한 종류가 50% 이상일 경우에는 기존의 개별 퇴비 추천량을 참고하면 됩니다.<br>유기물 적정범위를 초과할 경우에는 가축분퇴비 추천량이 계산되지 않습니다.</div></div></div>`;
    }

    function setupCompoundFertilizerEvents(examData, fertilizerData, cropInfo) {
        document.querySelectorAll('input[name="prescription_method"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const method = document.querySelector('input[name="prescription_method"]:checked')?.value || '1';
                const labelMap = { "1": ["인산 추가필요량", "칼리 추가필요량"], "2": ["질소 추가필요량", "칼리 추가필요량"], "3": ["질소 추가필요량", "인산 추가필요량"] };
                const [label1, label2] = labelMap[method];
                ['pre', 'post'].forEach(stage => {
                    const label1El = document.getElementById(`${stage}_additional_label1`);
                    const label2El = document.getElementById(`${stage}_additional_label2`);
                    if (label1El) label1El.textContent = label1;
                    if (label2El) label2El.textContent = label2;

                    // 처방방식 변경 시 현재 선택된 비료에 대해 재계산 수행
                    const select = document.getElementById(`${stage}_fertilizer_select`);
                    const checkbox = document.getElementById(`${stage}_user_input`);

                    if (select && select.value && window.fertilizerRecommendations) {
                        const fert = window.fertilizerRecommendations[stage].find(f => f.npk_key === select.value);
                        if (fert) {
                            calculateFertilizer(stage, fert.n, fert.p, fert.k, fert.qy, examData, fertilizerData, cropInfo);
                        }
                    } else if (checkbox && checkbox.checked) {
                        // 사용자 직접 입력의 경우
                        const n = parseFloat(document.getElementById(`${stage}_n_input`)?.value) || 0;
                        const p = parseFloat(document.getElementById(`${stage}_p_input`)?.value) || 0;
                        const k = parseFloat(document.getElementById(`${stage}_k_input`)?.value) || 0;
                        const qy = parseFloat(document.getElementById(`${stage}_qy_input`)?.value) || 20;

                        if (n + p + k > 0 && n + p + k <= 100) {
                            calculateFertilizer(stage, n, p, k, qy, examData, fertilizerData, cropInfo);
                        }
                    }
                });
            });
        });

        ['pre', 'post'].forEach(stage => {
            const select = document.getElementById(`${stage}_fertilizer_select`);
            const checkbox = document.getElementById(`${stage}_user_input`);
            const userInputs = document.getElementById(`${stage}_user_inputs`);

            if (!select) return;

            select.addEventListener('change', function() {
                // 먼저 기존 결과 완전히 숨기기
                hideFertilizerResult(stage);

                if (this.value && window.fertilizerRecommendations) {
                    const fert = window.fertilizerRecommendations[stage].find(f => f.npk_key === this.value);
                    if (fert) {
                        updateFertilizerDisplays(stage, fert.n, fert.p, fert.k, fert.qy);
                        calculateFertilizer(stage, fert.n, fert.p, fert.k, fert.qy, examData, fertilizerData, cropInfo);
                    }
                } else {
                    updateFertilizerDisplays(stage, 0, 0, 0, 20);
                }
            });

            checkbox?.addEventListener('change', function() {
                if (userInputs) userInputs.style.display = this.checked ? 'block' : 'none';
                if (this.checked) {
                    select.disabled = true;
                    select.value = '';
                    updateFertilizerDisplays(stage, 0, 0, 0, 20);
                    hideFertilizerResult(stage);
                    setupUserInputEvents(stage, examData, fertilizerData, cropInfo);
                } else {
                    select.disabled = false;
                    hideFertilizerResult(stage);
                }
            });
        });

        const limeSelect = document.getElementById('lime_fertilizer_select');
        if (limeSelect && !limeSelect.disabled) {
            limeSelect.addEventListener('change', function() {
                if (!this.value) {
                    document.getElementById('lime_calculation_result').style.display = 'none';
                    return;
                }
                calculateLimeFertilizer(this.value, examData);
            });
        }

        ['cow_ratio', 'pig_ratio', 'fowl_ratio', 'sawdust_ratio'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', function() {
                const sum = ['cow_ratio', 'pig_ratio', 'fowl_ratio', 'sawdust_ratio']
                    .map(id => parseFloat(document.getElementById(id)?.value) || 0)
                    .reduce((a, b) => a + b, 0);
                const warning = document.getElementById('ratio_warning');
                if (warning) warning.style.display = sum > 100 ? 'block' : 'none';
                if (sum <= 100 && sum > 0) {
                    calculateCompost(examData, fertilizerData, cropInfo);
                }
            });
        });
    }

    function updateFertilizerDisplays(stage, n, p, k, qy) {
        ['n', 'p', 'k', 'qy'].forEach((el, i) => {
            const display = document.getElementById(`${stage}_${el}_display`);
            if (display) display.textContent = [n, p, k, qy][i].toFixed(1);
        });
    }

    function setupUserInputEvents(stage, examData, fertilizerData, cropInfo) {
        ['n', 'p', 'k', 'qy'].forEach(type => {
            document.getElementById(`${stage}_${type}_input`)?.addEventListener('input', function() {
                const n = parseFloat(document.getElementById(`${stage}_n_input`).value) || 0;
                const p = parseFloat(document.getElementById(`${stage}_p_input`).value) || 0;
                const k = parseFloat(document.getElementById(`${stage}_k_input`).value) || 0;
                const qy = parseFloat(document.getElementById(`${stage}_qy_input`).value) || 20;

                updateFertilizerDisplays(stage, n, p, k, qy);

                if (n + p + k > 100) {
                    alert(`❌ ${stage === 'pre' ? '밑거름' : '웃거름'} 성분의 합이 100%를 초과할 수 없습니다.`);
                    return;
                }

                if (n + p + k > 0) {
                    calculateFertilizer(stage, n, p, k, qy, examData, fertilizerData, cropInfo);
                } else {
                    hideFertilizerResult(stage);
                }
            });
        });
    }

    async function calculateFertilizer(stage, n, p, k, qy, examData, fertilizerData, cropInfo) {
        const method = document.querySelector('input[name="prescription_method"]:checked')?.value || '1';
        const params = {
            action: 'calculate_fertilizer',
            exam_type: examData.exam_type || '',
            crop_cd: cropInfo.code,
            param_crop_gbn: cropInfo.type_code,
            prscrptn_cnd: method,
            rice_fert: cropInfo.type_code === '00' ? (elements.riceQuality.value || '') : '',
            [`nh_${stage}_fert_n`]: n.toString(),
            [`nh_${stage}_fert_p`]: p.toString(),
            [`nh_${stage}_fert_k`]: k.toString(),
            [`nh_${stage}_fert_qy`]: qy.toString(),
            [`nh_${stage === 'pre' ? 'post' : 'pre'}_fert_n`]: '0',
            [`nh_${stage === 'pre' ? 'post' : 'pre'}_fert_p`]: '0',
            [`nh_${stage === 'pre' ? 'post' : 'pre'}_fert_k`]: '0',
            [`nh_${stage === 'pre' ? 'post' : 'pre'}_fert_qy`]: '20',
            ...examData
        };

        const result = await apiCall(params);
        if (result.success && result.data && !result.data.error) {
            showFertilizerResult(stage, result.data);
        } else {
            hideFertilizerResult(stage);
        }
    }

    function showFertilizerResult(stage, data) {
        const resultDiv = document.getElementById(`${stage}_calculation_result`);
        if (!resultDiv) return;

        const total = parseFloat(data[`nh_${stage}_fertResultTotal`] || '0').toFixed(1);
        const add1 = parseFloat(data[`nh_${stage}_fertResultTotal2`] || '0').toFixed(1);
        const add2 = parseFloat(data[`nh_${stage}_fertResultTotal3`] || '0').toFixed(1);

        document.getElementById(`${stage}_result_total`).textContent = total;
        document.getElementById(`${stage}_result_add1`).textContent = add1;
        document.getElementById(`${stage}_result_add2`).textContent = add2;

        // 기존 경고 메시지 제거
        const existingWarning = resultDiv.querySelector('.warning-message');
        if (existingWarning) {
            existingWarning.remove();
        }

        resultDiv.style.display = 'block';

        if (parseFloat(total) <= 0) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'warning-message';
            warningDiv.style.cssText = 'color: #d32f2f; margin-top: 5px;';
            warningDiv.innerHTML = `⚠️ ${stage === 'pre' ? '밑거름' : '웃거름'} 복합비료 추천량이 0이므로 처방을 진행할 수 없습니다.`;
            resultDiv.appendChild(warningDiv);
        }
    }

    function hideFertilizerResult(stage) {
        const resultDiv = document.getElementById(`${stage}_calculation_result`);
        if (resultDiv) {
            resultDiv.style.display = 'none';
            // 경고 메시지도 함께 제거
            const existingWarning = resultDiv.querySelector('.warning-message');
            if (existingWarning) {
                existingWarning.remove();
            }
        }
    }

    async function calculateLimeFertilizer(limeCode, examData) {
        const result = await apiCall({
            action: 'calculate_lime_fertilizer',
            lime_code: limeCode,
            lime_amount: examData.limeamo || '0',
            area: examData.area1 || '0'
        });

        if (result.success && result.data) {
            const resultDiv = document.getElementById('lime_calculation_result');
            if (resultDiv) {
                document.getElementById('lime_result_amount').textContent =
                    parseFloat(result.data.lime_recommendation || '0').toFixed(1);
                resultDiv.style.display = 'block';
            }
        }
    }

    async function calculateCompost(examData, fertilizerData, cropInfo) {
        const ratios = ['cow_ratio', 'pig_ratio', 'fowl_ratio', 'sawdust_ratio']
            .map(id => parseFloat(document.getElementById(id).value) || [25, 14, 26, 21][['cow_ratio', 'pig_ratio', 'fowl_ratio', 'sawdust_ratio'].indexOf(id)]);

        if (ratios.reduce((a, b) => a + b, 0) > 100) return;

        const params = {
            action: 'calculate_compost',
            cow_ratio: ratios[0].toString(),
            pig_ratio: ratios[1].toString(),
            fowl_ratio: ratios[2].toString(),
            sawdust_ratio: ratios[3].toString(),
            crop_cd: cropInfo.code,
            area: examData.area1 || '0',
            organic_matter: examData.organic || '0',
            ...examData
        };

        const result = await apiCall(params);
        if (result.success && result.data) {
            const resultDiv = document.getElementById('compost_calculation_result');
            if (resultDiv) {
                document.getElementById('compost_result_amount').textContent =
                    parseFloat(result.data.compost_recommendation || '0').toFixed(1);
                resultDiv.style.display = 'block';
            }
        }
    }

    elements.searchBtn.addEventListener('click', async function() {
        const validations = [
            { condition: !elements.sido.value, message: '광역시/도를 선택해주세요.' },
            { condition: elements.sido.value !== '36' && !elements.sgg.value, message: '시/군/구를 선택해주세요.' },
            { condition: !elements.umd.value, message: '읍/면/동을 선택해주세요.' },
            { condition: !elements.jibn.value, message: '지번을 선택해주세요.' },
            { condition: !elements.examDay.value, message: '토양검정일자를 선택해주세요.' },
            { condition: !elements.cropType.value, message: '작물유형을 선택해주세요.' },
            { condition: !elements.cropCode.value, message: '작물을 선택해주세요.' },
            { condition: elements.cropType.value === '00' && !elements.riceQuality.value, message: '벼 선택시 품질을 선택해주세요.' }
        ];

        const failedValidation = validations.find(v => v.condition);
        if (failedValidation) {
            alert(failedValidation.message);
            return;
        }

        try {
            const examData = JSON.parse(elements.examDay.value);
            const organicAt = document.querySelector('input[name="organicAt"]:checked')?.value || 'N';

            const fertilizerResult = await apiCall({
                action: 'get_fertilizer_prescription',
                exam_data: JSON.stringify(examData),
                crop_code: elements.cropCode.value,
                rice_fert: elements.riceQuality.value || '',
                organic_at: organicAt
            });

            if (!fertilizerResult.success) {
                alert('비료처방 데이터 조회 실패: ' + fertilizerResult.error);
                return;
            }

            const recommendationResult = await apiCall({
                action: 'get_fertilizer_recommendations',
                pre_n: fertilizerResult.data.pre_N_300 || '0',
                pre_p: fertilizerResult.data.pre_P_300 || '0',
                pre_k: fertilizerResult.data.pre_K_300 || '0',
                post_n: fertilizerResult.data.post_N_300 || '0',
                post_p: fertilizerResult.data.post_P_300 || '0',
                post_k: fertilizerResult.data.post_K_300 || '0',
                crop_code: elements.cropCode.value,
                crop_gbn: elements.cropType.value
            });

            const getOptions = (selectEl) => {
                const options = {};
                Array.from(selectEl.options).forEach(option => {
                    if (option.value) options[option.value] = option.text;
                });
                return options;
            };

            const cropOptions = getOptions(elements.cropCode);
            const sggOptions = getOptions(elements.sgg);
            const umdOptions = getOptions(elements.umd);
            const riOptions = getOptions(elements.ri);

            const cropInfo = {
                name: cropOptions[elements.cropCode.value] || elements.cropCode.value,
                type_name: CROP_TYPES[elements.cropType.value] || elements.cropType.value,
                code: elements.cropCode.value,
                type_code: elements.cropType.value
            };

            const regionInfo = {
                sido: elements.sido.value,
                sgg: elements.sido.value === '36' ? '110' : elements.sgg.value,
                umd: elements.umd.value,
                ri: elements.ri.value,
                sggName: elements.sido.value === '36' ? '세종특별자치시' : sggOptions[elements.sgg.value],
                umdName: umdOptions[elements.umd.value],
                riName: riOptions[elements.ri.value]
            };

            await displayResults({
                exam_data: examData,
                fertilizer_data: fertilizerResult.data,
                fertilizer_recommendations: recommendationResult.success ? recommendationResult.data : { pre: [], post: [] },
                crop_info: cropInfo
            }, regionInfo);

        } catch (error) {
            console.error('비료처방 검색 오류:', error);
            alert('비료처방 검색 중 오류가 발생했습니다: ' + error.message);
        }
    });

    toggleRiceOptions(false);
    utils.hideAddressCompleteSection();
});