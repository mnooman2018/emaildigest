import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    const { data: conn } = await supabase
      .from('gmail_connections')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (conn) {
      redirect('/dashboard');
    }
  }

  async function handleGoogleLogin() {
    "use server";
    const supabase = await createClient();
    const { data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        scopes: 'email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.labels',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (data?.url) {
      redirect(data.url);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e8e0f5 0%, #f5e6f0 40%, #fde8d8 100%)',
      fontFamily: "'Georgia', serif",
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '560px',
        padding: '0 2rem',
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1e2a3a',
          margin: '0 0 1rem',
          letterSpacing: '-0.02em',
          lineHeight: '1.1',
        }}>
          EmailDigest
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '0.9rem',
          color: '#6b7a8d',
          margin: '0 0 2.5rem',
          lineHeight: '1.6',
          fontWeight: '400',
        }}>
          Turn your Gmail into daily actionable<br />insights with AI
        </p>

        {/* Button */}
        <form action={handleGoogleLogin}>
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #6b7fd4 0%, #8b6fc4 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              padding: '1rem 2.5rem',
              fontSize: '1.1rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: '0 8px 32px rgba(107, 127, 212, 0.35)',
              transition: 'all 0.2s ease',
              letterSpacing: '0.01em',
            }}
          >
            🔗 Connect with Google
          </button>
        </form>

        {/* Privacy note */}
        <p style={{
          marginTop: '1.25rem',
          fontSize: '0.8rem',
          color: '#9aa5b4',
          letterSpacing: '0.01em',
        }}>
          We only read your emails — never send or delete anything
        </p>
      </div>
    </main>
  );
}