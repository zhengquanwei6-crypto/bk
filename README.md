# AI Image Generator Platform

A self-hostable AI image generation platform that you can run on a VPS,
access from the web, and ship as an Android APK.

- One front-end UI for end users to generate images with multiple providers
- One admin console to add / edit / enable / disable / set-default API sources
- Built-in AI agent: paste an API doc URL, it fills out the source config
- First version ships with **Kie.ai GPT Image-2 (Text-to-Image)** as the
  default provider
- VPS deploy via Docker + Nginx + Certbot. APK via Capacitor WebView.

> Stack: Next.js 14 (App Router) · React · TypeScript · Tailwind CSS · Prisma · SQLite · Docker · Capacitor 6 (Android)

---

## Table of contents

1. [Project intro](#1-project-intro)
2. [Local development](#2-local-development)
3. [Environment variables](#3-environment-variables)
4. [Initialize the database with Prisma](#4-initialize-the-database-with-prisma)
5. [Seed the default API source](#5-seed-the-default-api-source)
6. [Run the project](#6-run-the-project)
7. [Sign in to the admin console](#7-sign-in-to-the-admin-console)
8. [Add an API source by doc URL](#8-add-an-api-source-by-doc-url)
9. [AI-recognize an API source](#9-ai-recognize-an-api-source)
10. [Manually edit an API source](#10-manually-edit-an-api-source)
11. [Set the default API source](#11-set-the-default-api-source)
12. [Switch sources from the front-end](#12-switch-sources-from-the-front-end)
13. [VPS Docker deployment](#13-vps-docker-deployment)
14. [Nginx reverse proxy](#14-nginx-reverse-proxy)
15. [HTTPS with Certbot](#15-https-with-certbot)
16. [Backing up the SQLite database](#16-backing-up-the-sqlite-database)
17. [Updating the project](#17-updating-the-project)
18. [Building the Android APK](#18-building-the-android-apk)
19. [Xiaomi / OPPO common issues](#19-xiaomi--oppo-common-issues)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Project intro

The platform is split in two:

- **Front-end (`/`)** — Anyone can generate an image: enter a prompt, pick an
  enabled API source, pick an aspect ratio, click Generate. Results are
  polled (when the source supports it) or arrive via the provider's
  callback endpoint at `/api/callback/[apiSourceId]`.
- **Admin (`/admin`)** — Password-protected. Manage API sources, view tasks
  (incl. raw provider response and callback), check settings.

All third-party API calls go through your server. **The browser and the APK
never see API keys.**

---

## 2. Local development

```bash
git clone <this repo>
cd ai-image-generator-platform
npm install
cp .env.local.example .env.local
```

Open `.env.local` and fill in at minimum:

- `ADMIN_PASSWORD` — anything for local dev
- `KIE_API_KEY`    — your Kie.ai API key (only needed if you want to actually generate images)
- `OPENAI_API_KEY` — optional, only needed for the AI doc parser

---

## 3. Environment variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `DATABASE_URL` | SQLite path; e.g. `file:./prisma/dev.db` (dev) or `file:/app/data/prod.db` (prod) | yes |
| `NEXT_PUBLIC_SITE_URL` | Public site URL; used to build the callback URL given to providers | yes (in prod) |
| `ADMIN_PASSWORD` | Password for `/admin/login` | yes |
| `SESSION_SECRET` | Random string used to sign the admin session cookie | recommended |
| `KIE_API_KEY` | Used by the default Kie.ai source | yes (to actually call Kie.ai) |
| `AI_PROVIDER` | `openai` (default) | no |
| `OPENAI_API_KEY` | For the AI doc parser | required for the parser |
| `OPENAI_MODEL` | Default `gpt-4o-mini` | no |
| `OPENAI_BASE_URL` | Override for OpenAI-compatible providers | no |

Two example files are provided:

- `.env.local.example` — local dev
- `.env.production.example` — VPS / Docker

---

## 4. Initialize the database with Prisma

In dev (uses your local `dev.db`):

```bash
npx prisma db push
```

This creates the `ApiSource` and `ImageTask` tables. SQLite stores the file
at the path in `DATABASE_URL`.

If you change `prisma/schema.prisma` later, run `npx prisma db push` again.

---

## 5. Seed the default API source

```bash
npm run db:seed
```

This creates the default **Kie.ai GPT Image-2 Text-to-Image** source (or
leaves it alone if it already exists).

In production (Docker), seeding runs automatically the first time the
container starts. See [section 13](#13-vps-docker-deployment).

---

## 6. Run the project

```bash
npm run dev
```

Open <http://localhost:3000>.

To run a production build locally:

```bash
npm run build
npm start
```

---

## 7. Sign in to the admin console

Visit <http://localhost:3000/admin/login> and use `ADMIN_PASSWORD`.
A signed cookie is set for 7 days; sign out from the top-right corner.

---

## 8. Add an API source by doc URL

In the admin console:

1. Click **API sources** in the sidebar.
2. Click **+ New API source**.
3. Paste the provider's doc URL, e.g.
   `https://docs.kie.ai/market/gpt/gpt-image-2-text-to-image`.
4. Click **AI identify** to populate the form.
5. Review every field; tweak as needed.
6. Click **Save**.

---

## 9. AI-recognize an API source

The AI agent:

1. Fetches the doc page from your server (with SSRF protection — local /
   private IPs are blocked).
2. Strips scripts, styles, footers, navs, etc., then passes the cleaned text
   to your OpenAI-compatible model (`OPENAI_MODEL`, default `gpt-4o-mini`).
3. The model is instructed to return strict JSON matching our `ApiSource`
   shape. Unsure values are left blank and surfaced as `warnings`.

If the parser fails (network, rate limit, bad doc), the form is unchanged
and the error is shown inline. You can always edit fields manually.

---

## 10. Manually edit an API source

Every field of `ApiSource` is editable in the form, including the JSON
**Request body template** (with `{{prompt}}`, `{{aspectRatio}}`,
`{{callbackUrl}}`, `{{model}}` placeholders), all the response field paths
(dot-notation), callback / polling settings, and the comma-separated list of
supported aspect ratios.

---

## 11. Set the default API source

In **API sources**, click **Set default** on any enabled source. Only one
source can be the default; the front-end pre-selects it on page load.

---

## 12. Switch sources from the front-end

The front-end fetches `GET /api/api-sources`, which returns *only* enabled
sources with public-safe fields (id, name, provider, model, supported aspect
ratios, isDefault). The dropdown shows them; the selected source's
`supportedAspectRatios` populates the ratio dropdown.

The browser never sees API keys. When the user clicks Generate, the request
goes to `POST /api/generate-image`, which authenticates server-side and
calls the provider.

---

## 13. VPS Docker deployment

See **[`deploy/README.md`](deploy/README.md)** for the full step-by-step
guide. TL;DR:

```bash
git clone <this repo>
cd ai-image-generator-platform
cp .env.production.example .env
# edit .env with your real values
mkdir -p data
docker compose up -d --build
```

The container:

- Runs `prisma db push` and seeds the default source on first start.
- Persists SQLite at `./data/prod.db` (mounted to `/app/data` inside).
- Listens on `127.0.0.1:3000` (do not expose directly; use Nginx).

---

## 14. Nginx reverse proxy

Use the bundled config at `deploy/nginx.conf`. Replace `your-domain.com`
with your real domain, symlink it into `sites-enabled`, and reload Nginx:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/ai-image-generator.conf
sudo sed -i 's/your-domain.com/<your real domain>/g' /etc/nginx/sites-available/ai-image-generator.conf
sudo ln -s /etc/nginx/sites-available/ai-image-generator.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 15. HTTPS with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot rewrites the Nginx config to enable TLS and sets up auto-renewal.

> Make sure `NEXT_PUBLIC_SITE_URL` in `.env` is set to `https://your-domain.com`,
> otherwise the callback URL given to providers like Kie.ai will be wrong.

---

## 16. Backing up the SQLite database

```bash
# One-shot copy
cp data/prod.db backups/prod.$(date +%F-%H%M).db

# Cron snapshot daily at 03:00
echo "0 3 * * * cp /opt/ai-image-generator-platform/data/prod.db \
  /opt/ai-image-generator-platform/backups/prod.\$(date +\\%F).db" | sudo tee /etc/cron.d/aig-backup
```

For a fully consistent backup while writes are happening, use `sqlite3 .backup`:

```bash
docker compose exec app sh -c "apk add --no-cache sqlite >/dev/null && \
  sqlite3 /app/data/prod.db '.backup /app/data/prod.backup.db'"
```

---

## 17. Updating the project

```bash
cd ai-image-generator-platform
git pull
docker compose up -d --build
```

The data volume is preserved; `prisma db push` runs idempotently on every
start to apply any new schema fields.

---

## 18. Building the Android APK

See **[`mobile/README.md`](mobile/README.md)** for the detailed walk-through.
TL;DR:

```bash
# Edit capacitor.config.ts -> server.url = 'https://your-domain.com'
npm install
npx cap add android
npx cap sync android
npx cap open android   # opens Android Studio
# Build > Generate Signed Bundle / APK > APK > release
```

The APK is a thin Capacitor WebView around your live HTTPS site. **No API
keys are bundled.** All network traffic goes to your VPS.

---

## 19. Xiaomi / OPPO common issues

### Xiaomi MIUI / HyperOS

- **"Install blocked"**: Settings → Privacy protection → Special permissions
  → Install unknown apps → allow your file manager / browser.
- **Blank page or images don't load**: make sure Android System WebView is
  enabled and updated (Settings → Apps → System app settings).
- **Image download fails**: grant *Files and media* permission, and turn off
  *Data saver* for the app.
- **Status bar overlapping**: we already use `viewport-fit=cover` and CSS
  `env(safe-area-inset-*)`. If you still see overlap, check that the
  `StatusBar` plugin in `capacitor.config.ts` has `overlaysWebView: false`.
- **Dark mode**: the page uses a light theme by default. To follow system
  dark mode in the WebView, add a `prefers-color-scheme` media query in
  CSS or call `StatusBar.setStyle({ style: Style.Dark })` from JS.

### OPPO ColorOS

- **"App from unknown source"**: allow the install source in Settings →
  Privacy → Install from this source.
- **App killed in the background**: in Settings → Battery → Background app
  management, allow the app to run.
- **Image save fails**: grant *Files and media* permission explicitly under
  Settings → Apps → AI Image Generator → Permissions.
- **Share to other apps**: ColorOS uses its own share sheet. The Capacitor
  `Share` plugin works with it; if a target app is missing, that's a
  ColorOS-side install issue, not ours.

---

## 20. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Server is missing env var: KIE_API_KEY` | Set `KIE_API_KEY` in `.env`/`.env.local` and restart. |
| `Provider response did not contain taskId or imageUrl` | Check `taskIdPath` / `imageUrlPath` in your source config. Use the **Tasks** tab → **Raw** to see the actual provider response. |
| `OPENAI_API_KEY is not configured on the server` | Set `OPENAI_API_KEY` to use the AI doc parser. |
| `Refusing to fetch unsafe URL` | The doc parser blocks `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `169.254.0.0/16`, `::1`, and other private/loopback IPs to prevent SSRF. Use a public URL. |
| Front-end shows "No API source available" | The seed didn't run, or you disabled them all. Run `npm run db:seed`, or open `/admin` and enable a source. |
| 502 from Nginx after `up -d --build` | The container is starting; tail logs with `docker compose logs -f app`. |
| Generation stuck on "processing" | The provider hasn't called back yet. For Kie.ai it usually arrives within ~30s. Check that `NEXT_PUBLIC_SITE_URL` is reachable on the public internet over HTTPS — providers retry callbacks a few times then give up. You can also enable polling in the source config if the provider supports it. |
| APK shows blank screen | Confirm `server.url` in `capacitor.config.ts` is HTTPS and reachable from the phone's network. Verify with the phone's browser first. |

---

## Security notes

- API keys live only on the server, in environment variables. They are
  never returned by any API and never written to the client bundle or APK.
- The admin console requires `ADMIN_PASSWORD`. Use a long, random one in
  production. The session cookie is HMAC-signed with `SESSION_SECRET`,
  HTTP-only, and `Secure` in production.
- The AI doc parser fetches arbitrary URLs you provide. We block private /
  loopback / link-local addresses to mitigate SSRF, but only paste doc URLs
  from sources you trust — the agent reads them with your OpenAI key.
- Provider callbacks (`/api/callback/[apiSourceId]`) are public by design,
  but the body is parsed only to update an existing task that we created.
  Untrusted callbacks for unknown task IDs are rejected with 404.
