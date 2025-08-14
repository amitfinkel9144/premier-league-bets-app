// supabase/functions/sync-matchdays/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async () => {
  // שליפת כל ערכי matchday הקיימים בטבלת matches
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('matchday, start_datetime');

  if (matchesError) {
    console.error('שגיאה בשליפת משחקים:', matchesError);
    return new Response('error loading matches', { status: 500 });
  }

  const matchdayMap = new Map<number, string>();
  for (const match of matches || []) {
    const { matchday, start_datetime } = match;
    if (!matchdayMap.has(matchday)) {
      matchdayMap.set(matchday, start_datetime);
    } else {
      const existing = matchdayMap.get(matchday);
      if (new Date(start_datetime) < new Date(existing)) {
        matchdayMap.set(matchday, start_datetime);
      }
    }
  }

  // שליפת matchday_numbers שכבר קיימים
  const { data: existingMatchdays, error: matchdaysError } = await supabase
    .from('matchdays')
    .select('matchday_number');

  const existingNumbers = new Set((existingMatchdays || []).map(m => m.matchday_number));

  const inserts = [];
  for (const [matchday, start_time] of matchdayMap.entries()) {
    if (!existingNumbers.has(matchday)) {
      inserts.push({ matchday_number: matchday, start_time });
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from('matchdays')
      .insert(inserts);

    if (insertError) {
      console.error('שגיאה בהוספה:', insertError);
      return new Response('error inserting matchdays', { status: 500 });
    }
  }

  return new Response(JSON.stringify({ status: 'ok', added: inserts.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
