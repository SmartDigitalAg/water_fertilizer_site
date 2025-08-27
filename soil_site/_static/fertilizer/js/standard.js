// 페이지 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소들 가져오기
    const area = document.getElementById('area');
    const radios = document.querySelectorAll('input[name="area_unit"]');
    const cropType = document.getElementById('crop_type');
    const cropCode = document.getElementById('crop_code');
    const searchBtn = document.getElementById('search');

    let currentUnit = 'sqm';

    // ========== 1. 면적 단위 변환 기능 (기존 코드 유지) ==========
    // 라디오 버튼에 value 값 설정
    radios[0].value = 'sqm';
    radios[1].value = 'pyeong';

    // 단위 변경시 면적값 자동 변환
    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            const val = parseFloat(area.value);
            if (val && currentUnit !== this.value) {
                // ㎡ → 평: /3.3058, 평 → ㎡: *3.3058
                area.value = (val * (currentUnit === 'sqm' ? 1/3.3058 : 3.3058)).toFixed(2);
                currentUnit = this.value;
            }
        });
    });

    // 면적 입력란에 숫자와 소수점만 허용
    area.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9.]/g, '');
    });

    // ========== 2. 작물 필터링 기능  ==========
    // 작물유형 선택시 작물 옵션 동적 생성
    cropType.addEventListener('change', function() {
        cropCode.innerHTML = '<option value="">작물 선택</option>';

        // 과채류(04) 선택시에만 작물 옵션 추가
        if (this.value === '04') {
            // crops 객체를 순회하며 option 태그 생성
            for (const [code, name] of Object.entries(crops)) {
                const option = document.createElement('option');
                option.value = code;  // 작물 코드 (예: "04001")
                option.textContent = name;  // 작물명 (예: "고추(노지재배)")
                cropCode.appendChild(option);
            }
        }
    });

    // ========== 3. 검색 버튼 클릭 이벤트 (새로 추가) ==========
    searchBtn.addEventListener('click', function() {
        const cropCodeValue = cropCode.value;  // 선택된 작물 코드
        const areaValue = area.value;  // 입력된 면적
        const areaUnit = document.querySelector('input[name="area_unit"]:checked').value;  // 선택된 단위

        // 입력값 검증 - 작물과 면적이 모두 입력되었는지 확인
        if (!cropCodeValue || !areaValue) {
            alert('작물과 면적을 입력해주세요.');
            return;
        }

        // Django 서버로 POST 요청 데이터 준비
        const formData = new FormData();
        formData.append('crop_code', cropCodeValue);
        formData.append('area', areaValue);
        formData.append('area_unit', areaUnit);

        // AJAX로 Django API 호출
        fetch('/fertilizer/standard/api/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())  // JSON으로 변환
        .then(data => {
            if (data.success) {
                displayResults(data);  // 성공시 결과 표시
            } else {
                alert('오류: ' + data.error);  // 실패시 에러 메시지
            }
        })
        .catch(error => {
            alert('요청 실패: ' + error);  // 네트워크 오류시
        });
    });

    // ========== 4. 결과 표시 함수 ==========
    function displayResults(data) {
        const resultDiv = document.getElementById('result');
        const apiData = data.data;

        let html = `
            <h3>📊 ${data.crop_name} - ${data.area} ${data.area_unit}</h3>
            
            <div style="display: flex; gap: 20px;">
                <div style="flex: 1;">
                    <h4>성분량(kg/10a)</h4>
                    <table border="1" style="width: 100%; border-collapse: collapse;">
                        <tr><th>구분</th><th>질소</th><th>인산</th><th>칼리</th></tr>
                        <tr>
                            <td>밑거름</td>
                            <td>${apiData.pre_N_300 || '0'}</td>
                            <td>${apiData.pre_P_300 || '0'}</td>
                            <td>${apiData.pre_K_300 || '0'}</td>
                        </tr>
                        <tr>
                            <td>웃거름</td>
                            <td>${apiData.post_N_300 || '0'}</td>
                            <td>${apiData.post_P_300 || '0'}</td>
                            <td>${apiData.post_K_300 || '0'}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="flex: 1;">
                    <h4>추천량(kg/실면적)</h4>
                    <table border="1" style="width: 100%; border-collapse: collapse;">
                        <tr><th>구분</th><th>요소</th><th>용성인비</th><th>염화칼리</th></tr>
                        <tr>
                            <td>밑거름</td>
                            <td>${apiData.pre_N1 || '0'}</td>
                            <td>${apiData.pre_P1 || '0'}</td>
                            <td>${apiData.pre_K1 || '0'}</td>
                        </tr>
                        <tr>
                            <td>웃거름</td>
                            <td>${apiData.post_N1 || '0'}</td>
                            <td>${apiData.post_P1 || '0'}</td>
                            <td>${apiData.post_K1 || '0'}</td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <!-- 복합비료 추천 순위 -->
            <div style="margin-top: 40px;">
                <h3 style="margin-bottom: -5px;">▶ 복합비료(시중유통비료) 추천 순위</h3>
                <div style="display: flex; gap: 20px;">
                    <div style="flex: 1;">
                        <h4>밑거름 추천</h4>
                        ${data.fertilizers.pre.length > 0 ? `
                            <table border="1" style="width: 100%; border-collapse: collapse;">
                                <tr><th>순위</th><th>비료명</th></tr>
                                ${data.fertilizers.pre.slice(0, 5).map((f, i) => 
                                    `<tr><td>${i + 1}순위</td><td>${f.name} ${f.npk}</td></tr>`
                                ).join('')}
                            </table>
                        ` : '<p>추천 정보 없음</p>'}
                    </div>
                    
                    <div style="flex: 1;">
                        <h4>웃거름 추천</h4>
                        ${data.fertilizers.post.length > 0 ? `
                            <table border="1" style="width: 100%; border-collapse: collapse;">
                                <tr><th>순위</th><th>비료명</th></tr>
                                ${data.fertilizers.post.slice(0, 5).map((f, i) => 
                                    `<tr><td>${i + 1}순위</td><td>${f.name} ${f.npk}</td></tr>`
                                ).join('')}
                            </table>
                        ` : '<p>추천 정보 없음</p>'}
                    </div>
                </div>
            </div>
            <p style="margin-top: 5px; font-size: 14px; color: #666;">
                ※ 위 추천비료는 기준값에서 질소, 인산, 칼리 순으로 근접한 비료가 선정되었습니다.
            </p>
            
            <!-- 복합비료 처방 -->
            <div style="margin-top: 40px;">
                <h3>▶ 복합비료 처방</h3>
                
                <!-- 처방방식 선택 -->
                <p>
                    처방방식: 
                    <label><input type="radio" name="prescription_method" value="1" checked onchange="updateResults()"> 질소기준처방</label>
                    <label><input type="radio" name="prescription_method" value="2" onchange="updateResults()"> 인산기준처방</label>
                    <label><input type="radio" name="prescription_method" value="3" onchange="updateResults()"> 칼리기준처방</label>
                </p>

                <!-- 밑거름 복합비료 처방 -->
                <div style="margin-bottom: 20px;">
                    <h3>▶ 밑거름 복합비료 처방(kg/실면적)</h3>
                    <p>
                        밑거름 비종선택: 
                        <select id="pre_fertilizer_select" onchange="setPreFertilizer()" style="width: 150px; max-width: 300px;">
                            <option value="">선택</option>
                            ${data.fertilizers.pre.map((f, index) => {
                                const fertilizerValue = f.full_info || `${f.npk.replace(/[()]/g, '').split('-').slice(0,3).join('-')}-20`;
                                return `<option value="${fertilizerValue}" data-npk="${f.npk}">${index + 1}순위: ${f.name}</option>`;
                            }).join('')}
                        </select>
                        <label style="margin-left: 20px;">
                            <input type="checkbox" id="pre_custom_input" onchange="togglePreCustomInput()"> 사용자 직접 입력
                        </label>
                    </p>
                    <div style="margin: 10px 0;">
                        복합비료 종류(%) 질소: <input type="number" id="pre_n" value="0" min="0" max="50" style="width:60px" disabled onchange="updateResults()"> 
                        인산: <input type="number" id="pre_p" value="0" min="0" max="50" style="width:60px" disabled onchange="updateResults()"> 
                        칼리: <input type="number" id="pre_k" value="0" min="0" max="50" style="width:60px" disabled onchange="updateResults()"> 
                        비료(1포대량): <input type="number" id="pre_qy" value="20" min="1" max="50" style="width:60px" disabled onchange="updateResults()"> kg
                    </div>
                    <div id="pre_result"></div>
                </div>

                <!-- 웃거름 복합비료 처방 -->
                <div>
                    <h3>▶ 웃거름 복합비료 처방(kg/실면적)</h3>
                    <p>
                        웃거름 비종선택: 
                        <select id="post_fertilizer_select" onchange="setPostFertilizer()" style="width: 150px; max-width: 300px;">
                            <option value="">선택</option>
                            ${data.fertilizers.post.map((f, index) => {
                                const fertilizerValue = f.full_info || `${f.npk.replace(/[()]/g, '').split('-').slice(0,3).join('-')}-20`;
                                return `<option value="${fertilizerValue}" data-npk="${f.npk}">${index + 1}순위: ${f.name}</option>`;
                            }).join('')}
                        </select>
                        <label style="margin-left: 20px;">
                            <input type="checkbox" id="post_custom_input" onchange="togglePostCustomInput()"> 사용자 직접 입력
                        </label>
                    </p>
                    <div style="margin: 10px 0;">
                        복합비료 종류(%) 질소: <input type="number" id="post_n" value="0" min="0" max="50" style="width:60px" disabled onchange="updateResults()"> 
                        인산: <input type="number" id="post_p" value="0" min="0" max="50" style="width:60px" disabled onchange="updateResults()"> 
                        칼리: <input type="number" id="post_k" value="0" min="0" max="50" style="width:60px" disabled onchange="updateResults()"> 
                        비료(1포대량): <input type="number" id="post_qy" value="20" min="1" max="50" style="width:60px" disabled onchange="updateResults()"> kg
                    </div>
                    <div id="post_result"></div>
                </div>
            </div>
        `;

        resultDiv.innerHTML = html;
        resultDiv.style.display = 'block';
    }

    // ========== 5. 실시간 업데이트 함수 ==========
    window.updateResults = function() {
        const cropCodeValue = cropCode.value;
        const areaValue = area.value;
        const areaUnit = document.querySelector('input[name="area_unit"]:checked').value;
        const prescriptionMethod = document.querySelector('input[name="prescription_method"]:checked').value;

        // 밑거름 데이터 - input에서 직접 가져오기
        const preN = parseFloat(document.getElementById('pre_n').value) || 0;
        const preP = parseFloat(document.getElementById('pre_p').value) || 0;
        const preK = parseFloat(document.getElementById('pre_k').value) || 0;
        const preQy = parseFloat(document.getElementById('pre_qy').value) || 20;

        // 웃거름 데이터 - input에서 직접 가져오기
        const postN = parseFloat(document.getElementById('post_n').value) || 0;
        const postP = parseFloat(document.getElementById('post_p').value) || 0;
        const postK = parseFloat(document.getElementById('post_k').value) || 0;
        const postQy = parseFloat(document.getElementById('post_qy').value) || 20;

        const formData = new FormData();
        formData.append('crop_code', cropCodeValue);
        formData.append('area', areaValue);
        formData.append('area_unit', areaUnit);
        formData.append('prescription_method', prescriptionMethod);
        formData.append('pre_n', preN);
        formData.append('pre_p', preP);
        formData.append('pre_k', preK);
        formData.append('pre_qy', preQy);
        formData.append('post_n', postN);
        formData.append('post_p', postP);
        formData.append('post_k', postK);
        formData.append('post_qy', postQy);

        fetch('/fertilizer/standard/api/', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.compound_calculation) {
                updateCompoundResults(data.compound_calculation, prescriptionMethod, preN + preP + preK, postN + postP + postK, preN, preP, preK, postN, postP, postK);
            }
        })
        .catch(error => {
            console.error('업데이트 실패:', error);
        });
    }

    // ========== 비료 선택시 input 필드 업데이트 ==========
    window.setPreFertilizer = function() {
        const select = document.getElementById('pre_fertilizer_select');
        const customCheckbox = document.getElementById('pre_custom_input');

        if (select.value && !customCheckbox.checked) {
            const npkInfo = select.value.split('-');
            document.getElementById('pre_n').value = npkInfo[0] || 0;
            document.getElementById('pre_p').value = npkInfo[1] || 0;
            document.getElementById('pre_k').value = npkInfo[2] || 0;
            document.getElementById('pre_qy').value = npkInfo[3] || 20;

            const selectedText = select.options[select.selectedIndex].text;
            const textWidth = Math.max(150, Math.min(300, selectedText.length * 12 + 80));
            select.style.width = textWidth + 'px';

            updateResults();
        } else {
            select.style.width = '150px';
        }
    }

    window.setPostFertilizer = function() {
        const select = document.getElementById('post_fertilizer_select');
        const customCheckbox = document.getElementById('post_custom_input');

        if (select.value && !customCheckbox.checked) {
            const npkInfo = select.value.split('-');
            document.getElementById('post_n').value = npkInfo[0] || 0;
            document.getElementById('post_p').value = npkInfo[1] || 0;
            document.getElementById('post_k').value = npkInfo[2] || 0;
            document.getElementById('post_qy').value = npkInfo[3] || 20;

            const selectedText = select.options[select.selectedIndex].text;
            const textWidth = Math.max(150, Math.min(300, selectedText.length * 12 + 80));
            select.style.width = textWidth + 'px';

            updateResults();
        } else {
            select.style.width = '150px';
        }
    }

    // ========== 체크박스 토글 함수 ==========
    window.togglePreCustomInput = function() {
        const checkbox = document.getElementById('pre_custom_input');
        const select = document.getElementById('pre_fertilizer_select');
        const inputs = ['pre_n', 'pre_p', 'pre_k', 'pre_qy'];

        if (checkbox.checked) {
            // 사용자 직접입력 ON: input 활성화, 드롭다운 비활성화
            inputs.forEach(id => document.getElementById(id).disabled = false);
            select.disabled = true;
            select.value = "";
            // 기본값으로 리셋
            document.getElementById('pre_n').value = 0;
            document.getElementById('pre_p').value = 0;
            document.getElementById('pre_k').value = 0;
            document.getElementById('pre_qy').value = 20;
        } else {
            // 사용자 직접입력 OFF: input 비활성화, 드롭다운 활성화
            inputs.forEach(id => document.getElementById(id).disabled = true);
            select.disabled = false;
        }
        updateResults();
    }

    window.togglePostCustomInput = function() {
        const checkbox = document.getElementById('post_custom_input');
        const select = document.getElementById('post_fertilizer_select');
        const inputs = ['post_n', 'post_k', 'post_qy'];

        if (checkbox.checked) {
            // 사용자 직접입력 ON: input 활성화, 드롭다운 비활성화
            inputs.forEach(id => document.getElementById(id).disabled = false);
            select.disabled = true;
            select.value = "";
            // 기본값으로 리셋
            document.getElementById('post_n').value = 0;
            document.getElementById('post_p').value = 0;
            document.getElementById('post_k').value = 0;
            document.getElementById('post_qy').value = 20;
        } else {
            // 사용자 직접입력 OFF: input 비활성화, 드롭다운 활성화
            inputs.forEach(id => document.getElementById(id).disabled = true);
            select.disabled = false;
        }
        updateResults();
    }

    // ========== 6. 복합비료 결과 업데이트 ==========
    function updateCompoundResults(compound, prescriptionMethod, preSum, postSum, preN, preP, preK, postN, postP, postK) {
        const methodLabels = {
            '1': ['복합비료 추천량 (kg)', '인산 추가필요량', '칼리 추가필요량'],
            '2': ['복합비료 추천량 (kg)', '질소 추가필요량', '칼리 추가필요량'],
            '3': ['복합비료 추천량 (kg)', '질소 추가필요량', '인산 추가필요량']
        };

        const labels = methodLabels[prescriptionMethod];

        // 밑거름 결과 업데이트
        const preResult = document.getElementById('pre_result');
        if (preSum > 0 && (preN > 0 || preP > 0 || preK > 0)) {
            const preTotal = parseFloat(compound.nh_pre_fertResultTotal || 0);
            const preTotal2 = parseFloat(compound.nh_pre_fertResultTotal2 || 0);
            const preTotal3 = parseFloat(compound.nh_pre_fertResultTotal3 || 0);

            const preSelect = document.getElementById('pre_fertilizer_select');
            const preCheckbox = document.getElementById('pre_custom_input');
            const fertName = preCheckbox.checked ? `사용자 입력(${preN}-${preP}-${preK})` :
                (preSelect.options[preSelect.selectedIndex] ?
                 `${preSelect.options[preSelect.selectedIndex].text}${preSelect.options[preSelect.selectedIndex].dataset.npk}` :
                 '선택비료');

            let resultText = `**${fertName} ${preTotal.toFixed(1)}kg`;
            if (preTotal2 > 0) resultText += `과 ${labels[1]} ${preTotal2.toFixed(1)}kg`;
            if (preTotal3 > 0) resultText += `${preTotal2 > 0 ? ', ' : '과 '}${labels[2]} ${preTotal3.toFixed(1)}kg`;
            resultText += '을 주십시오.**';

            preResult.innerHTML = `
                <table border="1" style="width: 100%; border-collapse: collapse;">
                    <tr><th>${labels[0]}</th><th>${labels[1]} (kg)</th><th>${labels[2]} (kg)</th></tr>
                    <tr>
                        <td>${preTotal.toFixed(1)}</td>
                        <td>${preTotal2.toFixed(1)}</td>
                        <td>${preTotal3.toFixed(1)}</td>
                    </tr>
                </table>
                <p style="margin-top: 10px; color: #007bff;">📋 ${resultText}</p>
            `;
        } else {
            preResult.innerHTML = '';
        }

        // 웃거름 결과 업데이트
        const postResult = document.getElementById('post_result');
        if (postSum > 0 && (postN > 0 || postP > 0 || postK > 0)) {
            const postTotal = parseFloat(compound.nh_post_fertResultTotal || 0);
            const postTotal2 = parseFloat(compound.nh_post_fertResultTotal2 || 0);
            const postTotal3 = parseFloat(compound.nh_post_fertResultTotal3 || 0);

            // 🔥 표는 항상 먼저 표시
            postResult.innerHTML = `
                <table border="1" style="width: 100%; border-collapse: collapse;">
                    <tr><th>${labels[0]}</th><th>${labels[1]} (kg)</th><th>${labels[2]} (kg)</th></tr>
                    <tr>
                        <td>${postTotal.toFixed(1)}</td>
                        <td>${postTotal2.toFixed(1)}</td>
                        <td>${postTotal3.toFixed(1)}</td>
                    </tr>
                </table>
            `;

            // 🔥 추천량이 0인 경우 메시지 추가
            if (postTotal === 0) {
                postResult.innerHTML += `
                    <p style="color: red; margin-top: 10px;">
                        * 웃거름 복합비료 추천량이 0이므로 처방을 진행할 수 없습니다.
                    </p>
                `;
                return;
            }

            // 추천량이 0이 아닌 경우 처방 메시지 추가
            const postSelect = document.getElementById('post_fertilizer_select');
            const postCheckbox = document.getElementById('post_custom_input');
            const fertName = postCheckbox.checked ? `사용자 입력(${postN}-${postP}-${postK})` :
                (postSelect.options[postSelect.selectedIndex] ?
                 `${postSelect.options[postSelect.selectedIndex].text}${postSelect.options[postSelect.selectedIndex].dataset.npk}` :
                 '선택비료');

            let resultText = `**${fertName} ${postTotal.toFixed(1)}kg`;
            if (postTotal2 > 0) resultText += `과 ${labels[1]} ${postTotal2.toFixed(1)}kg`;
            if (postTotal3 > 0) resultText += `${postTotal2 > 0 ? ', ' : '과 '}${labels[2]} ${postTotal3.toFixed(1)}kg`;
            resultText += '을 주십시오.**';

            postResult.innerHTML += `<p style="margin-top: 10px; color: #007bff;">📋 ${resultText}</p>`;
        } else {
            postResult.innerHTML = '';
        }
    }
});

