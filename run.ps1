# STOCK TERMINAL — local deploy helper (Windows PowerShell).
# Run from repo root:   .\run.ps1
#
# Assumes installed: Node 18+, PostgreSQL 14+, Python 3.10–3.12.

$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot

Write-Host "`n=== STOCK TERMINAL local deploy ===`n" -ForegroundColor Cyan

# ── Sanity checks ─────────────────────────────────────────────────────────
foreach ($cmd in 'node','npm','python','psql') {
    $c = Get-Command $cmd -ErrorAction SilentlyContinue
    if (-not $c) {
        Write-Host "MISSING: $cmd. Install it and re-run." -ForegroundColor Red
        exit 1
    }
    Write-Host ("OK  {0,-6} {1}" -f $cmd, $c.Source)
}

# ── 1. Database ───────────────────────────────────────────────────────────
Write-Host "`n[1/4] Database…" -ForegroundColor Yellow
$env:PGPASSWORD = Read-Host "Postgres password for user 'postgres' (hidden)" -AsSecureString |
    ForEach-Object { [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)) }

# create DB if missing (suppress error if it exists)
& psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='megamind'" 2>$null |
    ForEach-Object { $_.Trim() } | Where-Object { $_ -eq '1' } | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Could not contact postgres." -ForegroundColor Red; exit 1 }
& psql -U postgres -c "CREATE DATABASE megamind" 2>$null
& psql -U postgres -d megamind -f (Join-Path $repo 'db\schema.sql') | Out-Null
Write-Host "DB 'megamind' ready."

# ── 2. Backend venv + deps ────────────────────────────────────────────────
Write-Host "`n[2/4] Backend venv + deps (this can take a few minutes)…" -ForegroundColor Yellow
Push-Location (Join-Path $repo 'backend')
if (-not (Test-Path '.venv')) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --upgrade pip | Out-Null
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    $content = Get-Content '.env' -Raw
    $content = $content.Replace('postgres:postgres@', "postgres:$env:PGPASSWORD@")
    Set-Content '.env' $content -Encoding utf8
}
Pop-Location

# ── 3. Frontend deps ──────────────────────────────────────────────────────
Write-Host "`n[3/4] Frontend deps…" -ForegroundColor Yellow
Push-Location (Join-Path $repo 'frontend')
if (-not (Test-Path 'node_modules')) { npm install }
Pop-Location

# ── 4. Launch ─────────────────────────────────────────────────────────────
Write-Host "`n[4/4] Launching backend (:5000) and frontend (:5173)…" -ForegroundColor Yellow

$backend = Start-Process -PassThru -WindowStyle Minimized pwsh -ArgumentList @(
    '-NoExit','-Command',
    "cd '$repo\backend'; `$env:DATABASE_URL='postgresql://postgres:$env:PGPASSWORD@localhost:5432/megamind'; `$env:JWT_SECRET='dev-secret-change-me'; .\.venv\Scripts\python.exe app.py"
)
Start-Sleep -Seconds 2

$frontend = Start-Process -PassThru -WindowStyle Minimized pwsh -ArgumentList @(
    '-NoExit','-Command',
    "cd '$repo\frontend'; npm run dev"
)
Start-Sleep -Seconds 3

Write-Host "`n=== READY ===" -ForegroundColor Green
Write-Host "Open: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend PID:  $($backend.Id)"
Write-Host "Frontend PID: $($frontend.Id)"
Write-Host "`nClose the two minimized PowerShell windows to stop the servers.`n"
Start-Process "http://localhost:5173"
