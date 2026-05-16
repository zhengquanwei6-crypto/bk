# VPS Deployment

Recommended target: a small VPS (1 CPU / 1 GB RAM is enough for personal use)
running Ubuntu 22.04 / 24.04 with Docker installed.

## 1. Install Docker (one-time)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Log out and back in, then:
docker --version
docker compose version
```

## 2. Get the code on your VPS

```bash
git clone https://github.com/<your-fork>/ai-image-generator-platform.git
cd ai-image-generator-platform
cp .env.production.example .env
```

Edit `.env` and set:

- `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
- `ADMIN_PASSWORD=...`  (strong, long)
- `SESSION_SECRET=...`  (random 32+ chars)
- `KIE_API_KEY=...`     (your Kie.ai key)
- `OPENAI_API_KEY=...`  (only needed for the AI doc parser)

`DATABASE_URL` should remain `file:/app/data/prod.db`.

## 3. Build and start

```bash
mkdir -p data
docker compose up -d --build
docker compose logs -f
```

The app listens on `127.0.0.1:3000`. Don't expose it directly; use Nginx.

## 4. Nginx + HTTPS

Install Nginx and Certbot:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Copy the bundled config:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/ai-image-generator.conf
sudo sed -i 's/your-domain.com/<your real domain>/g' /etc/nginx/sites-available/ai-image-generator.conf
sudo ln -s /etc/nginx/sites-available/ai-image-generator.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Issue an HTTPS certificate:

```bash
sudo certbot --nginx -d your-domain.com
```

Certbot will edit the config to enable SSL and set up auto-renewal.

## 5. First-time check

Open `https://your-domain.com/` — you should see the generator UI.

Sign in at `https://your-domain.com/admin/login` using `ADMIN_PASSWORD`.
The default Kie.ai source is seeded automatically on first start.

## 6. Updates

```bash
git pull
docker compose up -d --build
```

The data volume (`./data`) is preserved.

## 7. Backup the SQLite database

```bash
# One-shot snapshot
cp data/prod.db backups/prod.$(date +%F-%H%M).db

# Or with sqlite3 (atomic):
docker compose exec app sh -c "apk add --no-cache sqlite >/dev/null && \
  sqlite3 /app/data/prod.db \".backup /app/data/prod.backup.db\""
```

Schedule the snapshot via `cron`:

```cron
0 3 * * * cd /opt/ai-image-generator-platform && cp data/prod.db backups/prod.$(date +\%F).db
```

## 8. Common errors

- **"Server is missing env var: KIE_API_KEY"**: `.env` not loaded; restart with
  `docker compose up -d --force-recreate`.
- **502 Bad Gateway from Nginx**: container is starting; wait ~10s or check
  `docker compose logs -f app`.
- **AI doc parser returns "OPENAI_API_KEY is not configured"**: set the key in
  `.env` and restart.
- **Generation hangs**: provider didn't call back. Check that
  `NEXT_PUBLIC_SITE_URL` is publicly reachable on HTTPS — providers like
  Kie.ai will retry callbacks a few times then give up.
