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

Write-Host "DiscuzQ started. Open: http://localhost:${Port}/install"
