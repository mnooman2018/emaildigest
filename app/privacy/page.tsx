export default function PrivacyPage() {
  return (
    <main style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '3rem 2rem',
      fontFamily: 'Georgia, serif',
      color: '#1e293b',
      lineHeight: '1.8',
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Last updated: April 2026</p>

      <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2rem' }}>What we collect</h2>
      <p>We collect your Gmail access token and refresh token to read your emails on your behalf. We also store your Google account user ID to identify you.</p>

      <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2rem' }}>What we do NOT do</h2>
      <ul style={{ paddingLeft: '1.5rem' }}>
        <li>We never store your emails on our servers</li>
        <li>We never send emails on your behalf</li>
        <li>We never delete your emails</li>
        <li>We never share your data with third parties</li>
        <li>We never sell your data</li>
      </ul>

      <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2rem' }}>How your data is used</h2>
      <p>Your emails are fetched temporarily and sent to Groq AI for summarization. They are never stored on our servers. The AI summary is shown to you and immediately discarded.</p>

      <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2rem' }}>How to verify</h2>
      <p>Our full source code is publicly available at <a href="https://github.com/mnooman2018/emaildigest" style={{ color: '#6366f1' }}>github.com/mnooman2018/emaildigest</a>. We use Gmail's readonly scope — we physically cannot send or delete emails.</p>

      <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2rem' }}>Data deletion</h2>
      <p>Clicking logout immediately removes all tokens from your device and you can revoke access at any time from your <a href="https://myaccount.google.com/permissions" style={{ color: '#6366f1' }}>Google Account settings</a>.</p>

      <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '2rem' }}>Contact</h2>
      <p>For any privacy concerns, contact: mnooman2018@gmail.com</p>
    </main>
  )
}