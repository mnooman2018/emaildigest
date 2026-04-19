import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function PopupPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Already logged in — go to extension-auth to send token to panel
  if (session) {
  redirect(`/extension-auth?token=${session.access_token}`)
}

  async function handleGoogleLogin() {
    "use server";
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?popup=true`,
        scopes: 'email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.labels',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (data?.url) redirect(data.url);
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e8e0f5 0%, #f5e6f0 40%, #fde8d8 100%)',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e2a3a', margin: '0 0 0.5rem' }}>
          EmailDigest
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#6b7a8d', margin: '0 0 1.5rem', lineHeight: '1.6' }}>
          Connect your Gmail to get AI-powered email summaries
        </p>
        <form action={handleGoogleLogin}>
          <button type="submit" style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', border: 'none', borderRadius: '12px',
            padding: '0.875rem 2rem', fontSize: '0.95rem',
            fontWeight: '500', cursor: 'pointer', width: '100%',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          }}>
            🔗 Connect with Google
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#9aa5b4' }}>
          We only read your emails — never send or delete anything
        </p>
      </div>
    </main>
  )
}