// lib/ai.ts
import { groq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';

const EmailDigestSchema = z.object({
  concise_summary: z.string(),
  key_action_items: z.array(z.string()),
  priority_level: z.enum(['high', 'medium', 'low']),
  category: z.enum(['meeting', 'task', 'promo', 'personal', 'other']),
  deadlines: z.array(z.string()).optional(),
  suggested_response: z.string().optional(),
});

export async function summarizeThread(threadContent: string) {
  const { object } = await generateObject({
    model: groq('llama-3.3-70b-versatile'),
    schema: EmailDigestSchema,
    prompt: `Summarize this email thread and extract actionable insights:\n\n${threadContent}`,
  });
  return object;
}