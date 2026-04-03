// app/auth/callback/route.ts
import { createClient } from '../../../utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.provider_token || !session?.provider_refresh_token) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL('/', request.url));
  }

  const { error: insertError } = await supabase.from('gmail_connections').upsert({
    user_id: session.user.id,
    refresh_token: session.provider_refresh_token,
    access_token: session.provider_token,
    expires_at: new Date(Date.now() + 3600 * 1000),
  });

  if (insertError) {
    console.error("Failed to save tokens:", insertError);
  }

  return NextResponse.redirect(new URL('/', request.url));
}