'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Score = {
  user_id: string;
  username: string;
  exact_hits: number;      // בולים
  direction_hits: number;  // כיוונים
  total_points: number;    // נקודות
};

const teamLogo = (code?: string) => (code ? `/logos/${code}_logo.svg` : '');

export default function LeaderboardPage() {
  const router = useRouter();
  const [scores, setScores] = useState<Score[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({}); // user_id -> team_code

  useEffect(() => {
    const fetchScoresAndPicks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // מיון מהשרת: נקודות ↓, כיוונים ↓
      const { data: scoresData, error: sErr } = await supabase
        .from('user_scores')
        .select('user_id, username, exact_hits, direction_hits, total_points')
        .order('total_points', { ascending: false })
        .order('direction_hits', { ascending: false });

      if (sErr) {
        console.error('שגיאה בטעינת טבלת ניקוד:', sErr.message);
        return;
      }

      const cleaned = (scoresData ?? []).map((e: any) => ({
        user_id: e.user_id as string,
        username: (e.username ?? '') as string,
        total_points: Number(e.total_points ?? 0),
        direction_hits: Number(e.direction_hits ?? 0),
        exact_hits: Number(e.exact_hits ?? 0),
      }));
      setScores(cleaned);

      // שליפת הימורי אלופה
      const { data: picksData, error: pErr } = await supabase
        .from('season_winner_picks')
        .select('user_id, team_code');

      if (pErr) {
        console.error('שגיאה בטעינת הימורי אלופה:', pErr.message);
        return;
      }

      const map: Record<string, string> = {};
      (picksData ?? []).forEach((r: any) => { map[r.user_id] = r.team_code; });
      setPicks(map);
    };

    fetchScoresAndPicks();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-6 text-center">
        <h2 className="text-xl font-bold mb-1">
          <span className="text-yellow-500">🏆</span> טבלת ניקוד
        </h2>

        <table className="w-full text-sm rtl text-right">
          <thead>
            <tr className="border-b">
              <th className="px-2 py-1 text-center">#</th>
              <th className="px-2 py-1">כינוי</th>
              <th className="px-2 py-1 text-center">בול</th>
              <th className="px-2 py-1 text-center">כיוון</th>
              <th className="px-2 py-1 text-center">ניקוד</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((row, index) => (
              <tr key={row.user_id} className="bg-gray-100 hover:bg-gray-200 transition-all">
                <td className="px-2 py-1 text-center font-bold">{index + 1}</td>
                <td className="px-2 py-1 font-medium">
                  <div className="flex items-center gap-2">
                    {picks[row.user_id] && (
                      <img
                        src={teamLogo(picks[row.user_id])}
                        alt={picks[row.user_id]}
                        className="w-5 h-5"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                        title={`אלופה נבחרת: ${picks[row.user_id]}`}
                      />
                    )}
                    <span>{row.username}</span>
                  </div>
                </td>
                <td className="px-2 py-1 text-center">{row.exact_hits}</td>
                <td className="px-2 py-1 text-center">{row.direction_hits}</td>
                <td className="px-2 py-1 text-center font-bold">{row.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={() => router.push('/submit')}
          className="mt-6 w-full bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded"
        >
          חזרה למסך הבית
        </button>
      </div>
    </main>
  );
}
