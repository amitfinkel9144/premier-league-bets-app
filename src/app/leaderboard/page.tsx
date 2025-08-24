'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Score = {
  user_id: string;
  username: string;
  exact_hits: number;
  direction_hits: number;
  total_points: number;
};

type RoundScore = {
  user_id: string;
  username: string;
  matchday: number;
  exact_hits: number;
  direction_hits: number;
  total_points: number;
};

type MatchRow = {
  matchday: number;
  start_datetime: string;
};

const teamLogo = (code?: string) => (code ? `/logos/${code}_logo.svg` : '');

export default function LeaderboardPage() {
  const router = useRouter();

  const [scores, setScores] = useState<Score[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});

  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  const [matchdays, setMatchdays] = useState<number[]>([]);
  const [selectedMatchday, setSelectedMatchday] = useState<number | null>(null);

  const [loadingSeason, setLoadingSeason] = useState(true);
  const [loadingRound, setLoadingRound] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      setErr(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      /** -------- עונה -------- */
      setLoadingSeason(true);
      const { data: scoresData } = await supabase
        .from('user_scores')
        .select('user_id, username, exact_hits, direction_hits, total_points')
        .order('total_points', { ascending: false })
        .order('direction_hits', { ascending: false });

      const cleanedSeason = (scoresData ?? []).map((e: any) => ({
        user_id: e.user_id as string,
        username: (e.username ?? '') as string,
        total_points: Number(e.total_points ?? 0),
        direction_hits: Number(e.direction_hits ?? 0),
        exact_hits: Number(e.exact_hits ?? 0),
      }));
      setScores(cleanedSeason);
      setLoadingSeason(false);

      const { data: picksData } = await supabase
        .from('season_winner_picks')
        .select('user_id, team_code');
      const map: Record<string, string> = {};
      (picksData ?? []).forEach((r: any) => { map[r.user_id] = r.team_code; });
      setPicks(map);

      /** -------- מחזור -------- */
      const { data: matchesData } = await supabase
        .from('matches')
        .select('matchday, start_datetime')
        .order('start_datetime', { ascending: true });

      const rows: MatchRow[] = (matchesData ?? []).map((m: any) => ({
        matchday: Number(m.matchday),
        start_datetime: String(m.start_datetime),
      }));

      const uniqDays = Array.from(new Set(rows.map(r => r.matchday))).sort((a, b) => a - b);
      setMatchdays(uniqDays);

      const now = new Date();
      const upcoming = rows.find(r => new Date(r.start_datetime) > now);
      const active = upcoming?.matchday ?? (uniqDays.length ? uniqDays[uniqDays.length - 1] : null);
      setSelectedMatchday(active);

      if (active != null) {
        await fetchRoundScores(active, setRoundScores, setLoadingRound, setErr);
      } else {
        setLoadingRound(false);
      }
    };

    bootstrap();
  }, [router]);

  const rankRows = <T extends { total_points: number; exact_hits: number }>(rows: T[]) => {
    const sorted = [...rows].sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return b.exact_hits - a.exact_hits;
    });
    return sorted.map((r, i) => ({ ...r, __rank: i + 1 })) as Array<T & { __rank: number }>;
  };

  const rankedSeason = useMemo(() => rankRows(scores), [scores]);
  const rankedRound  = useMemo(() => rankRows(roundScores), [roundScores]);

  return (
    <main className="flex min-h-screen items-start justify-center p-4 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-2xl space-y-6">

        {/* ===== טבלת ניקוד פר-מחזור (למעלה) ===== */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-center mb-4">ניקוד לפי מחזור</h3>

          <div className="flex items-center justify-center mb-4">
            <label htmlFor="md" className="text-sm text-gray-600 dark:text-gray-300 ml-2">בחר מחזור:</label>
            <select
              id="md"
              className="border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-sm"
              value={selectedMatchday ?? ''}
              onChange={async (e) => {
                const md = Number(e.target.value);
                setSelectedMatchday(md);
                await fetchRoundScores(md, setRoundScores, setLoadingRound, setErr);
              }}
            >
              {matchdays.map(md => (
                <option key={md} value={md}>מחזור {md}</option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm rtl text-right">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr className="border-b border-gray-200 dark:border-gray-700 h-10">
                  <th className="px-2 text-center w-8">#</th>
                  <th className="px-2">כינוי</th>
                  <th className="px-2 text-center">כיוון</th>
                  <th className="px-2 text-center">בול</th>
                  <th className="px-2 text-center">נק׳ במחזור</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loadingRound ? (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-500">טוען…</td></tr>
                ) : rankedRound.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-500">אין נתונים למחזור הנבחר</td></tr>
                ) : rankedRound.map((row) => (
                  <tr key={`${row.user_id}-${row.matchday}`} className="h-12 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <td className="px-2 text-center font-bold">{row.__rank}</td>
                    <td className="px-2 font-medium">{row.username}</td>
                    <td className="px-2 text-center">{row.direction_hits}</td>
                    <td className="px-2 text-center">{row.exact_hits}</td>
                    <td className="px-2 text-center font-extrabold">{row.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedMatchday != null && (
            <p className="mt-3 text-xs text-gray-500 text-center">מציג מחזור {selectedMatchday}</p>
          )}
          {err && <p className="mt-3 text-sm text-red-500 text-center">{err}</p>}
        </section>

        {/* ===== טבלת ניקוד עונתי ===== */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700 relative">
          <h2 className="text-xl font-bold text-center mb-4">
            <span className="text-yellow-500"></span> טבלת ניקוד 🏆 (עונה)
          </h2>

          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 pr-8">
              <table className="w-full text-sm rtl text-right">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr className="border-b border-gray-200 dark:border-gray-700 h-10">
                    <th className="px-2 text-center w-8">#</th>
                    <th className="px-2">כינוי</th>
                    <th className="px-2 text-center">כיוון</th>
                    <th className="px-2 text-center">בול</th>
                    <th className="px-2 text-center">ניקוד</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loadingSeason ? (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">טוען…</td></tr>
                  ) : rankedSeason.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-500">אין נתונים</td></tr>
                  ) : rankedSeason.map((row) => (
                    <tr key={row.user_id} className="h-12 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <td className="px-2 text-center font-bold">{row.__rank}</td>
                      <td className="px-2 font-medium">{row.username}</td>
                      <td className="px-2 text-center">{row.direction_hits}</td>
                      <td className="px-2 text-center">{row.exact_hits}</td>
                      <td className="px-2 text-center font-extrabold">{row.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="absolute top-10 right-1 flex flex-col">
              {rankedSeason.map((row) => {
                const pick = picks[row.user_id];
                return (
                  <div key={`logo-${row.user_id}`} className="h-12 flex items-center justify-center" title={pick ? `אלופה נבחרת: ${pick}` : ''}>
                    {pick && (
                      <img
                        src={teamLogo(pick)}
                        alt={pick}
                        className="w-5 h-5"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => router.push('/submit')}
            className="mt-6 w-full bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded"
          >
            חזרה למסך הבית
          </button>
        </section>
      </div>
    </main>
  );
}

async function fetchRoundScores(
  matchday: number,
  setRoundScores: (rs: RoundScore[]) => void,
  setLoadingRound: (b: boolean) => void,
  setErr: (s: string | null) => void
) {
  setLoadingRound(true);
  setErr(null);

  const { data, error } = await supabase
    .from('v_user_scores_by_matchday')
    .select('user_id, username, matchday, exact_hits, direction_hits, total_points')
    .eq('matchday', matchday);

  if (error) {
    setErr(error.message);
    setRoundScores([]);
  } else {
    const cleaned = (data ?? []).map((e: any) => ({
      user_id: e.user_id as string,
      username: (e.username ?? '') as string,
      matchday: Number(e.matchday ?? 0),
      total_points: Number(e.total_points ?? 0),
      direction_hits: Number(e.direction_hits ?? 0),
      exact_hits: Number(e.exact_hits ?? 0),
    })) as RoundScore[];
    setRoundScores(cleaned);
  }

  setLoadingRound(false);
}
