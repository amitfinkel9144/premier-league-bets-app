// supabase/functions/generate-reminders/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!;

serve(async () => {
  const now = new Date();
  const inserted: any[] = [];

  // שלב 1 – יצירת תזמוני תזכורות עתידיות
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('matchday, start_datetime')
    .order('start_datetime', { ascending: true });

  if (matchError) {
    console.error('❌ Error fetching matches:', matchError);
    return new Response(JSON.stringify({ error: matchError }), { status: 500 });
  }

  const seenMatchdays = new Set<number>();

  for (const match of matches || []) {
    const { matchday, start_datetime } = match;
    if (!start_datetime || seenMatchdays.has(matchday)) continue;

    seenMatchdays.add(matchday);
    const start = new Date(start_datetime);

    const stages = [
      { offsetHours: 72, stage: '3_days' },
      { offsetHours: 48, stage: '2_days' },
      { offsetHours: 8, stage: '8_hours' },
    ];

    for (const { offsetHours, stage } of stages) {
      const remindAt = new Date(start.getTime() - offsetHours * 60 * 60 * 1000);
      if (remindAt > now) {
        const { error } = await supabase
          .from('matchday_notifications')
          .insert({ matchday_id: matchday, remind_at: remindAt.toISOString(), stage });

        if (!error) inserted.push({ matchday_id: matchday, stage });
      }
    }
  }

  // שלב 2 – שליחה בפועל של תזכורות שהגיע זמנן
  const { data: pendingReminders, error: reminderErr } = await supabase
    .from('matchday_notifications')
    .select('*')
    .lte('remind_at', now.toISOString())
    .is('sent_at', null);

  if (reminderErr) {
    console.error('❌ Error loading pending reminders:', reminderErr);
  }

  for (const reminder of pendingReminders || []) {
    const matchday = reminder.matchday_id;

    // שליפת משתמשים שלא הימרו למחזור הזה
    const { data: usersToNotify, error: usersErr } = await supabase.rpc(
      'get_users_without_prediction',
      { matchday_input: matchday }
    );

    if (usersErr) {
      console.error(`❌ Error getting users for matchday ${matchday}:`, usersErr);
      continue;
    }

    for (const user of usersToNotify || []) {
      const token = user.push_token;
      if (!token) continue;

      const title = `מחזור ${matchday} מתקרב!`;
      const body = getBodyByStage(reminder.stage);

      await sendPushNotification(token, title, body);
    }

    await supabase
      .from('matchday_notifications')
      .update({ sent_at: now.toISOString() })
      .eq('id', reminder.id);
  }

  return new Response(JSON.stringify({ inserted, reminders_sent: pendingReminders?.length || 0 }), {
    status: 200,
  });
});

// פונקציית שליחת פוש
async function sendPushNotification(token: string, title: string, body: string) {
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${FIREBASE_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title,
        body,
        icon: 'https://your-domain.com/images/logo.jpeg',
      },
    }),
  });

  const result = await response.json();
  console.log('📤 Push sent:', result);
}

// הודעות לפי שלב
function getBodyByStage(stage: string): string {
  switch (stage) {
    case '3_days':
      return 'נותרו 3 ימים למחזור הקרוב – נחשו עכשיו!';
    case '2_days':
      return 'רק יומיים למחזור – שלחת ניחוש?';
    case '8_hours':
      return '8 שעות בלבד! המשחקים מתקרבים!';
    default:
      return 'מחזור קרוב! נחשו לפני שנסגר!';
  }
}
