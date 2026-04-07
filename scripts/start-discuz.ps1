param(
  [string]$ContainerName = "discuzq",
  [string]$DataDir = "D:\book\discuz-data",
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
$dockerExe = Join-Path $dockerBin "docker.exe"
if (-not (Test-Path $dockerExe)) {
  throw "Docker CLI not found. Please start Docker Desktop first."
}

if ($env:PATH -notlike "*$dockerBin*") {
  $env:PATH = "$dockerBin;$env:PATH"
}

if (-not (Test-Path $DataDir)) {
  New-Item -ItemType Directory -Path $DataDir | Out-Null
}

$discuzDir = Join-Path $DataDir "discuz"
$mysqlDir = Join-Path $DataDir "mysql"

if (-not (Test-Path $discuzDir)) {
  New-Item -ItemType Directory -Path $discuzDir | Out-Null
}

if (-not (Test-Path $mysqlDir)) {
  New-Item -ItemType Directory -Path $mysqlDir | Out-Null
}

$names = & $dockerExe ps -a --format "{{.Names}}"
$exists = $names | Where-Object { $_ -eq $ContainerName }

if ($exists) {
  Write-Host "Container $ContainerName exists, starting..."
  & $dockerExe start $ContainerName | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Failed to start container $ContainerName" }
} else {
  Write-Host "Creating DiscuzQ container..."
  & $dockerExe run -d --restart=always `
    --name $ContainerName `
    -p "${Port}:80" `
    -v "${discuzDir}:/var/lib/discuz" `
    -v "${mysqlDir}:/var/lib/mysqldb" `
    ccr.ccs.tencentyun.com/discuzq/dzq:latest | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Failed to create DiscuzQ container" }
}

Write-Host "Applying admin CDN compatibility patch..."
$patchScript = @'
set -e
ADMIN_HTML="/var/www/discuz/public/admin.html"
if [ -f "$ADMIN_HTML" ]; then
  cp "$ADMIN_HTML" "${ADMIN_HTML}.bak" 2>/dev/null || true
  sed -i 's#https://dl.discuz.chat/lib/vue@2.6.11.min.js#https://unpkg.com/vue@2.6.11/dist/vue.min.js#g' "$ADMIN_HTML"
  sed -i 's#https://dl.discuz.chat/lib/vuex@3.2.0.min.js#https://cdn.jsdelivr.net/npm/vuex@3.2.0/dist/vuex.min.js#g' "$ADMIN_HTML"
  sed -i 's#<script src=https://dl.discuz.chat/dzq/admin.js></script>##g' "$ADMIN_HTML"
  sed -i 's#<script type=text/javascript src=//cloud.discuz.chat/latest.js></script>##g' "$ADMIN_HTML"
fi
'@
& $dockerExe exec $ContainerName sh -lc $patchScript | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Failed to patch DiscuzQ admin page in container" }

Write-Host "DiscuzQ started. Open: http://localhost:${Port}/install"
