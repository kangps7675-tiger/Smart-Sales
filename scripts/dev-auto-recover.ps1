# 개발 서버 자동 복구 스크립트
# 
# 역할:
# - 개발 서버 시작 전 환경 체크
# - 문제 발견 시 자동 복구 시도
# - 복구 후 개발 서버 시작
#
# 사용법:
#   .\scripts\dev-auto-recover.ps1
# 또는 npm run dev

Write-Host "개발 서버 자동 복구 모드 시작...`n" -ForegroundColor Cyan

# 포트 3000 사용 중인 프로세스 종료 (EADDRINUSE 방지)
$port = 3000
$killed = $false
$netstatLines = @(netstat -ano 2>$null | findstr ":$port ")
if ($netstatLines.Count -gt 0) {
    $pidsToKill = @()
    foreach ($line in $netstatLines) {
        $parts = $line.Trim() -split '\s+'
        $pidToKill = $parts[-1]
        if ($pidToKill -match '^\d+$' -and $pidToKill -ne "0") { $pidsToKill += $pidToKill }
    }
    $pidsToKill = $pidsToKill | Sort-Object -Unique
    foreach ($processId in $pidsToKill) {
        Write-Host "포트 $port 사용 중인 프로세스 종료 (PID: $processId)..." -ForegroundColor Yellow
        taskkill /PID $processId /F 2>$null
        $killed = $true
    }
    if ($killed) { 
        Start-Sleep -Seconds 3
        Write-Host "포트 $port 를 사용 가능하게 했습니다.`n" -ForegroundColor Green 
    }
}

# 환경 체크 스크립트 실행
$checkScript = Join-Path $PSScriptRoot "check-env.ps1"
if (Test-Path $checkScript) {
    Write-Host "환경 상태 확인 중..." -ForegroundColor Yellow
    & $checkScript
    Write-Host ""
}

# 빌드 캐시 확인 및 정리
if (Test-Path ".next") {
    Write-Host "⚠ 빌드 캐시가 발견되었습니다." -ForegroundColor Yellow
    Write-Host "  문제 발생 시 자동으로 정리됩니다." -ForegroundColor Gray
}

# node_modules 확인
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠ node_modules가 없습니다. 설치를 시작합니다..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ npm install 실패" -ForegroundColor Red
        exit 1
    }
}

Write-Host "개발 서버 시작 중...`n" -ForegroundColor Green

# 개발 서버 시작
$maxRetries = 3
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    # 포트 재확인 및 정리 (재시도 시)
    if ($retryCount -gt 0) {
        Write-Host "포트 $port 재확인 중..." -ForegroundColor Yellow
        $netstatLines = @(netstat -ano 2>$null | findstr ":$port ")
        if ($netstatLines.Count -gt 0) {
            $pidsToKill = @()
            foreach ($line in $netstatLines) {
                $parts = $line.Trim() -split '\s+'
                $processIdToKill = $parts[-1]
                if ($processIdToKill -match '^\d+$' -and $processIdToKill -ne "0") { 
                    $pidsToKill += $processIdToKill 
                }
            }
            $pidsToKill = $pidsToKill | Sort-Object -Unique
            foreach ($processId in $pidsToKill) {
                Write-Host "  프로세스 종료 (PID: $processId)..." -ForegroundColor Yellow
                taskkill /PID $processId /F 2>$null
            }
            Start-Sleep -Seconds 2
        }
    }
    
    try {
        npx next dev -p 3000
        # 성공 시 루프 종료
        break
    } catch {
        $retryCount++
        Write-Host "`n⚠ 개발 서버 시작 실패 (시도 $retryCount/$maxRetries)" -ForegroundColor Yellow
        
        if ($retryCount -lt $maxRetries) {
            Write-Host "빌드 캐시 정리 후 재시도합니다..." -ForegroundColor Yellow
            
            # 빌드 캐시 정리
            $cleanScript = Join-Path $PSScriptRoot "clean-build.ps1"
            if (Test-Path $cleanScript) {
                & $cleanScript
            }
            
            Write-Host "3초 후 재시도합니다...`n" -ForegroundColor Gray
            Start-Sleep -Seconds 3
        } else {
            Write-Host "✗ 최대 재시도 횟수에 도달했습니다." -ForegroundColor Red
            Write-Host "  수동으로 'npm run kill:3000' 또는 'npm run clean:all'을 실행해보세요." -ForegroundColor Yellow
            exit 1
        }
    }
}
