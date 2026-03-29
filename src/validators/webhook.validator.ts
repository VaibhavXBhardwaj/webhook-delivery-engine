import { z } from 'zod';

export const createWebhookSchema = z.object({
  body: z.object({
    url: z
      .string({ required_error: 'URL is required' })
      .url('Must be a valid URL'),
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