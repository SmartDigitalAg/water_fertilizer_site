document.addEventListener('DOMContentLoaded', function() {
  let currentScenario = 'ssp126';
  let currentYear = 2026;
  let currentCrop = '보리';
  let currentPeriod = 'late';
  let districtMapping = {};
  let mainMapLayer = null;
  let mainMapCtpLayer = null;
  let mainMap = null;
  let barChartInstance = null;
  let trendsChartInstance = null;
  let isPlaying = false;
  let playInterval = null;

  // 정적 지도 인스턴스 저장
  let staticMaps = {
    map1: null,
    map2: null,
    map3: null,
    map4: null
  };

  let climateScenario = 'ssp126';
  let climateCrop = '보리';
  let climateStation = '';
  let climateGrowthStage = 'seedling';

  const PERIODS = {
    'early': { start: 2026, end: 2040, label: '전반기 (2026-2040)' },
    'mid': { start: 2041, end: 2070, label: '중반기 (2041-2070)' },
    'late': { start: 2071, end: 2100, label: '후반기 (2071-2100)' }
  };

  const CROP_LEGENDS = {
    '보리': {
      min: 450,
      max: 800,
      steps: [
        { min: 400, max: 490, color: 'rgba(49, 130, 189, 0.95)' },
        { min: 490, max: 580, color: 'rgba(107, 174, 214, 0.95)' },
        { min: 580, max: 670, color: 'rgba(189, 215, 231, 0.95)' },
        { min: 670, max: 760, color: 'rgba(253, 174, 97, 0.95)' },
        { min: 760, max: 850, color: 'rgba(215, 48, 39, 0.95)' }
      ],
      noDataColor: 'rgba(255, 255, 255, 0)'
    },
    '밀': {
      min: 300,
      max: 700,
      steps: [
        { min: 300, max: 380, color: 'rgba(49, 130, 189, 0.95)' },
        { min: 380, max: 460, color: 'rgba(107, 174, 214, 0.95)' },
        { min: 460, max: 540, color: 'rgba(189, 215, 231, 0.95)' },
        { min: 540, max: 620, color: 'rgba(253, 174, 97, 0.95)' },
        { min: 620, max: 700, color: 'rgba(215, 48, 39, 0.95)' }
      ],
      noDataColor: 'rgba(255, 255, 255, 0)'
    }
  };

  function getCurrentLegend() {
    return CROP_LEGENDS[currentCrop] || CROP_LEGENDS['보리'];
  }

  let precomputedDataCache = {};
  let precomputedDataLoaded = {};

  const staticMapLayers = {
    map1: { sigLayer: null, ctpLayer: null },
    map2: { sigLayer: null, ctpLayer: null },
    map3: { sigLayer: null, ctpLayer: null },
    map4: { sigLayer: null, ctpLayer: null }
  };

  const cropData = { grain: ['보리', '밀'] };

  const cropGrowthStages = {
    '보리': {
      '유묘기': { startDate: '11-05', endDate: '11-20', kc: 0.8 },
      '분얼기': { startDate: '11-21', endDate: '12-25', kc: 1.00 },
      '생육재생기': { startDate: '02-10', endDate: '03-10', kc: 1.00 },
      '분얼및신장기': { startDate: '03-11', endDate: '04-25', kc: 1.30 },
      '출수및등숙기': { startDate: '04-26', endDate: '05-15', kc: 1.17 }
    },
    '밀': {
      '유묘기': { startDate: '11-05', endDate: '11-25', kc: 0.6 },
      '분얼기': { startDate: '11-26', endDate: '12-25', kc: 1.00 },
      '생육재생기': { startDate: '02-11', endDate: '03-10', kc: 1.05 },
      '분얼및신장기': { startDate: '03-11', endDate: '04-15', kc: 1.20 },
      '출수및등숙기': { startDate: '04-16', endDate: '05-15', kc: 0.70 }
    }
  };

  const scenarioMap = { 'ssp1': 'ssp126', 'ssp2': 'ssp245', 'ssp3': 'ssp370', 'ssp5': 'ssp585' };
  const climateElements = ['rhum', 'rsds', 'tmax', 'tmin', 'wspd'];

  const provinceCodeMap = {
    '11': '서울특별시', '26': '부산광역시', '27': '대구광역시', '28': '인천광역시',
    '29': '광주광역시', '30': '대전광역시', '31': '울산광역시', '36': '세종특별자치시',
    '41': '경기도', '42': '강원도', '51': '강원도', '43': '충청북도', '44': '충청남도',
    '45': '전라북도', '52': '전라북도', '46': '전라남도', '47': '경상북도',
    '48': '경상남도', '50': '제주도'
  };

  const scenarioNames = {
    'ssp126': 'SSP1-2.6', 'ssp245': 'SSP2-4.5',
    'ssp370': 'SSP3-7.0', 'ssp585': 'SSP5-8.5'
  };

  const stageNames = {
    'seedling': '유묘기',
    'tillering': '분얼기',
    'regrowth': '생육재생기',
    'elongation': '분얼및신장기',
    'heading_ripening': '출수및등숙기'
  };

  // ========== 화면 크기 감지 함수 ==========
  function getScreenSize() {
    const width = window.innerWidth;
    if (width <= 420) return 'small';
    if (width <= 768) return 'medium';
    return 'large';
  }

  function getZoomLevel(target, screenSize) {
    if (target === 'mainMap') {
      switch(screenSize) {
        case 'small': return 5.85;
        case 'medium': return 6.15;
        default: return 6.3;
      }
    } else {
      switch(screenSize) {
        case 'small': return 5.2;
        case 'medium': return 5.2;
        default: return 5.4;
      }
    }
  }

  function getMapCenter(target, screenSize) {
    if (target === 'mainMap') {
      // 동적 지도 중심 좌표
      switch(screenSize) {
        case 'small': return [128, 35.8];    // 420px 이하
        case 'medium': return [128, 35.8];   // 768px 이하
        default: return [127.6, 36.1];         // 768px 이상
      }
    } else {
      // 정적 지도 중심 좌표
      switch(screenSize) {
        case 'small': return [127.6, 36.2];    // 420px 이하
        case 'medium': return [127.6, 36];   // 768px 이하
        default: return [127.6, 35.9];         // 768px 이상
      }
    }
  }

  // ========== 사전 계산된 데이터 로드 함수 ==========

  async function loadPrecomputedData(scenario) {
    if (precomputedDataLoaded[scenario]) {
      return precomputedDataCache[scenario];
    }

    console.log(`📦 사전 계산 데이터 로드 중: ${scenario}`);

    try {
      const response = await fetch(`/static/ssp/data/water_req_${scenario}.csv.gz`);
      if (!response.ok) {
        console.error(`❌ 파일을 찾을 수 없습니다: water_req_${scenario}.csv.gz`);
        return null;
      }

      const csvText = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: function(results) {
            const dataMap = new Map();

            results.data.forEach(row => {
              const key = `${row.year}_${row.crop}_${row.station_id}`;
              dataMap.set(key, {
                year: row.year,
                crop: row.crop,
                station_id: String(row.station_id),
                유묘기: parseFloat(row['유묘기']) || 0,
                분얼기: parseFloat(row['분얼기']) || 0,
                생육재생기: parseFloat(row['생육재생기']) || 0,
                분얼및신장기: parseFloat(row['분얼및신장기']) || 0,
                출수및등숙기: parseFloat(row['출수및등숙기']) || 0,
                total: parseFloat(row.total) || 0
              });
            });

            precomputedDataCache[scenario] = dataMap;
            precomputedDataLoaded[scenario] = true;

            console.log(`✅ ${scenario} 데이터 로드 완료: ${dataMap.size}개 레코드`);
            resolve(dataMap);
          },
          error: reject
        });
      });
    } catch (error) {
      console.error(`❌ ${scenario} 데이터 로드 오류:`, error);
      return null;
    }
  }

  async function getWaterRequirementFromPrecomputed(scenario, year, crop) {
    const dataMap = await loadPrecomputedData(scenario);

    if (!dataMap) {
      console.error('❌ 사전 계산 데이터를 불러올 수 없습니다.');
      return null;
    }

    const totalData = {};
    const stageData = {};

    dataMap.forEach((row, key) => {
      if (row.year === year && row.crop === crop) {
        totalData[row.station_id] = row.total;
        stageData[row.station_id] = {
          유묘기: row['유묘기'],
          분얼기: row['분얼기'],
          생육재생기: row['생육재생기'],
          분얼및신장기: row['분얼및신장기'],
          출수및등숙기: row['출수및등숙기']
        };
      }
    });

    const values = Object.values(totalData).filter(v => !isNaN(v) && v > 0);
    if (values.length === 0) {
      console.warn(`⚠️ ${scenario} ${year}년 ${crop} 데이터 없음`);
      return null;
    }

    return {
      totalData,
      stageData,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  async function loadDistrictMapping() {
    try {
      const response = await fetch('/static/ssp/data/administrative district.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

      data.forEach((row) => {
        for (let i = 0; i < row.length; i += 2) {
          const name = row[i];
          const id = row[i + 1];
          if (name && id) {
            const trimmedName = String(name).trim();
            if (trimmedName.includes(' ')) {
              const parts = trimmedName.split(' ');
              districtMapping[parts[parts.length - 1]] = String(id);
            }
            districtMapping[trimmedName] = String(id);
          }
        }
      });
      console.log('✅ 행정구역 매핑 완료:', Object.keys(districtMapping).length, '개');
    } catch (error) {
      console.error('❌ 행정구역 파일 로드 오류:', error);
    }
  }

  function getColorForValue(value, min, max) {
    const legend = getCurrentLegend();

    if (isNaN(value) || value === null) {
      return legend.noDataColor;
    }

    for (let i = 0; i < legend.steps.length; i++) {
      const step = legend.steps[i];
      if (value >= step.min && value < step.max) {
        return step.color;
      }
    }

    if (value >= legend.steps[legend.steps.length - 1].max) {
      return legend.steps[legend.steps.length - 1].color;
    }

    return legend.steps[0].color;
  }

  function createLegend(min, max) {
    const legend = getCurrentLegend();

    const labels = [{
      color: 'rgba(255, 255, 255, 1)',
      label: '데이터 없음'
    }];

    legend.steps.forEach(step => {
      labels.push({
        color: step.color,
        label: `${step.min} ~ ${step.max} mm`
      });
    });

    document.getElementById('legendItems').innerHTML = labels.map(item => `
      <div class="legend-item">
        <div class="legend-color" style="background: ${item.color}; border: 1px solid #ddd;"></div>
        <span class="legend-label">${item.label}</span>
      </div>
    `).join('');

    document.getElementById('legend').style.display = 'block';
  }

  function getDateRange(startDate, endDate) {
    const dates = [];
    const [startMonth, startDay] = startDate.split('-').map(Number);
    const [endMonth, endDay] = endDate.split('-').map(Number);
    let currentMonth = startMonth;
    let currentDay = startDay;

    while (true) {
      dates.push(`${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`);
      if (currentMonth === endMonth && currentDay === endDay) break;

      currentDay++;
      const daysInMonth = new Date(2026, currentMonth, 0).getDate();
      if (currentDay > daysInMonth) {
        currentDay = 1;
        currentMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      }
    }
    return dates;
  }

  async function visualizeDataOnMap(scenario, year, crop) {
    try {
      console.log(`🗺️ 데이터 로딩 중: ${scenario}, ${year}년, ${crop}`);

      const result = await getWaterRequirementFromPrecomputed(scenario, year, crop);

      if (!result) {
        alert('데이터를 불러올 수 없습니다.');
        return null;
      }

      const { totalData } = result;
      const legend = getCurrentLegend();

      createLegend(legend.min, legend.max);

      const updateLayer = (layer, nameProperty) => {
        if (layer) {
          layer.setStyle(feature => {
            const name = feature.get(nameProperty);
            const stationId = districtMapping[name];
            const value = stationId ? totalData[stationId] : null;
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: '#333',
                width: nameProperty === 'CTP_KOR_NM' ? 1.5 : 0.5
              }),
              fill: new ol.style.Fill({
                color: getColorForValue(value, legend.min, legend.max)
              })
            });
          });
        }
      };

      updateLayer(mainMapLayer, 'SIG_KOR_NM');
      updateLayer(mainMapCtpLayer, 'CTP_KOR_NM');

      return result;
    } catch (error) {
      console.error('❌ 지도 시각화 오류:', error);
      alert('데이터 시각화 중 오류가 발생했습니다.');
      return null;
    }
  }

  async function visualizeStaticMaps(crop, period = 'late') {
    const scenarios = ['ssp126', 'ssp245', 'ssp370', 'ssp585'];
    const mapIds = ['map1', 'map2', 'map3', 'map4'];
    const legend = getCurrentLegend();
    const periodInfo = PERIODS[period];

    console.log(`🗺️ 정적 지도 시각화: ${crop}, ${periodInfo.label}`);

    for (let i = 0; i < scenarios.length; i++) {
      const dataMap = await loadPrecomputedData(scenarios[i]);
      if (!dataMap) continue;

      const stationAverages = {};
      const stationCounts = {};

      dataMap.forEach((row) => {
        if (row.crop === crop && row.year >= periodInfo.start && row.year <= periodInfo.end) {
          const stationId = row.station_id;

          if (!stationAverages[stationId]) {
            stationAverages[stationId] = 0;
            stationCounts[stationId] = 0;
          }

          stationAverages[stationId] += row.total;
          stationCounts[stationId]++;
        }
      });

      const totalData = {};
      Object.keys(stationAverages).forEach(stationId => {
        totalData[stationId] = stationAverages[stationId] / stationCounts[stationId];
      });

      const values = Object.values(totalData).filter(v => !isNaN(v) && v > 0);
      if (values.length === 0) continue;

      console.log(`${scenarios[i]} 범위: ${Math.min(...values).toFixed(1)} ~ ${Math.max(...values).toFixed(1)} mm`);

      const layers = staticMapLayers[mapIds[i]];

      const updateStaticLayer = (layer, nameProperty) => {
        if (layer) {
          layer.setStyle(feature => {
            const name = feature.get(nameProperty);
            const stationId = districtMapping[name];
            const value = stationId ? totalData[stationId] : null;
            return new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: '#333',
                width: nameProperty === 'CTP_KOR_NM' ? 1.5 : 0.5
              }),
              fill: new ol.style.Fill({
                color: getColorForValue(value, legend.min, legend.max)
              })
            });
          });
        }
      };

      updateStaticLayer(layers.sigLayer, 'SIG_KOR_NM');
      updateStaticLayer(layers.ctpLayer, 'CTP_KOR_NM');
    }

    console.log(`✅ 정적 지도 시각화 완료 (${periodInfo.label})`);
  }

  async function updateRegionalChart(scenario, year, crop) {
    try {
      console.log('📊 지역별 차트 업데이트 시작:', scenario, year, crop);

      const result = await getWaterRequirementFromPrecomputed(scenario, year, crop);
      if (!result) return;

      const sigResponse = await fetch('/static/ssp/data/SIG_wgs84.json.gz');
      const sigData = await sigResponse.json();

      const sigToProvince = {};
      sigData.features.forEach(feature => {
        const provinceCode = feature.properties.SIG_CD.substring(0, 2);
        sigToProvince[feature.properties.SIG_KOR_NM] = provinceCodeMap[provinceCode] || '';
      });

      const regionalData = {
        '경기도': [], '강원도': [], '충청북도': [], '충청남도': [],
        '전라북도': [], '전라남도': [], '경상북도': [], '경상남도': [], '제주도': []
      };

      Object.entries(districtMapping).forEach(([districtName, stationId]) => {
        if (result.totalData[stationId]) {
          const cleanName = districtName.replace(/(서울|부산|대구|인천|광주|대전|울산|세종)(특별시|광역시|특별자치시)?/g, '').trim();
          let province = sigToProvince[cleanName] || sigToProvince[districtName];

          if (!province) {
            for (const [sig, prov] of Object.entries(sigToProvince)) {
              if (sig.includes(cleanName) || cleanName.includes(sig)) {
                province = prov;
                break;
              }
            }
          }

          if (regionalData[province]) {
            regionalData[province].push(result.totalData[stationId]);
          }
        }
      });

      const chartData = Object.keys(regionalData).map(region => {
        const values = regionalData[region];
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      });

      if (barChartInstance) {
        barChartInstance.data.datasets[0].data = chartData;
        barChartInstance.update();
      }
    } catch (error) {
      console.error('❌ 지역별 차트 업데이트 오류:', error);
    }
  }

  async function loadClimateData(scenario, crop, stationId, growthStage) {
    try {
      console.log(`📊 기후데이터 로드: ${scenario}, ${crop}, 지점 ${stationId}, ${growthStage}`);

      const filename = `avg_temp_${scenario}_${growthStage}_2026_2100.csv`;
      const response = await fetch(`/static/ssp/data/${filename}`);

      if (!response.ok) {
        console.error(`❌ 파일을 찾을 수 없습니다: ${filename}`);
        return null;
      }

      const csvText = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: function(results) {
            const yearData = [];

            results.data.forEach(row => {
              const year = row.Year;
              const temp = row[stationId];

              if (year && temp !== undefined && temp !== null && !isNaN(temp)) {
                yearData.push({
                  year: parseInt(year),
                  temperature: parseFloat(temp)
                });
              }
            });

            console.log(`✅ ${filename} 로드 완료: ${yearData.length}개 데이터`);
            resolve(yearData);
          },
          error: reject
        });
      });
    } catch (error) {
      console.error('❌ 기후데이터 로드 오류:', error);
      return null;
    }
  }

  const scenarioColors = {
    'ssp126': { border: 'rgba(49, 130, 189, 0.95)', background: 'rgba(49, 130, 189, 0.1)' },
    'ssp245': { border: 'rgba(189, 215, 231, 0.95)', background: 'rgba(189, 215, 231, 0.1)' },
    'ssp370': { border: 'rgba(253, 174, 97, 0.95)', background: 'rgba(253, 174, 97, 0.1)' },
    'ssp585': { border: 'rgba(215, 48, 39, 0.95)', background: 'rgba(215, 48, 39, 0.1)' }
  };

  async function displayClimateChart() {
    const stationId = document.getElementById('climateStation').value;

    if (!stationId) {
      alert('지점을 선택해주세요.');
      return;
    }

    const data = await loadClimateData(climateScenario, climateCrop, stationId, climateGrowthStage);

    if (!data || data.length === 0) {
      alert('데이터를 불러올 수 없습니다.');
      return;
    }

    const stationSelect = document.getElementById('climateStation');
    const stationName = stationSelect.options[stationSelect.selectedIndex].text;

    document.getElementById('climateDataInfo').innerHTML = `
      <strong>시나리오:</strong> ${scenarioNames[climateScenario]} | 
      <strong>작물:</strong> ${climateCrop} | 
      <strong>지점:</strong> ${stationName} | 
      <strong>생육단계:</strong> ${stageNames[climateGrowthStage]}
    `;

    const years = data.map(d => d.year);
    const temperatures = data.map(d => d.temperature);

    const ctx = document.getElementById('trendsChart');

    if (trendsChartInstance) {
      trendsChartInstance.destroy();
    }

    const colors = scenarioColors[climateScenario] || scenarioColors['ssp126'];

    trendsChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets: [{
          label: '평균기온 (°C)',
          data: temperatures,
          borderColor: colors.border,
          backgroundColor: colors.background,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `평균기온: ${context.parsed.y.toFixed(2)}°C`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '연도',
              font: { size: 14 }
            },
            ticks: {
              autoSkip: false,
              font: { size: 11 },
              callback: function(value, index, ticks) {
                const year = this.getLabelForValue(value);
                if (index === 0) {
                  return 2026;
                }
                if (index === ticks.length - 1) {
                  return 2100;
                }
                if (year >= 2030 && year % 5 === 0 && year < 2100) {
                  return year;
                }
                return '';
              }
            }
          },
          y: {
            title: {
              display: true,
              text: '평균기온 (°C)',
              font: { size: 14 }
            },
            ticks: {
              font: { size: 11 }
            }
          }
        }
      }
    });

    document.getElementById('climateChartContainer').style.display = 'block';
  }

  document.getElementById('cropType').addEventListener('change', async function() {
    currentCrop = this.value;
    await Promise.all([
      visualizeDataOnMap(currentScenario, currentYear, currentCrop),
      visualizeStaticMaps(currentCrop, currentPeriod),
      updateRegionalChart(currentScenario, currentYear, currentCrop)
    ]);
  });

  document.querySelectorAll('.period_btn_group button').forEach(button => {
    button.addEventListener('click', async function() {
      const btnGroup = this.parentElement;
      btnGroup.querySelectorAll('button').forEach(btn =>
        btn.classList.remove('category_btn_action')
      );
      this.classList.add('category_btn_action');

      currentPeriod = this.getAttribute('data-period');
      await visualizeStaticMaps(currentCrop, currentPeriod);
    });
  });

  document.querySelectorAll('.category_btn_group button').forEach(button => {
    button.addEventListener('click', async function() {
      const btnGroup = this.parentElement;

      if (!this.hasAttribute('data-scenario')) {
        btnGroup.querySelectorAll('button').forEach(btn =>
          btn.classList.remove('category_btn_action')
        );
        this.classList.add('category_btn_action');
        currentScenario = scenarioMap[this.getAttribute('data-id')];
        await Promise.all([
          visualizeDataOnMap(currentScenario, currentYear, currentCrop),
          updateRegionalChart(currentScenario, currentYear, currentCrop)
        ]);
      } else {
        btnGroup.querySelectorAll('button').forEach(btn =>
          btn.classList.remove('category_btn_action')
        );
        this.classList.add('category_btn_action');
        climateScenario = this.getAttribute('data-scenario');
      }
    });
  });

  document.getElementById('climateCropType').addEventListener('change', function() {
    climateCrop = this.value;
  });

  document.getElementById('climateGrowthStage').addEventListener('change', function() {
    climateGrowthStage = this.value;
  });

  document.getElementById('loadClimateDataBtn').addEventListener('click', displayClimateChart);

  // ========== 지도 초기화 (수정됨) ==========

  const createStyle = (color, width) => new ol.style.Style({
    stroke: new ol.style.Stroke({ color, width }),
    fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0)' })
  });

  const createLayer = (url, style, zIndex) => new ol.layer.Vector({
    source: new ol.source.Vector({ url, format: new ol.format.GeoJSON() }),
    style, zIndex
  });

  const createMap = (target, center, zoom, interactive = true) => {
    try {
      const screenSize = getScreenSize();
      const adjustedZoom = getZoomLevel(target, screenSize);
      const adjustedCenter = getMapCenter(target, screenSize);

      const sigLayer = createLayer('/static/ssp/data/SIG_wgs84.json.gz', createStyle('#000', 1), 1);
      const ctpLayer = createLayer('/static/ssp/data/CTPRVN_wgs84.json.gz', createStyle('#000', 1.5), 2);

      const map = new ol.Map({
        target,
        layers: [sigLayer, ctpLayer],
        view: new ol.View({
          center: ol.proj.fromLonLat(adjustedCenter),
          zoom: adjustedZoom,
          minZoom: interactive ? 5.5 : adjustedZoom,
          maxZoom: interactive ? 10 : adjustedZoom
        }),
        controls: interactive ? undefined : [],
        interactions: interactive ? undefined : []
      });

      if (target === 'mainMap') {
        mainMap = map;
        mainMapLayer = sigLayer;
        mainMapCtpLayer = ctpLayer;
      } else {
        staticMapLayers[target] = { sigLayer, ctpLayer };
        staticMaps[target] = map;
      }
      return map;
    } catch(e) {
      console.error(`❌ ${target} error:`, e);
    }
  };

  createMap('mainMap', [127.6, 36.1], 6.3, true);
  ['map1', 'map2', 'map3', 'map4'].forEach(id => createMap(id, [127.6, 35.9], 5.4, false));

  // ========== 반응형 지도 리사이즈 이벤트 (추가됨) ==========
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      const screenSize = getScreenSize();

      // 메인 지도 업데이트
      if (mainMap) {
        const mainZoom = getZoomLevel('mainMap', screenSize);
        const mainCenter = getMapCenter('mainMap', screenSize);
        mainMap.getView().setZoom(mainZoom);
        mainMap.getView().setCenter(ol.proj.fromLonLat(mainCenter));
        mainMap.updateSize();
      }

      // 정적 지도들 업데이트
      ['map1', 'map2', 'map3', 'map4'].forEach(id => {
        if (staticMaps[id]) {
          const staticZoom = getZoomLevel(id, screenSize);
          const staticCenter = getMapCenter(id, screenSize);
          staticMaps[id].getView().setZoom(staticZoom);
          staticMaps[id].getView().setCenter(ol.proj.fromLonLat(staticCenter));
          staticMaps[id].updateSize();
        }
      });
    }, 250);
  });

  // ========== 차트 초기화 ==========

  const ctx = document.getElementById('barChart');
  if (ctx) {
    barChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['경기도', '강원도', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주도'],
        datasets: [{
          label: '물필요량 (mm)',
          data: Array(9).fill(0),
          backgroundColor: ['#E8A5A5', '#7EAED3', '#F2A65A', '#D4C5A9', '#B87A5C', '#8B4513', '#9B8DC8', '#87CEEB', '#FFA07A'],
          borderWidth: 0,
          barThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => '물필요량: ' + context.parsed.y.toFixed(2) + ' mm'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1000,
            ticks: { stepSize: 200, font: { size: 10 } },
            grid: { display: true, color: '#e0e0e0' }
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  const yearSlider = document.getElementById('yearSlider');
  const currentYearDisplay = document.getElementById('currentYearDisplay');
  const playButton = document.getElementById('playButton');

  yearSlider.addEventListener('input', async function() {
    currentYear = parseInt(this.value);
    currentYearDisplay.textContent = currentYear + '년';
    await Promise.all([
      visualizeDataOnMap(currentScenario, currentYear, currentCrop),
      updateRegionalChart(currentScenario, currentYear, currentCrop)
    ]);
  });

  playButton.addEventListener('click', function() {
    const playIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#4A90E2"/><path d="M10 8l6 4-6 4V8z" fill="white"/></svg>';
    const pauseIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#4A90E2"/><rect x="9" y="8" width="2" height="8" fill="white"/><rect x="13" y="8" width="2" height="8" fill="white"/></svg>';

    if (isPlaying) {
      clearInterval(playInterval);
      isPlaying = false;
      this.innerHTML = playIcon;
    } else {
      isPlaying = true;
      this.innerHTML = pauseIcon;
      playInterval = setInterval(async () => {
        let currentValue = parseInt(yearSlider.value);
        if (currentValue >= 2100) {
          clearInterval(playInterval);
          isPlaying = false;
          playButton.innerHTML = playIcon;
        } else {
          currentYear = currentValue + 1;
          yearSlider.value = currentYear;
          currentYearDisplay.textContent = currentYear + '년';
          await Promise.all([
            visualizeDataOnMap(currentScenario, currentYear, currentCrop),
            updateRegionalChart(currentScenario, currentYear, currentCrop)
          ]);
        }
      }, 500);
    }
  });

  const stationNames = [
    '김포시', '하남시', '전주시', '거제시', '창원시', '장흥군', '칠곡군', '보은군', '대전광역시', '수원시',
    '속초시', '영천시', '강릉시', '창녕군', '남해군', '서천군', '동해시', '논산시', '양구군', '화순군',
    '봉화군', '구례군', '영양군', '동두천시', '철원군', '춘천시', '공주시', '서산시', '의령군', '신안군',
    '구미시', '이천시', '제천시', '보령시', '시흥시', '장수군', '파주시', '부여군', '순창군', '울릉군',
    '남원시', '군위군', '계룡시', '상주시', '제주시', '태백시', '완도군', '광주시', '안양시', '영덕군',
    '군포시', '광명시', '안산시', '임실군', '경주시', '김제시', '성주군', '청송군', '부산광역시 기장군', '괴산군',
    '진주시', '장성군', '나주시', '산청군', '충주시', '금산군', '여주시', '밀양시', '양양군', '의왕시',
    '예천군', '원주시', '화천군', '곡성군', '남양주시', '고흥군', '영월군', '평창군', '통영시', '영암군',
    '보성군', '안동시', '부천시', '순천시', '고성군', '완주군', '진안군', '옥천군', '서울특별시', '세종특별자치시',
    '양평군', '청주시', '광주광역시', '합천군', '연천군', '고양시', '거창군', '성남시', '해남군', '목포시',
    '당진시', '익산시', '과천시', '용인시', '대구광역시 달성군', '구리시', '정선군', '함안군', '양주시', '대구광역시',
    '포천시', '횡성군', '태안군', '사천시', '함양군', '정읍시', '부안군', '청양군', '증평군', '영주시',
    '양산시', '진천군', '순천시', '고성군', '완주군', '장흥군', '칠곡군', '보은군', '의정부시', '의성군',
    '인제군', '오산시', '고창군', '울진군', '울산광역시 울주군', '경산시', '홍성군', '화성시', '천안시', '가평군',
    '김천시', '인천광역시 옹진군', '고성군', '영광군', '무안군', '울산광역시', '단양군', '함평군', '진도군', '안성시',
    '여수시', '부산광역시', '영동군', '예산군', '홍천군', '무주군', '음성군', '포항시', '인천광역시', '아산시',
    '광양시', '청도군', '하동군', '담양군', '강진군', '삼척시', '인천광역시 강화군'
  ];

  const stationSelect = document.getElementById('station');
  const climateStationSelect = document.getElementById('climateStation');

  stationNames.forEach((name, index) => {
    const stationId = index + 1;
    stationSelect.insertAdjacentHTML('beforeend', `<option value="${stationId}">${name}</option>`);
    climateStationSelect.insertAdjacentHTML('beforeend', `<option value="${stationId}">${name}</option>`);
  });

  document.getElementById('loadDataBtn').addEventListener('click', async function() {
    const stationId = String(document.getElementById('station').value);
    if (!stationId) {
      alert('지점을 선택해주세요.');
      return;
    }

    const stationSelect = document.getElementById('station');
    const stationName = stationSelect.options[stationSelect.selectedIndex].text;

    const result = await getWaterRequirementFromPrecomputed(currentScenario, currentYear, currentCrop);

    if (!result || !result.stageData[stationId]) {
      alert('해당 지점의 데이터를 찾을 수 없습니다.');
      return;
    }

    const stageData = result.stageData[stationId];
    const stageWaterRequirements = {};
    let totalWaterRequirement = 0;

    const stages = cropGrowthStages[currentCrop];
    Object.entries(stages).forEach(([stageName, stageInfo]) => {
      const dateRange = getDateRange(stageInfo.startDate, stageInfo.endDate);
      const value = stageData[stageName];

      stageWaterRequirements[stageName] = {
        value: value,
        days: dateRange.length,
        dateRange: `${stageInfo.startDate} ~ ${stageInfo.endDate}`,
        kc: stageInfo.kc
      };
      totalWaterRequirement += value;
    });

    displayData(currentScenario, currentYear, stationId, stationName, currentCrop, stageWaterRequirements, totalWaterRequirement);
  });

  function displayData(scenario, year, stationId, stationName, crop, stageWaterRequirements, totalWaterRequirement) {
    document.getElementById('dataInfo').innerHTML = `
      <strong>시나리오:</strong> ${scenarioNames[scenario]} | 
      <strong>연도:</strong> ${year}년 | 
      <strong>지점:</strong> ${stationName} |
      <strong>작물:</strong> ${crop}
    `;

    const dataTableBody = document.getElementById('dataTableBody');
    dataTableBody.innerHTML = '';

    dataTableBody.insertAdjacentHTML('beforeend', `
      <tr style="background:#e8f4f8; font-weight:600;">
        <td colspan="2" style="text-align:center; padding:8px;">생육단계별 물필요량</td>
      </tr>
    `);

    const stageNameMap = {
      '유묘기': '유묘기',
      '분얼기': '분얼기',
      '생육재생기': '생육재생기',
      '분얼및신장기': '분얼 및 신장기',
      '출수및등숙기': '출수 및 등숙기'
    };

    Object.entries(stageWaterRequirements).forEach(([stageName, stageData]) => {
      dataTableBody.insertAdjacentHTML('beforeend', `
        <tr style="background:#f9f9f9;">
          <td colspan="2" style="font-weight:600; padding:8px; border-top:2px solid #ddd;">
            ${stageNameMap[stageName]} (${stageData.dateRange})
          </td>
        </tr>
        <tr><td>작물계수 (Kc)</td><td>${stageData.kc.toFixed(2)}</td></tr>
        <tr><td>계산 기간</td><td>${stageData.days}일</td></tr>
        <tr><td>단계별 물필요량</td><td><strong>${stageData.value.toFixed(2)} mm</strong></td></tr>
      `);
    });

    dataTableBody.insertAdjacentHTML('beforeend', `
      <tr style="background:#fffacd; font-weight:600; border-top:3px solid #4A90E2;">
        <td>전체 생육기간 총 물필요량</td>
        <td style="font-size:1.1em; color:#1E4D7B;">${totalWaterRequirement.toFixed(2)} mm</td>
      </tr>
    `);

    document.getElementById('dataDisplay').style.display = 'block';
  }

  loadDistrictMapping().then(() => {
    Promise.all([
      visualizeDataOnMap(currentScenario, currentYear, currentCrop),
      visualizeStaticMaps(currentCrop, currentPeriod),
      updateRegionalChart(currentScenario, currentYear, currentCrop)
    ]);
  });
});