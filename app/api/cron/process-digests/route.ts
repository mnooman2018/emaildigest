// app/api/cron/process-digests/route.ts
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()

  const { data: connections, error } = await supabase
    .from('gmail_connections')
    .select('*')

  if (error || !connections || connections.length === 0) {
    console.log("No Gmail connections found.")
    return new Response('No connections to process', { status: 200 })
  }

  console.log(`Found ${connections.length} Gmail connection(s)`)

  for (const conn of connections) {
    try {
      console.log(`Processing user: ${conn.user_id}`)

      await supabase
        .from('gmail_connections')
        .update({ last_processed_at: new Date().toISOString() })
        .eq('id', conn.id)

    } catch (err) {
      console.error(`Error processing user ${conn.user_id}:`, err)
    }
  }

  return new Response('Digest processing completed', { status: 200 })
}