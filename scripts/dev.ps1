$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Run scripts/setup.ps1 first.' }
if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 8000 is already in use. Stop the existing backend or use the manual startup instructions.' }
$runtimePath = Join-Path $projectRoot 'runtime'
New-Item -ItemType Directory -Force -Path $runtimePath | Out-Null
$backendProcess = Start-Process -FilePath $pythonPath -ArgumentList '-m','uvicorn','backend.app:app','--host','127.0.0.1','--port','8000' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimePath 'backend.out.log') -RedirectStandardError (Join-Path $runtimePath 'backend.err.log')
try {
    Set-Location (Join-Path $projectRoot 'frontend')
    npm.cmd run dev
} finally {
    if (-not $backendProcess.HasExited) { taskkill.exe /PID $backendProcess.Id /T /F | Out-Null }
}
