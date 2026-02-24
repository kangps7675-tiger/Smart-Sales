# 개발 환경 체크 스크립트
# 
# 역할:
# - 필수 디렉토리 및 파일 존재 여부 확인
# - Node.js 및 npm 버전 확인
# - 빌드 캐시 상태 확인
# - 일반적인 문제 진단
#
# 사용법:
#   .\scripts\check-env.ps1

Write-Host "개발 환경 체크 중...`n" -ForegroundColor Cyan

$errors = @()
$warnings = @()

# Node.js 버전 확인
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    $errors += "Node.js가 설치되어 있지 않습니다."
    Write-Host "✗ Node.js: 설치되지 않음" -ForegroundColor Red
}

# npm 버전 확인
try {
    $npmVersion = npm --version
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    $errors += "npm이 설치되어 있지 않습니다."
    Write-Host "✗ npm: 설치되지 않음" -ForegroundColor Red
}

Write-Host ""

# 필수 디렉토리 확인 (public은 Next.js 선택 사항이므로 없으면 생성)
$requiredDirs = @("src", "node_modules")
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "✓ $dir 디렉토리 존재" -ForegroundColor Green
    } else {
        $warnings += "$dir 디렉토리가 없습니다."
        Write-Host "⚠ $dir 디렉토리 없음" -ForegroundColor Yellow
    }
}
if (-not (Test-Path "public")) {
    New-Item -ItemType Directory -Path "public" -Force | Out-Null
    Write-Host "✓ public 디렉토리 생성됨 (없어서 생성)" -ForegroundColor Green
} else {
    Write-Host "✓ public 디렉토리 존재" -ForegroundColor Green
}

Write-Host ""

# 빌드 캐시 확인
if (Test-Path ".next") {
    Write-Host "⚠ .next 디렉토리가 존재합니다. (빌드 캐시)" -ForegroundColor Yellow
    Write-Host "  문제가 발생하면 'npm run clean'을 실행하세요." -ForegroundColor Gray
} else {
    Write-Host "✓ .next 디렉토리 없음 (정상)" -ForegroundColor Green
}

if (Test-Path "node_modules\.cache") {
    Write-Host "⚠ node_modules\.cache 디렉토리가 존재합니다." -ForegroundColor Yellow
    Write-Host "  문제가 발생하면 'npm run clean'을 실행하세요." -ForegroundColor Gray
} else {
    Write-Host "✓ node_modules\.cache 디렉토리 없음 (정상)" -ForegroundColor Green
}

Write-Host ""

# 요약
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ 모든 체크 통과!" -ForegroundColor Green
} else {
    if ($errors.Count -gt 0) {
        Write-Host "✗ 발견된 오류:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "  - $error" -ForegroundColor Red
        }
    }
    if ($warnings.Count -gt 0) {
        Write-Host "`n⚠ 경고:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
}
