import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const isPopup = searchParams.get('popup') === 'true'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          },
        },
      }
    )

    // provider_token / provider_refresh_token ONLY exist in this direct response.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const session = data.session

      // Write with the SERVICE ROLE key to bypass RLS (this is why saves were failing).
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const row: {
        user_id: string
        access_token: string | null | undefined
        updated_at: string
        refresh_token?: string | null
      } = {
        user_id: session.user.id,
        access_token: session.provider_token,
        updated_at: new Date().toISOString(),
      }
      // Only overwrite refresh_token when Google actually sends one,
      // so we never wipe a good token with null.
      if (session.provider_refresh_token) {
        row.refresh_token = session.provider_refresh_token
      }

      const { error: upsertError } = await adminClient
        .from('gmail_connections')
        .upsert(row, { onConflict: 'user_id' })

      console.log('Token save error:', upsertError?.message || 'none',
                  'has_refresh:', !!session.provider_refresh_token)

      if (isPopup) {
        return NextResponse.redirect(`${origin}/extension-auth?token=${session.access_token}`)
      }
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}