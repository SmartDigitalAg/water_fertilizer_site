import pandas as pd
import numpy as np
from pathlib import Path
import gzip
from datetime import datetime

# 작물 생육단계 정보
CROP_STAGES = {
    '보리': {
        '유묘기': {'start': '11-05', 'end': '11-20', 'kc': 0.8},
        '분얼기': {'start': '11-21', 'end': '12-25', 'kc': 1.00},
        '생육재생기': {'start': '02-10', 'end': '03-10', 'kc': 1.00},
        '분얼및신장기': {'start': '03-11', 'end': '04-25', 'kc': 1.30},
        '출수및등숙기': {'start': '04-26', 'end': '05-15', 'kc': 1.17}
    },
    '밀': {
        '유묘기': {'start': '11-05', 'end': '11-25', 'kc': 0.6},
        '분얼기': {'start': '11-26', 'end': '12-25', 'kc': 1.00},
        '생육재생기': {'start': '02-11', 'end': '03-10', 'kc': 1.05},
        '분얼및신장기': {'start': '03-11', 'end': '04-15', 'kc': 1.20},
        '출수및등숙기': {'start': '04-16', 'end': '05-15', 'kc': 0.70}
    }
}

CLIMATE_ELEMENTS = ['rhum', 'rsds', 'tmax', 'tmin', 'wspd']
DATA_PATH = Path(r'C:\code\soil_site\ssp\static\ssp\data\KACE-1-0-G')
OUTPUT_PATH = Path(r'C:\code\soil_site\ssp\static\ssp\data')


def get_date_range(start_date, end_date):
    """날짜 범위 생성"""
    dates = []
    start_m, start_d = map(int, start_date.split('-'))
    end_m, end_d = map(int, end_date.split('-'))

    current_m, current_d = start_m, start_d

    while True:
        dates.append(f"{current_m:02d}-{current_d:02d}")
        if current_m == end_m and current_d == end_d:
            break

        current_d += 1
        days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        if current_d > days_in_month[current_m - 1]:
            current_d = 1
            current_m = current_m % 12 + 1

    return dates


def get_all_growth_dates(crop):
    """작물의 모든 생육기간 날짜 + 3월, 7월 (rhum 보간용)"""
    all_dates = set()
    for stage in CROP_STAGES[crop].values():
        for date in get_date_range(stage['start'], stage['end']):
            all_dates.add(date)

    # rhum 보간을 위한 3월, 7월 데이터
    for day in range(1, 32):
        all_dates.add(f"03-{day:02d}")
        all_dates.add(f"07-{day:02d}")

    return sorted(all_dates)


def read_climate_data(scenario, year, climate_element, target_dates):
    """특정 연도, 기후요소의 CSV 파일에서 필요한 날짜 데이터만 읽기"""
    file_path = DATA_PATH / f'SQM_KACE-1-0-G_{climate_element}_{scenario}_{year}.csv'

    if not file_path.exists():
        return {}

    try:
        df = pd.read_csv(file_path)
        date_data = {}

        for target_date in target_dates:
            matched = df[df['dates'].str.contains(f'-{target_date}', na=False)]
            if not matched.empty:
                row = matched.iloc[0]
                station_data = {}
                for col in df.columns:
                    if col != 'dates' and col not in ['date']:
                        try:
                            int(col)  # station_id는 숫자
                            station_data[col] = row[col]
                        except:
                            pass
                date_data[target_date] = station_data

        return date_data

    except Exception as e:
        print(f"  ❌ 에러: {file_path.name} - {e}")
        return {}


def get_rhum_value(climate_data_by_element, date, station_id):
    """rhum 값 가져오기 (4-6월은 선형보간)"""
    month, day = map(int, date.split('-'))

    # 4월~6월은 3월, 7월 데이터로 선형보간
    if 4 <= month <= 6:
        actual_day = min(day, 30)
        march_date = f"03-{actual_day:02d}"
        july_date = f"07-{actual_day:02d}"

        march_rhum = climate_data_by_element['rhum'].get(march_date, {}).get(station_id)
        july_rhum = climate_data_by_element['rhum'].get(july_date, {}).get(station_id)

        if march_rhum is not None and july_rhum is not None and not (np.isnan(march_rhum) or np.isnan(july_rhum)):
            days_since_march = (31 if month == 4 else 61 if month == 5 else 92) + (day - 1)
            return march_rhum + (july_rhum - march_rhum) * (days_since_march / 122)

        return None

    # 다른 달은 직접 사용
    return climate_data_by_element['rhum'].get(date, {}).get(station_id)


def calculate_eto(rhum, rsds, tmax, tmin, wspd):
    """FAO Penman-Monteith ETo 계산"""
    Rn, G, P = rsds, 0, 101.3
    gamma = 0.665 * 1e-3 * P
    T = (tmax + tmin) / 2

    calc_e = lambda temp: 0.6108 * np.exp((17.27 * temp) / (temp + 237.3))
    es_tmax = calc_e(tmax)
    es_tmin = calc_e(tmin)
    es = (es_tmax + es_tmin) / 2
    ea = es * rhum
    vpd = es - ea
    delta = (4098 * calc_e(T)) / (T + 237.3) ** 2

    numerator = 0.408 * delta * (Rn - G) + gamma * (900 / (T + 273)) * wspd * vpd
    denominator = delta + gamma * (1 + 0.34 * wspd)

    return numerator / denominator if denominator != 0 else 0


