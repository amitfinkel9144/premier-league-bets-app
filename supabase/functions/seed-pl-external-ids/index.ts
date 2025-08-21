// supabase/functions/seed-pl-external-ids/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FD_API_BASE = "https://api.football-data.org/v4";
const FD_API_KEY = Deno.env.get("FOOTBALL_DATA_API_KEY")!;

// עזרי תאריך
const d2 = (n: number) => n.toString().padStart(2, "0");
const toISODate = (d: Date) =>
  `${d.getUTCFullYear()}-${d2(d.getUTCMonth() + 1)}-${d2(d.getUTCDate())}`;

// מפתח התאמה: תאריך (YYYY-MM-DD) + קודי TLA של בית/חוץ
type Key = string;
const keyFor = (iso: string, homeTLA?: string | null, awayTLA?: string | null): Key => {
  const day = iso.slice(0, 10); // דיוק של יום מספיק לתזוזות שעון
  return `${day}__${(homeTLA || "").toUpperCase()}__${(awayTLA || "").toUpperCase()}`;
};

serve(async () => {
  try {
    // 1) הבא משחקים אצלך ללא external_match_id
    const { data: local, error } = await supabase
      .from("matches")
      .select("id, home_team, away_team, start_datetime")
      .is("external_match_id", null);

    if (error) throw error;
    if (!local || local.length === 0) {
      return new Response(JSON.stringify({ message: "No rows to seed" }), {
        headers: { "content-type": "application/json" },
      });
    }

    // חישוב טווח תאריכים מינימלי סביב המשחקים שלך (עם מרווח ביטחון)
    const minDate = new Date(Math.min(...local.map(r => new Date(r.start_datetime).getTime())));
    const maxDate = new Date(Math.max(...local.map(r => new Date(r.start_datetime).getTime())));
    const dateFrom = toISODate(new Date(minDate.getTime() - 3 * 86400000)); // 3 ימים אחורה
    const dateTo   = toISODate(new Date(maxDate.getTime() + 3 * 86400000)); // 3 ימים קדימה

    // 2) משוך את משחקי ה-PL בטווח
    const url = `${FD_API_BASE}/competitions/PL/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const resp = await fetch(url, { headers: { "X-Auth-Token": FD_API_KEY } });
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(`FD error ${resp.status}: ${text}`, { status: 500 });
    }
    const payload = await resp.json();
    const apiMatches: any[] = payload.matches || [];

    // 3) בנה מפה לפי KEY
    const mapByKey = new Map<Key, any>();
    for (const m of apiMatches) {
      const k = keyFor(m.utcDate, m.homeTeam?.tla, m.awayTeam?.tla);
      mapByKey.set(k, m);
    }

    // 4) בצע התאמות ועדכונים
    let updated = 0;
    for (const row of local) {
      const whenIso = new Date(row.start_datetime).toISOString();
      const k = keyFor(whenIso, row.home_team, row.away_team);
      const match = mapByKey.get(k);

      // התאמה ראשית לפי (תאריך+TLA)
      if (match?.id) {
        const { error: upErr } = await supabase
          .from("matches")
          .update({ external_match_id: match.id })
          .eq("id", row.id);

        if (!upErr) updated++;
        continue;
      }

      // Fallback עדין: התאמת יום + קבוצה אחת לפחות (פחות מומלץ, אך מסייע אם יש סטייה בשמות)
      const candidates = apiMatches.filter((m) => m.utcDate.slice(0, 10) === whenIso.slice(0, 10));
      const loose = candidates.find((m) =>
        (m.homeTeam?.tla?.toUpperCase() === row.home_team?.toUpperCase()) ||
        (m.awayTeam?.tla?.toUpperCase() === row.away_team?.toUpperCase())
      );
      if (loose?.id) {
        const { error: up2 } = await supabase
          .from("matches")
          .update({ external_match_id: loose.id })
          .eq("id", row.id);
        if (!up2) updated++;
      }
    }

    return new Response(JSON.stringify({ updated }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(e?.message || "Unexpected error", { status: 500 });
  }
});
