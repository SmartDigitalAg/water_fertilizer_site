// /static/js/soil_water_stub.js
$(function(){
  // 1) 매핑 데이터
  const sidoList = {
    '51': '강원특별자치도',
    '41': '경기도',
    '45': '전북특별자치도'
  };
  const sggMap = {
    '51': ['춘천시','원주시','강릉시'],
    '41': ['수원시','성남시','안산시'],
    '45': ['완주군','익산시','정읍시']
  };
  const cropMap = {
    '01': ['옥수수','콩','보리'],
    '02': ['배추','상추','시금치'],
    '03': ['감자','고구마']
  };
  const stageInfoMap = {
    '유묘기':         { period:'10/10~10/31', waterTon:5.25, dailyTon:0.19 },
    '분얼기':         { period:'11/01~12/10', waterTon:5.77, dailyTon:0.14 },
    '생육재생기':     { period:'02/10~02/28', waterTon:6.26, dailyTon:0.21 },
    '분얼 및 신장기': { period:'03/01~04/20', waterTon:22.17,dailyTon:0.43 },
    '출수 및 등숙기': { period:'04/21~05/10', waterTon:10.95,dailyTon:0.55 }
  };

  // 2) 시도 초기화
  Object.entries(sidoList).forEach(([val,name])=>{
    $('#sido').append(`<option value="${val}">${name}</option>`);
  });

  // 3) 연동 처리
  $('#sido').on('change', function(){
    const arr = sggMap[$(this).val()] || [];
    $('#sgg').html('<option value="">시군구 선택</option>');
    arr.forEach(n=> $('#sgg').append(`<option>${n}</option>`));
  });
  $('#crop_gbn').on('change', function(){
    const arr = cropMap[$(this).val()] || [];
    $('#crop').html('<option value="">작물 선택</option>');
    arr.forEach(n=> $('#crop').append(`<option>${n}</option>`));
  });

  // 4) 권장 날짜
  $('#exam_day').on('change', function(){
    const d = $(this).val()||'―';
    $('#recommended').text('권장 파종·정식시기: ' + d);
  });

  // 5) 요약 함수
  const D = {
    sido:    ()=> $('#sido option:selected').text()   || '-',
    sgg:     ()=> $('#sgg option:selected').text()    || '-',
    crop:    ()=> $('#crop option:selected').text()   || '-',
    date:    ()=> $('#exam_day').val()                || '-',
    weather: ()=> $('#weather option:selected').text()|| '-',
    irr:     ()=> $('#irrigation option:selected').text()|| '-',
    area:    ()=> ($('#area').val() ? parseFloat($('#area').val()).toFixed(0) : '-')
  };

  // 6) 상세 리포트 함수
  const stages    = ()=> Object.keys(stageInfoMap);
  const periodOf  = s=> stageInfoMap[s].period;
  const waterOf   = s=> stageInfoMap[s].waterTon.toFixed(2);
  const dailyOf   = s=> stageInfoMap[s].dailyTon.toFixed(2);

  // 7) 검색 클릭 (두 개 테이블 생성)
  $('#search').on('click', function(){
    // 1차 요약 테이블: 관수면적(m²)을 입력값 그대로 표시
    const summary = `
      <table>
        <thead>
          <tr>
            <th>시도</th><th>시군구</th><th>작물</th>
            <th>파종·정식시기</th><th>기상정보</th>
            <th>관수방법</th><th>관수면적(m²)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${D.sido()}</td>
            <td>${D.sgg()}</td>
            <td>${D.crop()}</td>
            <td>${D.date()}</td>
            <td>${D.weather()}</td>
            <td>${D.irr()}</td>
            <td>${D.area()}</td>
          </tr>
        </tbody>
      </table>`;

    // 2차 상세 리포트
    let totalW=0, totalD=0,
        detail = `
      <table>
        <thead>
          <tr>
            <th>생육단계</th>
            <th>생육기간<br>(월/일)</th>
            <th>물 필요량<br>(톤/100m²)</th>
            <th>일별 물 필요량<br>(톤/day)</th>
          </tr>
        </thead>
        <tbody>`;
    stages().forEach(s=>{
      const w = parseFloat(waterOf(s)),
            d = parseFloat(dailyOf(s));
      totalW += w;
      totalD += d;
      detail += `
        <tr>
          <td>${s}</td>
          <td>${periodOf(s)}</td>
          <td>${w.toFixed(2)}</td>
          <td>${d.toFixed(2)}</td>
        </tr>`;
    });
    detail += `
        <tr>
          <td>계</td><td></td>
          <td>${totalW.toFixed(2)}</td>
          <td>${totalD.toFixed(2)}</td>
        </tr>
      </tbody>
      </table>`;

    $('#result').html(summary);
    $('#report').html(detail);
  });

  // 8) 초기화
  $('#reset').on('click', function(){
    $('#sido, #sgg, #crop_gbn, #crop, #weather, #irrigation').val('');
    $('#sgg, #crop').html('<option value="">선택</option>');
    $('#exam_day').val('');
    $('#recommended').text('권장 파종·정식시기: ―');
    $('#area').val('');
    $('#result, #report').empty();
  });
});
