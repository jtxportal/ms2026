# JTX Tipovacka MS 2026 - Deploy script
# Pouziti: .\deploy.ps1 "popis zmeny"

param([string]$msg = "update")

cd C:\Projects\ms2026

# Zkontrolovat zmeny
$changes = git status --porcelain
if (-not $changes) {
    Write-Host "Zadne zmeny k deployovani." -ForegroundColor Yellow
    exit
}

# Commit a push
git add .
git commit -m $msg
git push origin main

Write-Host ""
Write-Host "Hotovo! Vercel deployuje automaticky." -ForegroundColor Green
Write-Host "Sleduj: https://vercel.com/jtxportals-projects/ms2026/deployments" -ForegroundColor Cyan
Write-Host "Live: https://ms2026-phi.vercel.app" -ForegroundColor Cyan
