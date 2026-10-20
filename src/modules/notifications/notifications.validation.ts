import { z } from 'zod';

export const markAsReadSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
});

export const markByEntityAsReadSchema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: z.string().min(1, 'Entity ID is required'),
});

export const createStreamTicketSchema = z.object({});

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type MarkByEntityAsReadInput = z.infer<typeof markByEntityAsReadSchema>;