def calculate_water_requirement_for_year(scenario, year, crop):
    """특정 연도, 작물의 생육단계별 물필요량 계산"""
    stages = CROP_STAGES[crop]
    all_dates = get_all_growth_dates(crop)

    # 모든 기후요소 데이터 로드
    climate_data_by_element = {}
    for element in CLIMATE_ELEMENTS:
        climate_data_by_element[element] = read_climate_data(scenario, year, element, all_dates)

    # 데이터가 없으면 스킵
    if not any(climate_data_by_element.values()):
        return None

    # 지점별 생육단계별 물필요량 저장
    station_stage_data = {}

    for stage_name, stage_info in stages.items():
        date_range = get_date_range(stage_info['start'], stage_info['end'])
        kc = stage_info['kc']

        for date in date_range:
            # 해당 날짜에 데이터가 있는 지점들
            station_ids = set()
            for element_data in climate_data_by_element.values():
                if date in element_data:
                    station_ids.update(element_data[date].keys())

            for station_id in station_ids:
                rhum = get_rhum_value(climate_data_by_element, date, station_id)
                rsds = climate_data_by_element['rsds'].get(date, {}).get(station_id)
                tmax = climate_data_by_element['tmax'].get(date, {}).get(station_id)
                tmin = climate_data_by_element['tmin'].get(date, {}).get(station_id)
                wspd = climate_data_by_element['wspd'].get(date, {}).get(station_id)

                # 모든 값이 유효한지 확인
                if all(v is not None and not np.isnan(v) for v in [rhum, rsds, tmax, tmin, wspd]):
                    eto = calculate_eto(rhum, rsds, tmax, tmin, wspd)
                    water_req = eto * kc

                    if station_id not in station_stage_data:
                        station_stage_data[station_id] = {
                            '유묘기': 0, '분얼기': 0, '생육재생기': 0,
                            '분얼및신장기': 0, '출수및등숙기': 0
                        }

                    station_stage_data[station_id][stage_name] += water_req

    return station_stage_data


def precompute_scenario(scenario):
    """시나리오별 사전 계산 (보리 + 밀)"""
    print(f"\n{'=' * 70}")
    print(f"시나리오 처리 중: {scenario}")
    print(f"{'=' * 70}")

    years = range(2026, 2101)  # 2026~2100
    crops = ['보리', '밀']
    results = []

    total_tasks = len(years) * len(crops)
    current_task = 0

    for year in years:
        for crop in crops:
            current_task += 1
            print(f"[{current_task}/{total_tasks}] {year}년 {crop} 처리 중...", end=' ')

            station_data = calculate_water_requirement_for_year(scenario, year, crop)

            if station_data:
                for station_id, stage_values in station_data.items():
                    total = sum(stage_values.values())

                    results.append({
                        'year': year,
                        'crop': crop,
                        'station_id': station_id,
                        '유묘기': round(stage_values['유묘기'], 2),
                        '분얼기': round(stage_values['분얼기'], 2),
                        '생육재생기': round(stage_values['생육재생기'], 2),
                        '분얼및신장기': round(stage_values['분얼및신장기'], 2),
                        '출수및등숙기': round(stage_values['출수및등숙기'], 2),
                        'total': round(total, 2)
                    })
                print(f"✓ ({len(station_data)}개 지점)")
            else:
                print("⚠ 데이터 없음")

    print(f"\n총 {len(results):,}개 레코드 생성 완료")

    # DataFrame 생성 및 CSV 저장
    df = pd.DataFrame(results)

    # 비압축 CSV 저장 (임시)
    csv_path = OUTPUT_PATH / f'water_req_{scenario}.csv'
    df.to_csv(csv_path, index=False, encoding='utf-8-sig')

    print(f"CSV 파일 크기: {csv_path.stat().st_size / 1024 / 1024:.2f} MB")

    # gzip 압축
    gz_path = OUTPUT_PATH / f'water_req_{scenario}.csv.gz'
    with open(csv_path, 'rb') as f_in:
        with gzip.open(gz_path, 'wb') as f_out:
            f_out.writelines(f_in)

    print(f"압축 파일 크기: {gz_path.stat().st_size / 1024 / 1024:.2f} MB")
    print(f"압축률: {(1 - gz_path.stat().st_size / csv_path.stat().st_size) * 100:.1f}%")

    # 비압축 파일 삭제
    csv_path.unlink()

    print(f"✅ {gz_path.name} 저장 완료!\n")


def main():
    print("=" * 70)
    print("물필요량 사전 계산 시작")
    print("=" * 70)
    print(f"데이터 경로: {DATA_PATH}")
    print(f"출력 경로: {OUTPUT_PATH}")
    print(f"처리 범위: 2026-2100년, 보리/밀")
    print("=" * 70)

    start_time = datetime.now()

    scenarios = ['ssp126', 'ssp245', 'ssp370', 'ssp585']

    for scenario in scenarios:
        precompute_scenario(scenario)

    end_time = datetime.now()
    elapsed = end_time - start_time

    print("=" * 70)
    print(f"✅ 모든 시나리오 계산 완료!")
    print(f"소요 시간: {elapsed}")
    print("=" * 70)
    print("\n생성된 파일:")
    for scenario in scenarios:
        gz_path = OUTPUT_PATH / f'water_req_{scenario}.csv.gz'
        if gz_path.exists():
            print(f"  - {gz_path.name} ({gz_path.stat().st_size / 1024 / 1024:.2f} MB)")


if __name__ == '__main__':
    main()