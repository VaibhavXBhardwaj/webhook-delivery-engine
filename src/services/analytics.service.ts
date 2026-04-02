import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getOverviewAnalytics(clientId: string) {
  const webhooks = await prisma.webhook.findMany({
    where: { clientId },
    select: { id: true },
  });

  const webhookIds = webhooks.map((w) => w.id);

  if (webhookIds.length === 0) {
    return {
      totalWebhooks: 0,
      activeWebhooks: 0,
      suspendedWebhooks: 0,
      totalEvents: 0,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      pendingDeliveries: 0,
      dlqCount: 0,
      successRate: '0%',
      avgResponseTimeMs: 0,
      last24Hours: {
        events: 0,
        deliveries: 0,
        successRate: '0%',
      },
    };
  }

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    webhookCounts,
    totalEvents,
    deliveryStats,
    dlqCount,
    avgResponseTime,
    last24hEvents,
    last24hDeliveries,
  ] = await Promise.all([
    prisma.webhook.groupBy({
      by: ['status'],
      where: { clientId },
      _count: { id: true },
    }),
    prisma.event.count({ where: { clientId } }),
    prisma.deliveryAttempt.groupBy({
      by: ['status'],
      where: { webhookId: { in: webhookIds } },
      _count: { id: true },
    }),
    prisma.deadLetterQueue.count({
      where: { webhookId: { in: webhookIds } },
    }),
    prisma.deliveryAttempt.aggregate({
      where: {
        webhookId: { in: webhookIds },
        status: 'SUCCESS',
        responseTimeMs: { not: null },
      },
      _avg: { responseTimeMs: true },
    }),
    prisma.event.count({
      where: {
        clientId,
        createdAt: { gte: last24Hours },
      },
    }),
    prisma.deliveryAttempt.groupBy({
      by: ['status'],
      where: {
        webhookId: { in: webhookIds },
        createdAt: { gte: last24Hours },
      },
      _count: { id: true },
    }),
  ]);

  const activeWebhooks =
    webhookCounts.find((w) => w.status === 'ACTIVE')?._count.id ?? 0;
  const suspendedWebhooks =
    webhookCounts.find((w) => w.status === 'SUSPENDED')?._count.id ?? 0;

  const successfulDeliveries =
    deliveryStats.find((d) => d.status === 'SUCCESS')?._count.id ?? 0;
  const failedDeliveries =
    deliveryStats.find((d) => d.status === 'FAILED')?._count.id ?? 0;
  const pendingDeliveries =
    deliveryStats.find((d) => d.status === 'PENDING')?._count.id ?? 0;
  const totalDeliveries = deliveryStats.reduce(
    (sum, d) => sum + d._count.id,
    0
  );

  const successRate =
    totalDeliveries > 0
      ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(2) + '%'
      : '0%';

  const last24hSuccess =
    last24hDeliveries.find((d) => d.status === 'SUCCESS')?._count.id ?? 0;
  const last24hTotal = last24hDeliveries.reduce(
    (sum, d) => sum + d._count.id,
    0
  );

  return {
    totalWebhooks: webhooks.length,
    activeWebhooks,
    suspendedWebhooks,
    totalEvents,
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    pendingDeliveries,
    dlqCount,
    successRate,
    avgResponseTimeMs: Math.round(avgResponseTime._avg.responseTimeMs ?? 0),
    last24Hours: {
      events: last24hEvents,
      deliveries: last24hTotal,
      successRate:
        last24hTotal > 0
          ? ((last24hSuccess / last24hTotal) * 100).toFixed(2) + '%'
          : '0%',
    },
  };
}

export async function getWebhookAnalytics(
  webhookId: string,
  clientId: string
) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, clientId },
  });

  if (!webhook) {
    throw new AppError('Webhook not found', 404);
  }

  const [deliveryStats, avgResponseTime, recentAttempts] = await Promise.all([
    prisma.deliveryAttempt.groupBy({
      by: ['status'],
      where: { webhookId },
      _count: { id: true },
    }),
    prisma.deliveryAttempt.aggregate({
      where: {
        webhookId,
        status: 'SUCCESS',
        responseTimeMs: { not: null },
      },
      _avg: { responseTimeMs: true },
      _min: { responseTimeMs: true },
      _max: { responseTimeMs: true },
    }),
    prisma.deliveryAttempt.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        event: {
          select: { eventType: true, createdAt: true },
        },
      },
    }),
  ]);

  const successCount =
    deliveryStats.find((d) => d.status === 'SUCCESS')?._count.id ?? 0;
  const totalCount = deliveryStats.reduce((sum, d) => sum + d._count.id, 0);

  return {
    webhook: {
      id: webhook.id,
      url: webhook.url,
      status: webhook.status,
      eventTypes: webhook.eventTypes,
      failureCount: webhook.failureCount,
      createdAt: webhook.createdAt,
    },
    stats: {
      totalDeliveries: totalCount,
      successfulDeliveries: successCount,
      failedDeliveries:
        deliveryStats.find((d) => d.status === 'FAILED')?._count.id ?? 0,
      dlqCount:
        deliveryStats.find((d) => d.status === 'DLQ')?._count.id ?? 0,
      successRate:
        totalCount > 0
          ? ((successCount / totalCount) * 100).toFixed(2) + '%'
          : '0%',
      responseTime: {
        avg: Math.round(avgResponseTime._avg.responseTimeMs ?? 0),
        min: avgResponseTime._min.responseTimeMs ?? 0,
        max: avgResponseTime._max.responseTimeMs ?? 0,
      },
    },
    recentAttempts,
  };
}