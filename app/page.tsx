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
      // Already connected — go straight to dashboard
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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-md px-6">
        <h1 className="text-6xl font-bold mb-4 tracking-tight text-black">EmailDigest</h1>
        <p className="text-2xl text-gray-700 mb-10">
          Turn your Gmail into daily actionable insights with AI
        </p>
        <form action={handleGoogleLogin}>
          <button
            type="submit"
            className="bg-[#4285F4] hover:bg-[#3367D6] text-white px-10 py-4 rounded-2xl text-lg font-medium flex items-center gap-3 mx-auto shadow-lg transition-all"
          >
            🔗 Connect with Google
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-8">
          We only read your emails — never send or delete anything
        </p>
      </div>
    </div>
  );
}