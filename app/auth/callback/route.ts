import { createServerClient } from '@supabase/ssr'
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        await supabase.from('gmail_connections').upsert({
          user_id: session.user.id,
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token,
        }, { onConflict: 'user_id' })
      }

      // If opened from extension popup, close window automatically
      if (isPopup) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || ''
  return NextResponse.redirect(`${origin}/extension-auth?token=${token}`)
}

      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}