import { z } from 'zod';

export const ingestEventSchema = z.object({
  body: z.object({
    eventType: z
      .string({ required_error: 'Event type is required' })
      .min(1, 'Event type cannot be empty')
      .max(100, 'Event type too long')
      .regex(
        /^[a-z0-9_.*]+$/,
        'Event type can only contain lowercase letters, numbers, dots, underscores, and asterisks'
      ),
    payload: z
      .record(z.unknown())
      .refine((val) => Object.keys(val).length > 0, {
        message: 'Payload cannot be empty',
      }),
    idempotencyKey: z
      .string()
      .max(255, 'Idempotency key too long')
      .optional(),
  }),
});

export type IngestEventInput = z.infer<typeof ingestEventSchema>['body'];