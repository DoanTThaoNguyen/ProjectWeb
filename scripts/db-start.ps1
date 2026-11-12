# Chay MariaDB rieng cua du an o cong 3307 (cua so rieng, dong cua so = tat DB).
param([string]$MariaDbBin = $env:MARIADB_BIN)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $MariaDbBin) {
  $found = Get-ChildItem 'C:\Program Files' -Directory -Filter 'MariaDB*' | Sort-Object Name -Descending | Select-Object -First 1
  $MariaDbBin = Join-Path $found.FullName 'bin'
}
$ini = Join-Path $root '.localdb\data\my.ini'
& (Join-Path $MariaDbBin 'mariadbd.exe') "--defaults-file=$ini" --console --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci --default-time-zone=+07:00
