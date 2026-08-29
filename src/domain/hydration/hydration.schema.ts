import { z } from 'zod';

export const WaterEntrySchema = z.object({
  id: z.string().min(1),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recordedAt: z.string().datetime(),
  amountMl: z.number().min(1).max(5000),
  source: z.enum(['manual', 'webmcp']),
  createdAt: z.string().datetime(),
});

export type WaterEntry = z.infer<typeof WaterEntrySchema>;

export const AddWaterInputSchema = z.object({
  amountMl: z.number().min(1).max(5000),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  recordedAt: z.string().datetime().optional(),
  source: z.enum(['manual', 'webmcp']).default('manual'),
});

export type AddWaterInput = z.infer<typeof AddWaterInputSchema>;
