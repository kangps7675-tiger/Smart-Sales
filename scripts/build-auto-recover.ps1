# 빌드 자동 복구 스크립트
# 
# 역할:
# - 빌드 전 환경 체크
# - 빌드 실패 시 자동으로 캐시 정리 후 재시도
# - 최대 재시도 횟수 제한
#
# 사용법:
#   .\scripts\build-auto-recover.ps1
# 또는 npm run build

Write-Host "빌드 자동 복구 모드 시작...`n" -ForegroundColor Cyan

# 환경 체크
$checkScript = Join-Path $PSScriptRoot "check-env.ps1"
if (Test-Path $checkScript) {
    Write-Host "환경 상태 확인 중..." -ForegroundColor Yellow
    & $checkScript
    Write-Host ""
}

# 빌드 캐시 사전 정리 (선택적)
$preClean = $env:PRE_BUILD_CLEAN -eq "true"
if ($preClean) {
    Write-Host "사전 빌드 캐시 정리 중..." -ForegroundColor Yellow
    $cleanScript = Join-Path $PSScriptRoot "clean-build.ps1"
    if (Test-Path $cleanScript) {
        & $cleanScript
        Write-Host ""
    }
}

# 빌드 시도
$maxRetries = 2
$retryCount = 0
$buildSuccess = $false

while ($retryCount -le $maxRetries -and -not $buildSuccess) {
    Write-Host "빌드 시도 $($retryCount + 1)/$($maxRetries + 1)..." -ForegroundColor Cyan
    
    try {
        $buildOutput = npx next build 2>&1
        $buildExitCode = $LASTEXITCODE
        
        if ($buildExitCode -eq 0) {
            Write-Host "`n✓ 빌드 성공!" -ForegroundColor Green
            $buildSuccess = $true
        } else {
            throw "빌드 실패 (Exit Code: $buildExitCode)"
        }
    } catch {
        $retryCount++
        Write-Host "`n--- 빌드 출력 (실패 원인 확인용) ---" -ForegroundColor Gray
        if ($buildOutput) { Write-Host $buildOutput -ForegroundColor Gray }
        Write-Host "--- 끝 ---`n" -ForegroundColor Gray

        if ($retryCount -le $maxRetries) {
            Write-Host "⚠ 빌드 실패. 자동 복구를 시도합니다..." -ForegroundColor Yellow
            
            # 빌드 캐시 정리
            Write-Host "빌드 캐시 정리 중..." -ForegroundColor Yellow
            $cleanScript = Join-Path $PSScriptRoot "clean-build.ps1"
            if (Test-Path $cleanScript) {
                & $cleanScript
            }
            
            # node_modules/.cache도 정리
            if (Test-Path "node_modules\.cache") {
                Remove-Item -Recurse -Force "node_modules\.cache"
                Write-Host "✓ node_modules\.cache 정리 완료" -ForegroundColor Green
            }
            
            Write-Host "`n3초 후 재빌드를 시도합니다...`n" -ForegroundColor Gray
            Start-Sleep -Seconds 3
        } else {
            Write-Host "`n✗ 최대 재시도 횟수에 도달했습니다." -ForegroundColor Red
            Write-Host "`n빌드 실패 원인 분석:" -ForegroundColor Yellow
            Write-Host "  - 위 '빌드 출력'에서 오류 메시지를 확인하세요." -ForegroundColor Gray
            Write-Host "  - TypeScript/ESLint 확인: npm run lint" -ForegroundColor Gray
            Write-Host "  - 완전 재설치: npm run clean:all" -ForegroundColor Gray
            Write-Host "  - Node.js 버전: node --version" -ForegroundColor Gray
            exit 1
        }
    }
}

if (-not $buildSuccess) {
    exit 1
}
