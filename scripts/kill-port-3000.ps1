# 포트 3000 사용 중인 프로세스만 종료
# 사용법: .\scripts\kill-port-3000.ps1 또는 npm run kill:3000

$port = 3000
$lines = @(netstat -ano 2>$null | findstr ":$port ")
if ($lines.Count -eq 0) {
    Write-Host "포트 $port 를 사용 중인 프로세스가 없습니다." -ForegroundColor Green
    exit 0
}
$pids = @()
foreach ($line in $lines) {
    $parts = $line.Trim() -split '\s+'
    $processId = $parts[-1]
    if ($processId -match '^\d+$' -and $processId -ne "0") { $pids += $processId }
}
$pids = $pids | Sort-Object -Unique
foreach ($processId in $pids) {
    Write-Host "포트 $port 사용 프로세스 종료 (PID: $processId)..." -ForegroundColor Yellow
    taskkill /PID $processId /F 2>$null
}
Write-Host "완료. 이제 npm run dev 를 실행하세요." -ForegroundColor Green
