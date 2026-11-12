# Tao database + user cho ung dung tren instance cong 3307 (chay lap lai an toan).
param([string]$MariaDbBin = $env:MARIADB_BIN, [int]$Port = 3307)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $MariaDbBin) {
  $found = Get-ChildItem 'C:\Program Files' -Directory -Filter 'MariaDB*' | Sort-Object Name -Descending | Select-Object -First 1
  $MariaDbBin = Join-Path $found.FullName 'bin'
}
$cfg = @{}
Get-Content (Join-Path $root '.env') | Where-Object { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$' } | ForEach-Object { $cfg[$Matches[1]] = $Matches[2].Trim() }
$sql = @"
CREATE DATABASE IF NOT EXISTS $($cfg['DB_NAME']) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$($cfg['DB_USER'])'@'localhost' IDENTIFIED BY '$($cfg['DB_PASSWORD'])';
CREATE USER IF NOT EXISTS '$($cfg['DB_USER'])'@'127.0.0.1' IDENTIFIED BY '$($cfg['DB_PASSWORD'])';
GRANT ALL PRIVILEGES ON $($cfg['DB_NAME']).* TO '$($cfg['DB_USER'])'@'localhost';
GRANT ALL PRIVILEGES ON $($cfg['DB_NAME']).* TO '$($cfg['DB_USER'])'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
$sql | & (Join-Path $MariaDbBin 'mariadb.exe') --user=root "--password=$($cfg['DB_ROOT_PASSWORD'])" --host=127.0.0.1 "--port=$Port"
if ($LASTEXITCODE -ne 0) { throw 'Tao database that bai' }
Write-Host "OK: database $($cfg['DB_NAME']) / user $($cfg['DB_USER'])"
