import { z } from 'zod';

const VALID_EVENT_TYPES = [
  'payment.success',
  'payment.failed',
  'order.created',
  'order.updated',
  'order.cancelled',
  'user.created',
  'user.deleted',
  'subscription.created',
  'subscription.cancelled',
  '*', // wildcard - receives all events
] as const;

export const createWebhookSchema = z.object({
  body: z.object({
    url: z
      .string({ required_error: 'URL is required' })
      .url('Must be a valid URL')
      .startsWith('https://', 'URL must use HTTPS'),
    eventTypes: z
      .array(z.string())
      .min(1, 'At least one event type is required')
      .max(20, 'Cannot subscribe to more than 20 event types'),
  }),
});

export const updateWebhookSchema = z.object({
  body: z.object({
    url: z
      .string()
      .url('Must be a valid URL')
      .startsWith('https://', 'URL must use HTTPS')
      .optional(),
    eventTypes: z
      .array(z.string())
      .min(1, 'At least one event type is required')
      .optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid webhook ID'),
  }),
});

export const webhookParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid webhook ID'),
  }),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>['body'];
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>['body'];