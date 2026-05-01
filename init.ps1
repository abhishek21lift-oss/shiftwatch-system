# =============================================================================
# ShiftWatch — No-Docker Initialization Script (Windows / PowerShell)
# =============================================================================
# Run from the project root:
#     powershell -ExecutionPolicy Bypass -File .\init.ps1
#
# Prerequisites on your machine (one-time):
#   1. Node.js 20+         https://nodejs.org/
#   2. PostgreSQL 14+      https://www.postgresql.org/download/windows/
#      During install, remember the password you set for the 'postgres' user.
#   3. psql.exe must be on PATH (the Postgres installer offers this).
# =============================================================================

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# ---------------------------------------------------------------------------
# 1. Sanity checks
# ---------------------------------------------------------------------------
Write-Step "Checking prerequisites"
foreach ($cmd in @("node","npm","psql")) {
    if (-not (Test-Command $cmd)) {
        Write-Host "  Missing: $cmd  — please install it and re-run." -ForegroundColor Red
        exit 1
    }
    Write-Host "  OK: $cmd  ($(& $cmd --version 2>&1 | Select-Object -First 1))"
}

# ---------------------------------------------------------------------------
# 2. Collect Postgres password
# ---------------------------------------------------------------------------
Write-Step "Postgres credentials"
$pgPasswordSecure = Read-Host "Enter password for the 'postgres' user" -AsSecureString
$pgPassword = [System.Net.NetworkCredential]::new("", $pgPasswordSecure).Password
$env:PGPASSWORD = $pgPassword

# ---------------------------------------------------------------------------
# 3. Backend: .env + npm install
# ---------------------------------------------------------------------------
Write-Step "Setting up backend"
Push-Location "$root\backend"

$envPath = ".\.env"
if (-not (Test-Path $envPath)) {
    Copy-Item ".\.env.example" $envPath
    $jwtSecret = -join ((1..64) | ForEach-Object { [char]((48..57) + (65..90) + (97..122) | Get-Random) })
    (Get-Content $envPath) `
        -replace "your_password_here", $pgPassword `
        -replace "your_super_secret_jwt_key_change_this_in_production_min_32_chars", $jwtSecret |
        Set-Content $envPath
    Write-Host "  Created backend\.env with a generated JWT secret."
} else {
    Write-Host "  backend\.env already exists — leaving untouched."
}

Write-Host "  Running npm install (this may take a minute)..."
npm install --no-audit --no-fund
Pop-Location

# ---------------------------------------------------------------------------
# 4. Frontend: npm install
# ---------------------------------------------------------------------------
Write-Step "Setting up frontend"
Push-Location "$root\frontend"
Write-Host "  Running npm install..."
npm install --no-audit --no-fund
Pop-Location

# ---------------------------------------------------------------------------
# 5. Database: create + load schema
# ---------------------------------------------------------------------------
Write-Step "Initializing PostgreSQL database"

$dbExists = (& psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='shiftwatch_db'") 2>&1
if ($dbExists -match "1") {
    Write-Host "  Database 'shiftwatch_db' already exists — skipping CREATE."
} else {
    Write-Host "  Creating database 'shiftwatch_db'..."
    & psql -U postgres -h localhost -c "CREATE DATABASE shiftwatch_db;"
}

Write-Host "  Loading schema and seed data..."
& psql -U postgres -h localhost -d shiftwatch_db -f "$root\database\schema.sql"

Remove-Item Env:PGPASSWORD

# ---------------------------------------------------------------------------
# 6. Launch
# ---------------------------------------------------------------------------
Write-Step "Launching backend and frontend in new windows"
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\backend'; npm run dev"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\frontend'; npm start"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  ShiftWatch is starting up!" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:3000" -ForegroundColor Green
Write-Host "  Backend  : http://localhost:5000/api" -ForegroundColor Green
Write-Host "  Login    : admin / Admin@123" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
