import gzip
import shutil
from pathlib import Path

# 파일 경로 설정
data_dir = Path(r'C:\code\soil_site\water\static\water\data')

# 압축할 파일 목록
files_to_compress = [
    'CTPRVN_wgs84.json',
    'SIG_wgs84.json',
    'EMD_wgs84.json',
    'LI_wgs84.json',
    'slope.csv'
]


def compress_file(input_path, output_path):
    """파일을 gzip으로 압축"""
    with open(input_path, 'rb') as f_in:
        with gzip.open(output_path, 'wb', compresslevel=9) as f_out:
            shutil.copyfileobj(f_in, f_out)
    return output_path


def main():
    print("파일 압축을 시작합니다...\n")

    # 각 파일 압축
    for filename in files_to_compress:
        input_file = data_dir / filename
        output_file = data_dir / f"{filename}.gz"

        if not input_file.exists():
            print(f"❌ {filename} 파일을 찾을 수 없습니다.")
            continue

        try:
            # 파일 압축
            compress_file(input_file, output_file)

            # 압축 결과 확인
            original_size = input_file.stat().st_size
            compressed_size = output_file.stat().st_size
            ratio = (1 - compressed_size / original_size) * 100

            print(f"✅ {filename}")
            print(f"   원본: {original_size:,} bytes")
            print(f"   압축: {compressed_size:,} bytes")
            print(f"   압축률: {ratio:.1f}%\n")

        except Exception as e:
            print(f"❌ {filename} 압축 중 오류 발생: {e}\n")

    print("압축 완료!")


if __name__ == "__main__":
    main()