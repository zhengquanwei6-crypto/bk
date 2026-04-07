param(
  [string]$ContainerName = "discuzq",
  [string]$DataDir = "D:\\book\\discuz-data",
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker 未安装或不可用。请先安装并启动 Docker Desktop。"
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

$exists = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$" -SimpleMatch
if ($exists) {
  Write-Host "检测到已存在容器 $ContainerName，正在启动..."
  docker start $ContainerName | Out-Null
} else {
  Write-Host "正在拉取 DiscuzQ 镜像并创建容器..."
  docker run -d --restart=always `
    --name $ContainerName `
    -p "${Port}:80" `
    -v "${discuzDir}:/var/lib/discuz" `
    -v "${mysqlDir}:/var/lib/mysqldb" `
    ccr.ccs.tencentyun.com/discuzq/dzq:latest | Out-Null
}

Write-Host ""
Write-Host "DiscuzQ 已启动。请在浏览器打开安装页："
Write-Host "http://localhost:${Port}/install"
