import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { webhookDeliveryQueue } from '../lib/queue';

export async function getDLQItems(clientId: string) {
    // Get all DLQ items for this client's webhooks
    const items = await prisma.deadLetterQueue.findMany({
        where: {
            webhook: {
                clientId,
            },
        },
        include: {
            event: {
                select: {
                    id: true,
                    eventType: true,
                    payload: true,
                    createdAt: true,
                },
            },
            webhook: {
                select: {
                    id: true,
                    url: true,
                    status: true,
                    secret: true,
                },
            },
        },
        orderBy: { movedAt: 'desc' },
    });

    return items;
}

export async function retryDLQItem(dlqId: string, clientId: string) {
    // Find the DLQ item
    const dlqItem = await prisma.deadLetterQueue.findFirst({
        where: {
            id: dlqId,
            webhook: { clientId },
        },
        include: {
            event: true,
            webhook: true,
        },
    });

    if (!dlqItem) {
        throw new AppError('DLQ item not found', 404);
    }

    if (dlqItem.webhook.status === 'SUSPENDED') {
        throw new AppError(
            'Cannot retry — webhook is suspended. Reactivate it first via PUT /api/v1/webhooks/:id',
            400
        );
    }

    // Create a fresh delivery attempt
    const attempt = await prisma.deliveryAttempt.create({
        data: {
            eventId: dlqItem.eventId,
            webhookId: dlqItem.webhookId,
            status: 'PENDING',
            attemptNumber: dlqItem.totalAttempts + 1,
        },
    });

    // Add back to BullMQ queue
    await webhookDeliveryQueue.add(
        'deliver-webhook',
        {
            deliveryAttemptId: attempt.id,
            eventId: dlqItem.eventId,
            webhookId: dlqItem.webhookId,
            webhookUrl: dlqItem.webhook.url,
            webhookSecret: dlqItem.webhook.secret,
            payload: dlqItem.event.payload as Record<string, unknown>,
            eventType: dlqItem.event.eventType,
            attemptNumber: dlqItem.totalAttempts + 1,
        },
        {
            attempts: 3, // fewer retries for manual retry
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
        }
    );

    // Remove from DLQ since we're retrying
    await prisma.deadLetterQueue.delete({
        where: { id: dlqId },
    });

    logger.info(`DLQ item retried: ${dlqId} for webhook ${dlqItem.webhookId}`);

    return {
        message: 'Retry queued successfully',
        deliveryAttemptId: attempt.id,
        webhookId: dlqItem.webhookId,
        eventId: dlqItem.eventId,
    };
}

export async function getWebhookDeliveryHistory(
    webhookId: string,
    clientId: string
) {
    // Verify webhook belongs to client
    const webhook = await prisma.webhook.findFirst({
        where: { id: webhookId, clientId },
    });

    if (!webhook) {
        throw new AppError('Webhook not found', 404);
    }

    const attempts = await prisma.deliveryAttempt.findMany({
        where: { webhookId },
        include: {
            event: {
                select: {
                    id: true,
                    eventType: true,
                    createdAt: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // last 50 attempts
    });

    // Calculate stats
    const total = attempts.length;
    const successful = attempts.filter((a) => a.status === 'SUCCESS').length;
    const failed = attempts.filter((a) => a.status === 'FAILED').length;
    const pending = attempts.filter((a) => a.status === 'PENDING').length;
    const dlq = attempts.filter((a) => a.status === 'DLQ').length;

    const avgResponseTime =
        attempts
            .filter((a) => a.responseTimeMs !== null)
            .reduce((sum, a) => sum + (a.responseTimeMs || 0), 0) /
        (attempts.filter((a) => a.responseTimeMs !== null).length || 1);

    return {
        webhook: {
            id: webhook.id,
            url: webhook.url,
            status: webhook.status,
            failureCount: webhook.failureCount,
        },
        stats: {
            total,
            successful,
            failed,
            pending,
            dlq,
            successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
            avgResponseTimeMs: Math.round(avgResponseTime),
        },
        attempts,
    };
}

export async function reactivateWebhook(webhookId: string, clientId: string) {
    const webhook = await prisma.webhook.findFirst({
        where: { id: webhookId, clientId },
    });

    if (!webhook) {
        throw new AppError('Webhook not found', 404);
    }

    if (webhook.status !== 'SUSPENDED') {
        throw new AppError('Webhook is not suspended', 400);
    }

    const updated = await prisma.webhook.update({
        where: { id: webhookId },
        data: {
            status: 'ACTIVE',
            failureCount: 0, // reset circuit breaker
        },
        select: {
            id: true,
            url: true,
            status: true,
            failureCount: true,
            updatedAt: true,
        },
    });

    logger.info(`Webhook reactivated: ${webhookId}`);
    return updated;
}