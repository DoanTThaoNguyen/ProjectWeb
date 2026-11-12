# Khoi tao MariaDB rieng cho du an (khong dung toi MariaDB he thong).
# Du lieu luu o .localdb\data (da gitignore). Chay 1 lan duy nhat.
# Cach dung:  powershell -ExecutionPolicy Bypass -File scripts\db-init.ps1
param(
  [string]$MariaDbBin = $env:MARIADB_BIN,
  [int]$Port = 3307
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $MariaDbBin) {
  $found = Get-ChildItem 'C:\Program Files' -Directory -Filter 'MariaDB*' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
  if (-not $found) { throw 'Khong tim thay MariaDB. Cai MariaDB hoac dat bien MARIADB_BIN tro toi thu muc bin.' }
  $MariaDbBin = Join-Path $found.FullName 'bin'
}
$dataDir = Join-Path $root '.localdb\data'
if (Test-Path (Join-Path $dataDir 'mysql')) { Write-Host "Da khoi tao truoc do: $dataDir"; exit 0 }

# Doc mat khau tu .env (tao tu .env.example neu chua co)
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $root '.env.example') $envFile }
$cfg = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$' } | ForEach-Object { $cfg[$Matches[1]] = $Matches[2].Trim() }

New-Item -ItemType Directory -Force $dataDir | Out-Null
& (Join-Path $MariaDbBin 'mariadb-install-db.exe') "--datadir=$dataDir" "--port=$Port" "--password=$($cfg['DB_ROOT_PASSWORD'])"
if ($LASTEXITCODE -ne 0) { throw 'mariadb-install-db that bai' }
Write-Host 'Da khoi tao. Tiep theo: scripts\db-start.ps1 roi scripts\db-setup.ps1'
