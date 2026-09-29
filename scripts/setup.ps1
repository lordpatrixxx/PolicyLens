param([string]$Python = 'python')
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
& $Python -c "import sys; assert sys.version_info[:2] == (3, 12), 'Use Python 3.12 for this locked environment.'"
if ($LASTEXITCODE -ne 0) { throw 'Select Python 3.12 with the -Python parameter.' }
& $Python -m venv .venv
if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 is required.' }
& .\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
& .\.venv\Scripts\python.exe scripts\prepare_demo.py
if ($LASTEXITCODE -ne 0) { throw 'Demo setup failed.' }
Push-Location frontend
try { npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Frontend installation failed.' } } finally { Pop-Location }
Write-Output 'Ready. Start with: powershell -ExecutionPolicy Bypass -File scripts/dev.ps1'
