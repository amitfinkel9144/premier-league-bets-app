import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'noreply@premier-league-bets.fly.dev';
const VALID_API_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // ✅ שלב 1: בדוק שהבקשה כוללת Authorization Header תקף
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '').trim();

  if (token !== VALID_API_KEY) {
    console.warn('🔐 Missing or invalid Authorization header');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { to, subject, body } = await req.json();

    console.log('📧 Sending email to:', to);
    console.log('📨 Subject:', subject);
    console.log('📝 Body:', body);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html: `<strong>${body}</strong>`,
      }),
    });

    const text = await response.text();
    return new Response(text, { status: response.status });
  } catch (err) {
    console.error('❌ Error sending email:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
});
