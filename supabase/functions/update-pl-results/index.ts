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
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

serve(async (req: Request) => {
  // לא לאפשר GET, כדי שבוטים לא יריצו בטעות
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    if (!FD_API_KEY) {
      return new Response("Missing FOOTBALL_DATA_API_KEY", { status: 500 });
    }

    const url = new URL(req.url);

    // --- מצב ממוקד: ?id=<external_match_id> ---
    const idParamRaw =
      url.searchParams.get("id") ||
      url.searchParams.get("match_id") ||
      url.searchParams.get("external_id");

    if (idParamRaw) {
      const id = Number(idParamRaw);
      if (!Number.isFinite(id)) {
        return new Response(
          JSON.stringify({ error: "Invalid id" }),
          { status: 400, headers: { "content-type": "application/json" } }
        );
      }

      const mres = await fetch(`${FD_API_BASE}/matches/${id}`, {
        headers: { "X-Auth-Token": FD_API_KEY },
      });
      if (!mres.ok) {
        const txt = await mres.text();
        return new Response(`FD error ${mres.status}: ${txt}`, { status: 500 });
      }

      const payload: any = await mres.json();
      // תיקון חשוב: ה־endpoint הזה מחזיר את המשחק בשורש ולא תמיד תחת payload.match
      const m = payload?.match ?? payload;

      const home = m?.score?.fullTime?.home;
      const away = m?.score?.fullTime?.away;
      const status = m?.status;

      if (!isNum(home) || !isNum(away)) {
        return new Response(
          JSON.stringify({ id, updated: 0, reason: "no fullTime score yet", status }),
          { headers: { "content-type": "application/json", "cache-control": "no-store" } }
        );
      }

      const { data, error } = await supabase
        .from("matches")
        .update({ actual_home_score: home, actual_away_score: away })
        .eq("external_match_id", id)
        .select("id")
        .maybeSingle();

      if (error) {
        return new Response(
          JSON.stringify({ id, error: error.message }),
          { status: 500, headers: { "content-type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ id, updated: data ? 1 : 0, status, home, away }),
        { headers: { "content-type": "application/json", "cache-control": "no-store" } }
      );
    }
    // --- סוף מצב ממוקד ---

    // --- מצב רגיל: חלון ימים אחורה (ברירת מחדל 14) ---
    const daysParam = url.searchParams.get("days");
    const days = Math.max(1, Math.min(365, Number(daysParam) || 14));

    const now = new Date();
    const from = toISODate(new Date(now.getTime() - days * 86400000));
    const to = toISODate(now);

    // בלי status=FINISHED – אנחנו נעדכן רק אם יש fullTime מספרי
    const apiUrl = `${FD_API_BASE}/competitions/PL/matches?dateFrom=${from}&dateTo=${to}`;

    const resApi = await fetch(apiUrl, { headers: { "X-Auth-Token": FD_API_KEY } });
    if (!resApi.ok) {
      const txt = await resApi.text();
      return new Response(`FD error ${resApi.status}: ${txt}`, { status: 500 });
    }

    const data: any = await resApi.json();
    const matches: any[] = data.matches ?? [];

    let updated = 0, notFound = 0, skipped = 0;

    for (const m of matches) {
      const extId = m.id;
      const home = m?.score?.fullTime?.home;
      const away = m?.score?.fullTime?.away;

      if (!isNum(home) || !isNum(away)) {
        skipped++;
        continue;
      }

      const { data: row, error } = await supabase
        .from("matches")
        .update({ actual_home_score: home, actual_away_score: away })
        .eq("external_match_id", extId)
        .select("id")
        .maybeSingle();

      if (error) {
        skipped++;
      } else if (!row) {
        notFound++;
      } else {
        updated++;
      }
    }

    const rate = {
      per_minute_remaining: resApi.headers.get("X-Requests-Available-Minute"),
      reset_in_seconds: resApi.headers.get("X-RequestCounter-Reset"),
    };

    return new Response(
      JSON.stringify({
        window_from: from,
        window_to: to,
        total_api: matches.length,
        updated, notFound, skipped,
        rate
      }),
      { headers: { "content-type": "application/json", "cache-control": "no-store" } }
    );
    // --- סוף מצב רגיל ---

  } catch (e: any) {
    return new Response(e?.message || "Unexpected error", { status: 500 });
  }
});
