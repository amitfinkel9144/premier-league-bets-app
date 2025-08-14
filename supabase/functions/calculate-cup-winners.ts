// supabase/functions/calculate-cup-winners.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SEMI_FINAL_MATCHDAYS = [8, 14, 21, 27];
const FINAL_MATCHDAYS = [30, 35, 38];

const getPoints = async (userId: string, matchdays: number[]) => {
  const { data, error } = await supabase
    .from('prediction_results')
    .select('points')
    .eq('user_id', userId)
    .in('matchday_id', matchdays);

  if (error) throw error;

  return data.reduce((acc, curr) => acc + (curr.points ?? 0), 0);
};

const determineWinner = async () => {
  const { data: drawRows, error } = await supabase
    .from('cup_draw')
    .select('id, user1_id, user2_id, match_type');

  if (error) throw error;

  for (const row of drawRows) {
    const matchdays =
      row.match_type.startsWith('semi') ? SEMI_FINAL_MATCHDAYS : FINAL_MATCHDAYS;

    const [user1Points, user2Points] = await Promise.all([
      getPoints(row.user1_id, matchdays),
      getPoints(row.user2_id, matchdays),
    ]);

    let winnerId = null;
    if (user1Points > user2Points) winnerId = row.user1_id;
    else if (user2Points > user1Points) winnerId = row.user2_id;
    // אם תיקו - נשאיר null או נטפל לפי החלטה

    await supabase
      .from('cup_draw')
      .update({ winner_id: winnerId })
      .eq('id', row.id);
  }
};

determineWinner();
