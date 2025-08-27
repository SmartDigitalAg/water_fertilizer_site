// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소들
    const elements = {
        cropType: document.getElementById('crop_type'),
        cropCode: document.getElementById('crop_code'),
        riceQuality: document.getElementById('rice_fert'),
        searchBtn: document.getElementById('search'),
        area: document.getElementById('area'),
        // 화학성 분석값 입력 필드들
        ph: document.getElementById('ph'),
        om: document.getElementById('om'),
        available_p: document.getElementById('available_p'),
        k: document.getElementById('k'),
        ca: document.getElementById('ca'),
        mg: document.getElementById('mg'),
        sio2: document.getElementById('sio2'),
        ec: document.getElementById('ec'),
        lime: document.getElementById('lime'),
        no3_n: document.getElementById('no3_n'),
        cec: document.getElementById('cec'),
        nh4_n: document.getElementById('nh4_n')
    };

    // 전역 데이터 저장
    window.fertilizerData = null;

    const CROP_TYPES = {
        "00": "곡류(벼)", "01": "곡류(기타)", "02": "유지류", "03": "서류",
        "04": "과채류", "05": "근채류", "06": "인경채류", "07": "경엽채류",
        "08": "산채류", "09": "과수", "10": "약용작물", "11": "화훼류",
        "14": "사료작물", "12": "기타"
    };

    const utils = {
        getCSRFToken: () => document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',

        updateOptions: (selectEl, options, defaultText) => {
            selectEl.innerHTML = `<option value="">${defaultText}</option>`;
            if (!options) return;
            Object.entries(options).forEach(([code, name]) => {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = name;
                selectEl.appendChild(option);
            });
        },

        showLoading: () => {
            const overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 9999;
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 18px;
            `;
            overlay.innerHTML = '<div>데이터를 조회하고 있습니다...</div>';
            document.body.appendChild(overlay);
            return overlay;
        },

        hideLoading: (overlay) => {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }
    };

    // API 호출 함수
    async function apiCall(data) {
        try {
            const response = await fetch('/fertilizer/experience_api/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': utils.getCSRFToken()
                },
                body: new URLSearchParams(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API 호출 오류:', error);
            return { success: false, error: error.message };
        }
    }

    // 작물 유형 변경 이벤트
    elements.cropType.addEventListener('change', async function() {
        utils.updateOptions(elements.cropCode, {}, '작물 선택');
        toggleRiceOptions(false);

        if (!this.value) return;

        const result = await apiCall({
            action: 'get_crops',
            crop_type: this.value
        });

        if (result.success) {
            utils.updateOptions(elements.cropCode, result.data, '작물 선택');
        } else {
            alert('작물 조회 실패: ' + result.error);
        }

        toggleRiceOptions(this.value === '00');
    });

    // 벼 관련 옵션 표시/숨김
    function toggleRiceOptions(show) {
        const riceNotice = document.getElementById('rice-notice');
        const organicOption = document.getElementById('organic-option');
        const sio2Span = document.getElementById('span_sio2');
        const ecSpan = document.getElementById('span_ec');

        elements.riceQuality.style.display = show ? 'inline-block' : 'none';
        if (riceNotice) riceNotice.style.display = show ? 'block' : 'none';
        if (organicOption) organicOption.style.display = show ? 'block' : 'none';

        // 필수 입력 표시 변경
        if (sio2Span) sio2Span.innerHTML = show ? '(*)' : '';
        if (ecSpan) ecSpan.innerHTML = show ? '' : '(*)';
    }

    // 작물명 검색 모달 생성
    function createCropSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'crop-search-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 2000;
            display: flex; align-items: center; justify-content: center;
        `;

        modal.innerHTML = `
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
        `;

        document.body.appendChild(modal);
        return modal;
    }

    // 작물 검색 함수
    async function searchCrops(keyword) {
        if (!keyword || keyword.length < 1) return {};

        const result = await apiCall({
            action: 'search_crops',
            keyword: keyword
        });

        return result.success ? result.data : {};
    }

    // 검색 결과 표시
    function displaySearchResults(results, container, confirmBtn, modal) {
        container.innerHTML = '';
        confirmBtn.disabled = true;
        confirmBtn.onclick = null;

        if (Object.keys(results).length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">검색 결과가 없습니다.</div>';
            return null;
        }

        let selectedCrop = null;

        Object.entries(results).forEach(([code, cropInfo]) => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 10px; border-bottom: 1px solid #f0f0f0; 
                cursor: pointer; transition: background 0.2s;
            `;
            item.innerHTML = `
                <div style="font-weight: bold;">${cropInfo.name}</div>
                <div style="font-size: 12px; color: #666; margin-top: 2px;">${cropInfo.type_name}</div>
            `;

            item.addEventListener('click', function() {
                container.querySelectorAll('.search-result-item').forEach(el => {
                    el.style.backgroundColor = '';
                    el.classList.remove('selected');
                });

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

        confirmBtn.onclick = () => {
            if (selectedCrop) {
                elements.cropType.value = selectedCrop.type_code;
                elements.cropType.dispatchEvent(new Event('change'));

                setTimeout(() => {
                    if (elements.cropCode.querySelector(`option[value="${selectedCrop.code}"]`)) {
                        elements.cropCode.value = selectedCrop.code;
                        elements.cropCode.dispatchEvent(new Event('change'));
                    }
                }, 300);

                modal.remove();
            }
        };

        return selectedCrop;
    }

    // 작물명 검색 버튼 이벤트
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

    // 결과 표시 함수
    function displayResults(data) {
        const resultHtml = `
            <div id="result-area" style="margin-top: 30px;">
                <h2>비료사용처방 결과</h2>
                
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <h3>선택 정보</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 10px;">
                        <div><strong>경지구분:</strong> ${document.querySelector('input[name="field_type"]:checked').value}</div>
                        <div><strong>작물:</strong> ${CROP_TYPES[elements.cropType.value]} - ${elements.cropCode.options[elements.cropCode.selectedIndex].text}</div>
                        <div><strong>면적:</strong> ${elements.area.value} ${document.querySelector('input[name="area_gb"]:checked').value}</div>
                        ${elements.cropType.value === '00' && elements.riceQuality.value ? `<div><strong>품질:</strong> ${elements.riceQuality.options[elements.riceQuality.selectedIndex].text}</div>` : ''}
                    </div>
                </div>

                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <h3>비료 성분량 및 추천량</h3>
                    <div style="display: flex; gap: 20px; margin-top: 15px;">
                        <div style="flex: 1;">
                            <h4>성분량(kg/10a)</h4>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="background-color: #f0f0f0;">
                                    <th style="border: 1px solid #ddd; padding: 8px;">구분</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">질소</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">인산</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">칼리</th>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">밑거름</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.pre_N_300 || '0'}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.pre_P_300 || '0'}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.pre_K_300 || '0'}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">웃거름</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.post_N_300 || '0'}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.post_P_300 || '0'}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.post_K_300 || '0'}</td>
                                </tr>
                            </table>
                        </div>
                        <div style="flex: 1;">
                            <h4>추천량(kg/실면적)</h4>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="background-color: #f0f0f0;">
                                    <th style="border: 1px solid #ddd; padding: 8px;">구분</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">요소</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">용성인비</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">염화칼리</th>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">밑거름</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.pre_N1 || '0'}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.pre_P1 || '0'}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.pre_K1 || '0'}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">웃거름</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.post_N1 || '0'}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.post_P1 || '0'}</td>
                                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${data.post_K1 || '0'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>

                ${data.fertilizer_recommendations && (data.fertilizer_recommendations.pre.length > 0 || data.fertilizer_recommendations.post.length > 0) ? `
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <h3>복합비료(시중유통비료) 추천 순위</h3>
                    <div style="display: flex; gap: 20px; margin-top: 15px;">
                        ${createRecommendationColumn('밑거름', data.fertilizer_recommendations.pre)}
                        ${createRecommendationColumn('웃거름', data.fertilizer_recommendations.post)}
                    </div>
                    <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 4px; font-size: 0.9em; color: #1565c0;">
                        ※ 위 추천비료는 기준값에서 질소, 인산, 칼리 순으로 근접한 비료가 선정되었습니다.
                    </div>
                </div>
                ` : ''}

                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <h3>복합비료 처방</h3>
                    <div style="margin: 15px 0;">
                        <h4>복합비료 처방방식</h4>
                        <div style="display: flex; gap: 20px; margin: 10px 0;">
                            <label><input type="radio" name="prescription_method" value="1" checked> 질소기준처방(기존방식)</label>
                            <label><input type="radio" name="prescription_method" value="2"> 인산기준처방</label>
                            <label><input type="radio" name="prescription_method" value="3"> 칼리기준처방</label>
                        </div>
                    </div>
                    ${createCompoundFertilizerSection('pre', '밑거름', data)}
                    ${createCompoundFertilizerSection('post', '웃거름', data)}
                </div>

                ${elements.cropType.value !== '00' ? createLimeFertilizerSection(data) : ''}

                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <h3>혼합가축분퇴비 처방</h3>
                    <div style="margin: 15px 0;">
                        <h4>가축분 혼합 비율</h4>
                        <div style="display: flex; gap: 15px; margin: 10px 0;">
                            <div>우분 (%): <input type="number" id="cow_ratio" min="0" max="50" step="1" value="25"></div>
                            <div>돈분 (%): <input type="number" id="pig_ratio" min="0" max="50" step="1" value="14"></div>
                            <div>계분 (%): <input type="number" id="fowl_ratio" min="0" max="50" step="1" value="26"></div>
                            <div>톱밥 (%): <input type="number" id="sawdust_ratio" min="0" max="50" step="1" value="21"></div>
                        </div>
                        <div style="color: #666; font-size: 0.9em; margin: 10px 0; line-height: 1.4;">
                            퇴비에 가축분 혼합비율이 표기되어 있을 경우 입력하세요. (미입력시 평균값 적용)<br>
                            우분, 돈분, 계분, 톱밥 중 한 종류가 50% 이상일 경우에는 기존의 개별 퇴비 추천량을 참고하면 됩니다.<br>
                            유기물 적정범위를 초과할 경우에는 가축분퇴비 추천량이 계산되지 않습니다.
                        </div>
                    </div>
                </div>     
            </div>
        `;

        // 기존 결과 영역이 있으면 제거
        const existingResult = document.getElementById('result-area');
        if (existingResult) {
            existingResult.remove();
        }

        // 새 결과를 container 다음에 추가 (페이지 맨 아래)
        const container = document.querySelector('.container');
        container.insertAdjacentHTML('beforeend', resultHtml);

        // 전역 데이터 저장
        window.fertilizerData = data;

        // 이벤트 핸들러 설정
        setupCompoundFertilizerEvents(data);

        // 결과 영역으로 스크롤
        document.getElementById('result-area').scrollIntoView({ behavior: 'smooth' });
    }

    // 추천 컬럼 생성
    function createRecommendationColumn(title, recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return `<div style="flex: 1;"><h4>${title}</h4><div style="color: #666;">추천 정보가 없습니다.</div></div>`;
        }

        return `
            <div style="flex: 1;">
                <h4>${title}</h4>
                ${recommendations.slice(0, 3).map((fert, i) => `
                    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 5px; padding: 8px; margin: 5px 0;">
                        <strong>${i + 1}순위:</strong> ${fert.label_text}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 복합비료 섹션 생성
    function createCompoundFertilizerSection(stage, stageName, data) {
        const hasRecommendations = data.fertilizer_recommendations && data.fertilizer_recommendations[stage] && data.fertilizer_recommendations[stage].length > 0;

        return `
            <div style="margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h4>${stageName} 복합비료 처방 (kg/실면적)</h4>
                <div style="margin: 10px 0;">
                    <label style="font-weight: bold;">비종선택:</label>
                    <div style="display: flex; align-items: center; gap: 10px; margin: 5px 0;">
                        <select id="${stage}_fertilizer_select" style="width: 300px;" ${!hasRecommendations ? 'disabled' : ''}>
                            <option value="">선택</option>
                            ${hasRecommendations ? data.fertilizer_recommendations[stage].slice(0, 3).map((fert, i) => 
                                `<option value="${fert.npk_key}">${i + 1}순위: ${fert.label_text}</option>`
                            ).join('') : ''}
                        </select>
                        <label><input type="checkbox" id="${stage}_user_input" ${!hasRecommendations ? 'disabled' : ''}> 사용자 직접 입력</label>
                    </div>
                </div>
                
                ${!hasRecommendations ? `
                    <div style="color: #888; font-style: italic;">
                        ℹ️ ${stageName} 복합비료 추천 순위가 없어서 비종 선택 및 사용자 직접 입력이 불가능합니다.
                    </div>
                ` : ''}
                
                <div id="${stage}_fertilizer_inputs" style="margin: 10px 0;">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div>질소(%): <span id="${stage}_n_display">0.0</span></div>
                        <div>인산(%): <span id="${stage}_p_display">0.0</span></div>
                        <div>칼리(%): <span id="${stage}_k_display">0.0</span></div>
                        <div>포대당(kg): <span id="${stage}_qy_display">20.0</span></div>
                    </div>
                    <div id="${stage}_user_inputs" style="display: none; margin-top: 10px;">
                        <div style="display: flex; gap: 10px;">
                            <input type="number" id="${stage}_n_input" placeholder="질소%" min="0" max="100" step="0.1" value="0.0">
                            <input type="number" id="${stage}_p_input" placeholder="인산%" min="0" max="100" step="0.1" value="0.0">
                            <input type="number" id="${stage}_k_input" placeholder="칼리%" min="0" max="100" step="0.1" value="0.0">
                            <input type="number" id="${stage}_qy_input" placeholder="포대당kg" min="1" step="1" value="20">
                        </div>
                    </div>
                </div>
                
                <div id="${stage}_calculation_result" style="margin: 10px 0; padding: 10px; background: #e8f5e8; border-radius: 4px; display: none;">
                    <div style="font-weight: bold; margin-bottom: 5px;">${stageName} 복합비료 추천량</div>
                    <div style="display: flex; gap: 20px;">
                        <div>복합비료 추천량 (kg): <span id="${stage}_result_total">0.0</span></div>
                        <div><span id="${stage}_additional_label1">인산 추가필요량</span> (kg): <span id="${stage}_result_add1">0.0</span></div>
                        <div><span id="${stage}_additional_label2">칼리 추가필요량</span> (kg): <span id="${stage}_result_add2">0.0</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    // 석회질비료 섹션 생성
    function createLimeFertilizerSection(data) {
        const ph = parseFloat(elements.ph.value || 0);
        const limeAmount = parseFloat(elements.lime.value || 0);
        const isDisabled = ph >= 6.5 || limeAmount === 0;

        const LIME_FERTILIZERS = {
            "00001": "생석회", "00002": "소석회", "00003": "탄산석회", "00004": "석회고토",
            "00005": "부산소석회", "00006": "부산석회", "00007": "패화석"
        };

        return `
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h3>석회질비료 선택</h3>
                <div style="margin: 10px 0;">
                    <label style="font-weight: bold;">석회질비료 선택:</label>
                    <select id="lime_fertilizer_select" style="width: 200px;" ${isDisabled ? 'disabled' : ''}>
                        <option value="">석회질비료 선택</option>
                        ${Object.entries(LIME_FERTILIZERS).map(([code, name]) => 
                            `<option value="${code}">${name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div id="lime_calculation_result" style="margin: 10px 0; padding: 10px; background: #e8f5e8; border-radius: 4px; display: none;">
                    <div style="font-weight: bold;">석회질비료 추천량</div>
                    <div>추천량 (kg/실면적): <span id="lime_result_amount">0.0</span></div>
                </div>
                ${isDisabled ? `
                    <div style="color: #d32f2f; margin: 10px 0;">
                        ⚠️ pH가 6.5 이상이거나 석회소요량이 0인 경우 석회질비료를 선택할 수 없습니다.
                    </div>
                ` : ''}
            </div>
        `;
    }

    // 복합비료 이벤트 설정
    function setupCompoundFertilizerEvents(data) {
        // 처방방식 변경 이벤트
        document.querySelectorAll('input[name="prescription_method"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const method = document.querySelector('input[name="prescription_method"]:checked')?.value || '1';
                const labelMap = {
                    "1": ["인산 추가필요량", "칼리 추가필요량"],
                    "2": ["질소 추가필요량", "칼리 추가필요량"],
                    "3": ["질소 추가필요량", "인산 추가필요량"]
                };
                const [label1, label2] = labelMap[method];

                ['pre', 'post'].forEach(stage => {
                    const label1El = document.getElementById(`${stage}_additional_label1`);
                    const label2El = document.getElementById(`${stage}_additional_label2`);
                    if (label1El) label1El.textContent = label1;
                    if (label2El) label2El.textContent = label2;

                    // 처방방식 변경 시 현재 선택된 비료에 대해 재계산
                    const select = document.getElementById(`${stage}_fertilizer_select`);
                    const checkbox = document.getElementById(`${stage}_user_input`);

                    if (select && select.value && data.fertilizer_recommendations && data.fertilizer_recommendations[stage]) {
                        const fert = data.fertilizer_recommendations[stage].find(f => f.npk_key === select.value);
                        if (fert) {
                            calculateFertilizer(stage, fert.n, fert.p, fert.k, fert.qy, data);
                        }
                    } else if (checkbox && checkbox.checked) {
                        // 사용자 직접 입력의 경우
                        const n = parseFloat(document.getElementById(`${stage}_n_input`)?.value) || 0;
                        const p = parseFloat(document.getElementById(`${stage}_p_input`)?.value) || 0;
                        const k = parseFloat(document.getElementById(`${stage}_k_input`)?.value) || 0;
                        const qy = parseFloat(document.getElementById(`${stage}_qy_input`)?.value) || 20;

                        if (n + p + k > 0 && n + p + k <= 100) {
                            calculateFertilizer(stage, n, p, k, qy, data);
                        }
                    }
                });
            });
        });

        // 각 단계별 이벤트 설정
        ['pre', 'post'].forEach(stage => {
            setupStageEvents(stage, data);
        });

        // 석회질비료 이벤트 (벼가 아닌 경우에만)
        if (elements.cropType.value !== '00') {
            const limeSelect = document.getElementById('lime_fertilizer_select');
            if (limeSelect && !limeSelect.disabled) {
                limeSelect.addEventListener('change', function() {
                    if (!this.value) {
                        document.getElementById('lime_calculation_result').style.display = 'none';
                        return;
                    }
                    calculateLimeFertilizer(this.value, data);
                });
            }
        }
    }

    // 단계별 이벤트 설정
    function setupStageEvents(stage, data) {
        const select = document.getElementById(`${stage}_fertilizer_select`);
        const checkbox = document.getElementById(`${stage}_user_input`);
        const userInputs = document.getElementById(`${stage}_user_inputs`);

        if (!select) return;

        // 비료 선택 이벤트
        select.addEventListener('change', function() {
            hideFertilizerResult(stage);

            if (this.value && data.fertilizer_recommendations) {
                const fert = data.fertilizer_recommendations[stage].find(f => f.npk_key === this.value);
                if (fert) {
                    updateFertilizerDisplays(stage, fert.n, fert.p, fert.k, fert.qy);
                    calculateFertilizer(stage, fert.n, fert.p, fert.k, fert.qy, data);
                }
            } else {
                updateFertilizerDisplays(stage, 0, 0, 0, 20);
            }
        });

        // 사용자 직접 입력 체크박스 이벤트
        checkbox?.addEventListener('change', function() {
            if (userInputs) userInputs.style.display = this.checked ? 'block' : 'none';
            if (this.checked) {
                select.disabled = true;
                select.value = '';
                updateFertilizerDisplays(stage, 0, 0, 0, 20);
                hideFertilizerResult(stage);
                setupUserInputEvents(stage, data);
            } else {
                select.disabled = false;
                hideFertilizerResult(stage);
            }
        });
    }

    // 사용자 입력 이벤트 설정
    function setupUserInputEvents(stage, data) {
        ['n', 'p', 'k', 'qy'].forEach(type => {
            const input = document.getElementById(`${stage}_${type}_input`);
            if (input) {
                input.addEventListener('input', function() {
                    const n = parseFloat(document.getElementById(`${stage}_n_input`).value) || 0;
                    const p = parseFloat(document.getElementById(`${stage}_p_input`).value) || 0;
                    const k = parseFloat(document.getElementById(`${stage}_k_input`).value) || 0;
                    const qy = parseFloat(document.getElementById(`${stage}_qy_input`).value) || 20;

                    updateFertilizerDisplays(stage, n, p, k, qy);

                    if (n + p + k > 100) {
                        alert(`${stage === 'pre' ? '밑거름' : '웃거름'} 성분의 합이 100%를 초과할 수 없습니다.`);
                        return;
                    }

                    if (n + p + k > 0) {
                        calculateFertilizer(stage, n, p, k, qy, data);
                    } else {
                        hideFertilizerResult(stage);
                    }
                });
            }
        });
    }

    // 비료 표시 업데이트
    function updateFertilizerDisplays(stage, n, p, k, qy) {
        ['n', 'p', 'k', 'qy'].forEach((el, i) => {
            const display = document.getElementById(`${stage}_${el}_display`);
            if (display) display.textContent = [n, p, k, qy][i].toFixed(1);
        });
    }

    // 복합비료 계산 - Streamlit 로직 기반으로 수정
    async function calculateFertilizer(stage, n, p, k, qy, baseData) {
        const method = document.querySelector('input[name="prescription_method"]:checked')?.value || '1';

        // 면적 계산
        const areaValue = parseFloat(elements.area.value);
        const areaUnit = document.querySelector('input[name="area_gb"]:checked').value;
        const area1 = areaUnit === '㎡' ? areaValue : areaValue * 3.3058;
        const area2 = areaUnit === '㎡' ? areaValue * 0.3025 : areaValue;

        // Streamlit과 동일한 파라미터 구성
        const params = {
            exam_type: getFieldType(),
            [`nh_${stage}_fert_n`]: n.toString(),
            [`nh_${stage}_fert_p`]: p.toString(),
            [`nh_${stage}_fert_k`]: k.toString(),
            [`nh_${stage}_fert_qy`]: qy.toString(),
            // 반대편 단계는 0으로 설정
            [`nh_${stage === 'pre' ? 'post' : 'pre'}_fert_n`]: '0',
            [`nh_${stage === 'pre' ? 'post' : 'pre'}_fert_p`]: '0',
            [`nh_${stage === 'pre' ? 'post' : 'pre'}_fert_k`]: '0',
            [`nh_${stage === 'pre' ? 'post' : 'pre'}_fert_qy`]: '20',
            // 퇴비 기본값
            cow_drop_qy: '25',
            pig_drop_qy: '14',
            fowl_drop_qy: '26',
            sawdust_drop_qy: '21',
            checkProgram: 'main',
            type: 'S',
            flag: 'COMPUTE',
            // 토양 화학성 데이터
            acid: elements.ph.value,
            om: elements.om.value,
            vldpha: elements.available_p.value,
            posifert_k: elements.k.value,
            posifert_ca: elements.ca.value,
            posifert_mg: elements.mg.value,
            vldsia: elements.sio2.value || '',
            selc: elements.ec.value || '',
            limeamo: elements.lime.value || '',
            cec: elements.cec.value || '',
            nit: elements.no3_n.value || '',
            ammo: elements.nh4_n.value || '',
            // 작물 및 기타 정보
            area1: area1.toString(),
            area2: area2.toString(),
            crop_cd: elements.cropCode.value,
            rice_fert: elements.cropType.value === '00' ? elements.riceQuality.value : '',
            param_crop_gbn: elements.cropType.value,
            prscrptn_cnd: method  // 처방방식 적용
        };

        const result = await apiCall({
            action: 'calculate_fertilizer',
            ...params
        });

        if (result.success && result.data && !result.data.error) {
            showFertilizerResult(stage, result.data);
        } else {
            hideFertilizerResult(stage);
            console.error('계산 오류:', result);
        }
    }

    // 비료 결과 표시
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

    // 비료 결과 숨김
    function hideFertilizerResult(stage) {
        const resultDiv = document.getElementById(`${stage}_calculation_result`);
        if (resultDiv) {
            resultDiv.style.display = 'none';
            const existingWarning = resultDiv.querySelector('.warning-message');
            if (existingWarning) {
                existingWarning.remove();
            }
        }
    }

    // 석회질비료 계산
    async function calculateLimeFertilizer(limeCode, data) {
        const areaValue = parseFloat(elements.area.value);
        const areaUnit = document.querySelector('input[name="area_gb"]:checked').value;
        const area1 = areaUnit === '㎡' ? areaValue : areaValue * 3.3058;

        const result = await apiCall({
            action: 'calculate_lime_fertilizer',
            lime_code: limeCode,
            lime_amount: elements.lime.value || '0',
            area: area1.toString()
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

    // 경지구분 코드 반환
    function getFieldType() {
        const fieldTypeMap = {
            "논": "1", "밭": "2", "시설": "3", "과수": "4", "유기농(논)": "9",
            "간척지(논)": "5", "간척지(밭)": "6", "임야": "7", "기타": "8"
        };
        const selectedFieldType = document.querySelector('input[name="field_type"]:checked')?.value || "논";
        return fieldTypeMap[selectedFieldType];
    }

    // 메인 검색 버튼 이벤트
    elements.searchBtn.addEventListener('click', async function() {
        // 필수 입력값 검증
        const validations = [
            { field: elements.cropType.value, message: '작물유형을 선택해주세요.' },
            { field: elements.cropCode.value, message: '작물을 선택해주세요.' },
            { field: elements.area.value, message: '대상지면적을 입력해주세요.' },
            { field: elements.ph.value, message: 'pH를 입력해주세요.' },
            { field: elements.om.value, message: '유기물을 입력해주세요.' },
            { field: elements.available_p.value, message: '유효인산을 입력해주세요.' },
            { field: elements.k.value, message: '칼륨을 입력해주세요.' },
            { field: elements.ca.value, message: '칼슘을 입력해주세요.' },
            { field: elements.mg.value, message: '마그네슘을 입력해주세요.' }
        ];

        // 작물별 추가 필수 필드
        if (elements.cropType.value === '00') { // 벼
            validations.push({ field: elements.riceQuality.value, message: '벼 선택시 품질을 선택해주세요.' });
            validations.push({ field: elements.sio2.value, message: '벼 선택시 유효규산을 입력해주세요.' });
        } else {
            validations.push({ field: elements.ec.value, message: '벼 이외의 경우 전기전도도를 입력해주세요.' });
        }

        const failedValidation = validations.find(v => !v.field);
        if (failedValidation) {
            alert(failedValidation.message);
            return;
        }

        // 숫자 범위 검증
        const numericValidations = [
            { value: parseFloat(elements.area.value), min: 0.1, max: 999999, name: '대상지면적' },
            { value: parseFloat(elements.ph.value), min: 3.5, max: 9.5, name: 'pH' },
            { value: parseFloat(elements.om.value), min: 1, max: 300, name: '유기물' },
            { value: parseFloat(elements.available_p.value), min: 1, max: 9999, name: '유효인산' },
            { value: parseFloat(elements.k.value), min: 0.01, max: 15, name: '칼륨' },
            { value: parseFloat(elements.ca.value), min: 0.1, max: 35, name: '칼슘' },
            { value: parseFloat(elements.mg.value), min: 0.1, max: 25, name: '마그네슘' }
        ];

        if (elements.cropType.value === '00' && elements.sio2.value) {
            numericValidations.push({ value: parseFloat(elements.sio2.value), min: 5, max: 2000, name: '유효규산' });
        }

        if (elements.cropType.value !== '00' && elements.ec.value) {
            numericValidations.push({ value: parseFloat(elements.ec.value), min: 0.01, max: 30, name: '전기전도도' });
        }

        const invalidField = numericValidations.find(v => isNaN(v.value) || v.value < v.min || v.value > v.max);
        if (invalidField) {
            alert(`${invalidField.name}은(는) ${invalidField.min} ~ ${invalidField.max} 범위 내에서 입력해주세요.`);
            return;
        }

        const overlay = utils.showLoading();

        try {
            // 면적 계산
            const areaValue = parseFloat(elements.area.value);
            const areaUnit = document.querySelector('input[name="area_gb"]:checked').value;
            const area1 = areaUnit === '㎡' ? areaValue : areaValue * 3.3058;
            const area2 = areaUnit === '㎡' ? areaValue * 0.3025 : areaValue;

            // 1. 비료처방 데이터 조회
            const fertilizerResult = await apiCall({
                action: 'calculate_prescription',
                exam_type: getFieldType(),
                crop_cd: elements.cropCode.value,
                rice_fert: elements.riceQuality.value || '',
                param_crop_gbn: elements.cropType.value,
                acid: elements.ph.value,
                om: elements.om.value,
                vldpha: elements.available_p.value,
                posifert_k: elements.k.value,
                posifert_ca: elements.ca.value,
                posifert_mg: elements.mg.value,
                vldsia: elements.sio2.value || '',
                selc: elements.ec.value || '',
                limeamo: elements.lime.value || '',
                cec: elements.cec.value || '',
                nit: elements.no3_n.value || '',
                ammo: elements.nh4_n.value || '',
                area1: area1.toString(),
                area2: area2.toString()
            });

            if (!fertilizerResult.success) {
                alert('비료처방 데이터 조회 실패: ' + fertilizerResult.error);
                return;
            }

            // 2. 복합비료 추천 순위 조회
            const recommendationResult = await apiCall({
                action: 'get_fertilizer_recommendations',
                pre_n: fertilizerResult.data.pre_N_300 || '0',
                pre_p: fertilizerResult.data.pre_P_300 || '0',
                pre_k: fertilizerResult.data.pre_K_300 || '0',
                post_n: fertilizerResult.data.post_N_300 || '0',
                post_p: fertilizerResult.data.post_P_300 || '0',
                post_k: fertilizerResult.data.post_K_300 || '0',
                crop_cd: elements.cropCode.value,
                crop_gbn: elements.cropType.value
            });

            // 결과 데이터 통합
            const resultData = {
                ...fertilizerResult.data,
                fertilizer_recommendations: recommendationResult.success ? recommendationResult.data : { pre: [], post: [] }
            };

            displayResults(resultData);

        } catch (error) {
            console.error('비료처방 검색 오류:', error);
            alert('비료처방 검색 중 오류가 발생했습니다: ' + error.message);
        } finally {
            utils.hideLoading(overlay);
        }
    });

    // 초기화
    toggleRiceOptions(false);
});