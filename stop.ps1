# ClusterControl - Stop All Services
# Run: .\stop.ps1

$pidsFile = Join-Path $PSScriptRoot "logs\.pids"

if (Test-Path $pidsFile) {
    $pids = Get-Content $pidsFile
    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped PID $pid" -ForegroundColor Yellow
        } catch {}
    }
    Remove-Item $pidsFile
    Write-Host "`nAll ClusterControl services stopped." -ForegroundColor Green
} else {
    # Fallback: kill by process name
    Get-Process -Name "uvicorn","node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Stopped all uvicorn and node processes." -ForegroundColor Yellow
}
