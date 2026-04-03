import { groq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';

const emailSchema = z.object({
  summary: z.string().min(10),
  action_items: z.array(z.string()).default([]),
  priority: z.enum(['High', 'Medium', 'Low']),
  category: z.enum(['Meeting', 'Task', 'Reply Needed', 'Promo', 'Personal', 'Other']),
  deadline: z.string().nullable().optional(),
});

export async function POST(request) {
  try {
    const { subject, body, sender } = await request.json();

    if (!subject || !body) {
      return Response.json({ 
        success: false, 
        error: 'Subject and body are required' 
      }, { status: 400 });
    }

    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),   // Fast Groq model
      system: `You are an expert email assistant. Extract actionable insights, deadlines, and priorities from the email. Be concise and practical.`,
      prompt: `Subject: ${subject}\nSender: ${sender || 'Unknown'}\n\nBody:\n${body}`,
      schema: emailSchema,
    });

    return Response.json({
      success: true,
      data: object
    });

  } catch (error) {
    console.error('Summarize API Error:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to analyze email. Check your GROQ_API_KEY.' 
    }, { status: 500 });
  }
}