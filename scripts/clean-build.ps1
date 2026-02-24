# 빌드 캐시 정리 스크립트
# 
# 역할:
# - .next 디렉토리 삭제
# - node_modules/.cache 디렉토리 삭제
# - 빌드 캐시 관련 오류 방지
#
# 사용법:
#   .\scripts\clean-build.ps1
# 또는 npm run clean

Write-Host "빌드 캐시 정리 중..." -ForegroundColor Yellow

# .next 디렉토리 삭제
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✓ .next 디렉토리 삭제 완료" -ForegroundColor Green
} else {
    Write-Host "  .next 디렉토리가 없습니다." -ForegroundColor Gray
}

# node_modules/.cache 디렉토리 삭제
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✓ node_modules\.cache 디렉토리 삭제 완료" -ForegroundColor Green
} else {
    Write-Host "  node_modules\.cache 디렉토리가 없습니다." -ForegroundColor Gray
}

Write-Host "`n빌드 캐시 정리 완료!" -ForegroundColor Green
