// ✅ קובץ: send-reminders.ts (בתיקיית שורש הפרויקט)

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

// יצירת לקוח Supabase עם מפתחות מהסביבה
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FCM_KEY = process.env.FCM_SERVER_KEY!;

async function main() {
  const now = new Date().toISOString();

  // שליפת התראות מתוזמנות שהגיע זמנן
  const { data: reminders, error } = await supabase
    .from('matchday_notifications')
    .select('*')
    .lte('remind_at', now);

  if (error) {
    console.error('❌ שגיאה בשליפת תזכורות:', error.message);
    return;
  }

  for (const reminder of reminders) {
    const { matchday_id, stage, id } = reminder;

    // שליפת משתמשים שעדיין לא הימרו על matchday_id הזה
    const { data: users, error: userError } = await supabase.rpc('users_without_guess', {
      matchday_id_input: matchday_id,
    });

    if (userError) {
      console.error(`❌ שגיאה בשליפת משתמשים למחזור ${matchday_id}:`, userError.message);
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

      await fetch('https://fcm.googleapis.com/fcm/send', {
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

      console.log(`📤 נשלחה התראה ל־${user.email}`);
    }

    // מחיקת ההתראה לאחר שליחה כדי שלא תישלח שוב
    await supabase.from('matchday_notifications').delete().eq('id', id);
  }

  console.log(`🎯 הסתיים – נשלחו ${reminders.length} התראות`);
}

main();
