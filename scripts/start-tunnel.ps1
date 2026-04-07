param(
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

$cloudflared = "C:\\Users\\Administrator\\AppData\\Local\\Microsoft\\WinGet\\Links\\cloudflared.exe"
if (-not (Test-Path $cloudflared)) {
  throw "未找到 cloudflared。请先安装 cloudflared。"
}

Write-Host "启动 Cloudflare Quick Tunnel，将本地 $Port 端口暴露到公网..."
& $cloudflared tunnel --url "http://localhost:$Port"
