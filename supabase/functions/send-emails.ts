import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

serve(async (req) => {
  const { to, subject, body } = await req.json();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Premier League Bets <noreply@resend.dev>',
      to,
      subject,
      html: `<strong>${body}</strong>`,
    }),
  });

  const resText = await response.text();
  return new Response(resText, { status: response.status });
});
