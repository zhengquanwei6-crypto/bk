import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { taskStatusQuerySchema } from '@/lib/validators';
import { runPollStatus } from '@/lib/api-source-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/task-status?taskId=xxx
 * Returns the latest known status. If the source supports polling and the
 * task is still pending/processing, we'll proactively poll once.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = taskStatusQuerySchema.safeParse({ taskId: searchParams.get('taskId') || '' });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 },
    );
  }
  const { taskId } = parsed.data;

  const task = await prisma.imageTask.findUnique({
    where: { taskId },
    include: { apiSource: true },
  });
  if (!task) {
    return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
  }

  // Final state - just return as-is
  if (task.status === 'success' || task.status === 'failed') {
    return NextResponse.json({
      success: true,
      task: {
        taskId: task.taskId,
        status: task.status,
        prompt: task.prompt,
        aspectRatio: task.aspectRatio,
        imageUrl: task.imageUrl,
        error: task.error,
        apiSourceName: task.apiSourceName,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    });
  }

  // Active - try polling if supported
  if (task.apiSource.pollingSupported && task.taskId) {
    const poll = await runPollStatus(task.apiSource, task.taskId);
    if (poll.ok && poll.status !== 'pending') {
      const updated = await prisma.imageTask.update({
        where: { id: task.id },
        data: {
          status: poll.status,
          imageUrl: poll.imageUrl ?? task.imageUrl,
          error: poll.error ?? null,
          rawCallback: poll.rawResponse ? JSON.stringify(poll.rawResponse).slice(0, 50_000) : task.rawCallback,
        },
      });
      return NextResponse.json({
        success: true,
        task: {
          taskId: updated.taskId,
          status: updated.status,
          prompt: updated.prompt,
          aspectRatio: updated.aspectRatio,
          imageUrl: updated.imageUrl,
          error: updated.error,
          apiSourceName: updated.apiSourceName,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
    }
  }

  return NextResponse.json({
    success: true,
    task: {
      taskId: task.taskId,
      status: task.status,
      prompt: task.prompt,
      aspectRatio: task.aspectRatio,
      imageUrl: task.imageUrl,
      error: task.error,
      apiSourceName: task.apiSourceName,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    },
  });
}
