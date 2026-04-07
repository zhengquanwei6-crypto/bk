# Zero-Cost Deployment Plan (DiscuzQ + GitHub Pages)

## Goal

- Frontend is always online with GitHub Pages.
- DiscuzQ runs on your local machine.
- Public access to DiscuzQ is provided by Cloudflare Quick Tunnel.
- Total server cost: 0.

## What Is Already Done

- Added GitHub Pages workflow: `.github/workflows/pages.yml`
- Client build is static-host friendly:
  - `client/vite.config.js` uses `base: './'`
  - `client/src/App.jsx` uses `HashRouter`
- Added helper scripts:
  - `scripts/start-discuz.ps1`
  - `scripts/start-tunnel.ps1`

## One Blocking Prerequisite

Docker Desktop must be installed and running.

If `winget install Docker.DockerDesktop` prompts a UAC window, click **Yes**.
Without Docker, DiscuzQ container cannot start.

## Run DiscuzQ Locally

```powershell
cd D:\book\blog-system
powershell -ExecutionPolicy Bypass -File .\scripts\start-discuz.ps1
```

Then open:

- `http://localhost:8080/install`

Complete the DiscuzQ install wizard.

Note:
- The startup script now auto-patches DiscuzQ admin page CDN dependencies to avoid "admin loading forever" when `dl.discuz.chat` is unreachable.

## Expose DiscuzQ to Internet (Free)

```powershell
cd D:\book\blog-system
powershell -ExecutionPolicy Bypass -File .\scripts\start-tunnel.ps1
```

Cloudflared will print a public `https://xxxx.trycloudflare.com` URL.
Keep this terminal running.

## Connect Frontend to DiscuzQ URL

Set GitHub Repository Variables:

- `VITE_DISCUZ_URL` = your Cloudflare public URL
- `VITE_DISCUZ_CATEGORY_ID` = `1` (or your actual category id)

Path:

- GitHub repo -> `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`

## Publish Frontend

Push any commit to `main`. GitHub Actions will auto deploy.

Site URL:

- `https://zhengquanwei6-crypto.github.io/bk/`

## Notes

- If your PC is off, DiscuzQ is unreachable.
- Cloudflare Quick Tunnel URL may change after restart; update `VITE_DISCUZ_URL` if it changes.

## Source References

- DiscuzQ container run guidance:
  - https://doc.q.discuz.vip/guide/qa.html
- GitHub Pages overview:
  - https://docs.github.com/articles/using-a-static-site-generator-other-than-jekyll
