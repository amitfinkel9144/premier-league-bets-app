// supabase/functions/update-pl-results/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FD_API_BASE = "https://api.football-data.org/v4";
const FD_API_KEY = Deno.env.get("FOOTBALL_DATA_API_KEY")!;

const d2 = (n: number) => n.toString().padStart(2, "0");
const toISODate = (d: Date) =>
  `${d.getUTCFullYear()}-${d2(d.getUTCMonth() + 1)}-${d2(d.getUTCDate())}`;

serve(async (req: Request) => {
  try {
    // Guard: ודא שסוד נטען
    if (!FD_API_KEY) {
      return new Response("Missing FOOTBALL_DATA_API_KEY", { status: 500 });
    }

    // קבלת פרמטר days מה-URL (רשות), ברירת מחדל 14
    const url = new URL(req.url);
    const daysParam = url.searchParams.get("days");
    const days = Math.max(1, Math.min(365, Number(daysParam) || 14));

    const now = new Date();
    const from = toISODate(new Date(now.getTime() - days * 86400000));
    const to = toISODate(now);

    const apiUrl =
      `${FD_API_BASE}/competitions/PL/matches?status=FINISHED&dateFrom=${from}&dateTo=${to}`;

    const res = await fetch(apiUrl, { headers: { "X-Auth-Token": FD_API_KEY } });
    if (!res.ok) {
      const txt = await res.text();
      return new Response(`FD error ${res.status}: ${txt}`, { status: 500 });
    }

    const data = await res.json();
    const matches: any[] = data.matches || [];

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    const tasks: Promise<any>[] = [];

    for (const m of matches) {
      const extId = m.id;
      const home = m?.score?.fullTime?.home;
      const away = m?.score?.fullTime?.away;

      // אם אין תוצאה סופית — דלג
      if (typeof home !== "number" || typeof away !== "number") {
        skipped++;
        continue;
      }

      // עדכון לפי external_match_id
      tasks.push(
        supabase
          .from("matches")
          .update({ actual_home_score: home, actual_away_score: away })
          .eq("external_match_id", extId)
          .select("id") // כדי לדעת אם נמצאה שורה
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              // לא מפיל את כל הריצה
              skipped++;
            } else if (!data) {
              notFound++;
            } else {
              updated++;
            }
          })
      );
    }

    await Promise.allSettled(tasks);

    return new Response(
      JSON.stringify({ window_from: from, window_to: to, total_api: matches.length, updated, notFound, skipped }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(e?.message || "Unexpected error", { status: 500 });
  }
});
