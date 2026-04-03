import { supabase } from '../../../lib/supabase'
import nodemailer from 'nodemailer'

export async function POST(req) {
  const { userEmail } = await req.json()

  const { data: emails } = await supabase
    .from('emails')
    .select('*')
    .eq('priority', 'high')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!emails || emails.length === 0) {
    return Response.json({ message: 'No high priority emails found' })
  }

  const emailBody = emails.map((e, i) => `
${i + 1}. ${e.subject}
   From: ${e.sender}
   Summary: ${e.summary}
   Actions: ${e.action_items?.join(', ')}
   Priority: ${e.priority}
`).join('\n')

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.DIGEST_EMAIL,
      pass: process.env.DIGEST_PASSWORD
    }
  })

  await transporter.sendMail({
    from: process.env.DIGEST_EMAIL,
    to: userEmail,
    subject: '📬 Your EmailDigest — Top emails today',
    text: `Good morning! Here are your top ${emails.length} emails:\n\n${emailBody}`
  })

  return Response.json({ success: true })
}