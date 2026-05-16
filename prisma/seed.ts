/**
 * Seed default API source: Kie.ai GPT Image-2 Text-to-Image
 *
 * Run via:  npm run db:seed
 *
 * Idempotent: if a source with the same provider+endpoint exists, it will be left alone.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KIE_DEFAULT = {
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
    input: {
      prompt: '{{prompt}}',
      aspect_ratio: '{{aspectRatio}}',
    },
  }),
  promptFieldPath: 'input.prompt',
  aspectRatioFieldPath: 'input.aspect_ratio',
  taskIdPath: 'data.taskId',
  imageUrlPath: 'data.imageUrl',
  callbackSupported: true,
  callbackUrlFieldPath: 'callBackUrl',
  pollingSupported: false,
  errorMessagePath: 'msg',
  supportedAspectRatios: JSON.stringify(['auto', '1:1', '16:9', '9:16', '4:3', '3:4']),
  enabled: true,
  isDefault: true,
  notes: 'Default built-in source. Provider returns an async taskId; image URL arrives via callback.',
};

async function main() {
  // Try to find an existing one by provider+endpoint to keep this idempotent.
  const existing = await prisma.apiSource.findFirst({
    where: { provider: KIE_DEFAULT.provider, endpoint: KIE_DEFAULT.endpoint },
  });

  if (existing) {
    console.log(`[seed] Default source already exists: ${existing.id} (${existing.name})`);
    // Make sure it's enabled and at least one default exists.
    const anyDefault = await prisma.apiSource.findFirst({ where: { isDefault: true } });
    if (!anyDefault) {
      await prisma.apiSource.update({
        where: { id: existing.id },
        data: { isDefault: true, enabled: true },
      });
      console.log('[seed] Re-marked existing Kie.ai source as default.');
    }
    return;
  }

  // Make sure there is only one default source.
  await prisma.apiSource.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });

  const created = await prisma.apiSource.create({ data: KIE_DEFAULT });
  console.log(`[seed] Created default Kie.ai source: ${created.id}`);
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
