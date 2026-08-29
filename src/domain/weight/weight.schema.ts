import { z } from 'zod';

export const WeightEntrySchema = z.object({
  id: z.string().min(1),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recordedAt: z.string().datetime(),
  weightKg: z.number().min(20).max(500),
  note: z.string().max(200).optional(),
  source: z.enum(['manual', 'webmcp']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WeightEntry = z.infer<typeof WeightEntrySchema>;

export const AddWeightInputSchema = z.object({
  weightKg: z.number().min(20).max(500),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recordedAt: z.string().datetime().optional(),
  note: z.string().max(200).optional(),
  source: z.enum(['manual', 'webmcp']).default('manual'),
});

export type AddWeightInput = z.infer<typeof AddWeightInputSchema>;
