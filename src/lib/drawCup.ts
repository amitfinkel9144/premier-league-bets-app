// src/lib/drawCup.ts
import { supabase } from '@/lib/supabaseClient';

type UserRow = { id: string; display_name: string | null };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function drawCup(matchdayId: number) {
  // 1) שליפת משתתפים
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, display_name')
    .not('display_name', 'is', null); // אופציונלי – מבטיח שיש שם תצוגה

  if (usersErr) throw new Error('שגיאה בשליפת משתמשים: ' + usersErr.message);
  if (!users || users.length < 4)
    throw new Error('יש פחות מ-4 משתתפים פעילים להגרלה.');

  const picked = shuffle(users as UserRow[]).slice(0, 4);

  const semiFinal1 = [picked[0], picked[1]];
  const semiFinal2 = [picked[2], picked[3]];

  // 2) מחיקה של הגרלה קיימת למחזור הזה (אם קיימת)
  const { error: delErr } = await supabase
    .from('cup_draw')
    .delete()
    .eq('matchday_id', matchdayId);
  if (delErr) throw new Error('שגיאה במחיקת הגרלה קודמת: ' + delErr.message);

  // 3) יצירת חצאי גמר חדשים
  const { error: insErr } = await supabase.from('cup_draw').insert([
    {
      user1_id: semiFinal1[0].id,
      user2_id: semiFinal1[1].id,
      match_type: 'semi_1',
      matchday_id: matchdayId,
    },
    {
      user1_id: semiFinal2[0].id,
      user2_id: semiFinal2[1].id,
      match_type: 'semi_2',
      matchday_id: matchdayId,
    },
  ]);

  if (insErr) throw new Error('שגיאה בהכנסת ההגרלה לטבלה: ' + insErr.message);

  return {
    semiFinal1: semiFinal1.map((u) => ({ id: u.id, name: u.display_name || '' })),
    semiFinal2: semiFinal2.map((u) => ({ id: u.id, name: u.display_name || '' })),
  };
}
