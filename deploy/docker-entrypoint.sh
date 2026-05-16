#!/bin/sh
set -e

echo "[entrypoint] starting AI Image Generator Platform..."

# Ensure data dir exists (when /app/data is bind-mounted on first start)
mkdir -p /app/data

# Run prisma migrations / db push (create tables if they don't exist).
# We use `db push` which is safe for SQLite without migration history.
echo "[entrypoint] running prisma db push..."
# Call the Prisma CLI directly (Next.js standalone doesn't ship .bin symlinks)
node ./node_modules/prisma/build/index.js db push --skip-generate || {
  echo "[entrypoint] prisma db push failed"
  exit 1
}

# Seed default API source if the table is empty / missing default
echo "[entrypoint] running seed..."
node --enable-source-maps -e "
  (async () => {
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    try {
      const count = await p.apiSource.count();
      if (count === 0) {
        await p.apiSource.create({
          data: {
            name: 'GPT Image-2 Text to Image',
            provider: 'Kie.ai',
            docUrl: 'https://docs.kie.ai/market/gpt/gpt-image-2-text-to-image',
            baseUrl: 'https://api.kie.ai',
            endpoint: '/api/v1/jobs/createTask',
            method: 'POST',
            authType: 'bearer_token',
            apiKeyEnvName: 'KIE_API_KEY',
            model: 'gpt-image-2-text-to-image',
            requestContentType: 'application/json',
            requestBodyTemplate: JSON.stringify({
              model: 'gpt-image-2-text-to-image',
              callBackUrl: '{{callbackUrl}}',
              input: { prompt: '{{prompt}}', aspect_ratio: '{{aspectRatio}}' }
            }),
            promptFieldPath: 'input.prompt',
            aspectRatioFieldPath: 'input.aspect_ratio',
            taskIdPath: 'data.taskId',
            imageUrlPath: 'data.imageUrl',
            callbackSupported: true,
            callbackUrlFieldPath: 'callBackUrl',
            pollingSupported: false,
            errorMessagePath: 'msg',
            supportedAspectRatios: JSON.stringify(['auto','1:1','16:9','9:16','4:3','3:4']),
            enabled: true,
            isDefault: true,
            notes: 'Default built-in source.'
          }
        });
        console.log('[entrypoint] seeded default Kie.ai source');
      } else {
        console.log('[entrypoint] sources already exist (count=' + count + '), skipping seed');
      }
    } finally {
      await p.\$disconnect();
    }
  })().catch(err => { console.error('[entrypoint] seed error:', err); process.exit(1); });
" || true

echo "[entrypoint] starting Next.js server..."
exec "$@"
