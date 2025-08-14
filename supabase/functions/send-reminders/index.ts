import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const FCM_KEY = Deno.env.get('FCM_SERVER_KEY')!;

serve(async () => {
  const now = new Date().toISOString();

  const { data: reminders, error: reminderErr } = await supabase
    .from('matchday_notifications')
    .select('*')
    .lte('remind_at', now);

  if (reminderErr) {
    console.error('שגיאה בטעינת matchday_notifications:', reminderErr.message);
    return new Response('Error loading reminders', { status: 500 });
  }

  for (const reminder of reminders || []) {
    const { id, matchday_id, stage } = reminder;

    const { data: users, error: usersErr } = await supabase.rpc('users_without_guess', {
      matchday_id_input: matchday_id,
    });

    if (usersErr) {
      console.error(`שגיאה בשליפת משתמשים למחזור ${matchday_id}:`, usersErr.message);
      continue;
    }

    for (const user of users || []) {
      if (!user.device_token) continue;

      const body =
        stage === '3_days'
          ? 'נותרו 3 ימים למחזור – שלח הימור!'
          : stage === '2_days'
          ? 'יומיים למחזור – אל תשכח להמר!'
          : 'המחזור יתחיל עוד 8 שעות – ההימור שלך עדיין חסר!';

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${FCM_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.device_token,
          notification: {
            title: 'תזכורת להימור!',
            body,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ שגיאה בשליחת פוש ל-${user.display_name || user.id}:`, errorText);
      } else {
        console.log(`📤 פוש נשלח אל ${user.display_name || user.id}`);
      }
    }

    // מחיקת התזכורת מהטבלה (כדי שלא תישלח שוב)
    await supabase.from('matchday_notifications').delete().eq('id', id);
  }

  return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
});
