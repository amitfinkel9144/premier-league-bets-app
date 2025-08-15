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

      // הימור אלופה לכל המשתמשים
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
    <main className="flex min-h-screen items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 text-center border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">
          <span className="text-yellow-500">🏆</span> טבלת ניקוד
        </h2>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm rtl text-right">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-2 py-2 text-center text-gray-700 dark:text-gray-200">#</th>
                <th className="px-2 py-2 text-gray-700 dark:text-gray-200">כינוי</th>
                <th className="px-2 py-2 text-center text-gray-700 dark:text-gray-200">בול</th>
                <th className="px-2 py-2 text-center text-gray-700 dark:text-gray-200">כיוון</th>
                <th className="px-2 py-2 text-center text-gray-700 dark:text-gray-200">ניקוד</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {scores.map((row, index) => {
                const pick = picks[row.user_id]; // הקבוצה שהמשתמש הימר שתהיה אלופה
                return (
                  <tr
                    key={row.user_id}
                    className="bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>

                    {/* שם + לוגו האלופה מימין לשם בתוך התא */}
                    <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex flex-row-reverse items-center gap-2">
                        {pick && (
                          <img
                            src={teamLogo(pick)}
                            alt={pick}
                            className="w-5 h-5"
                            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                            title={`אלופה נבחרת: ${pick}`}
                          />
                        )}
                        <span>{row.username}</span>
                      </div>
                    </td>

                    <td className="px-2 py-2 text-center text-gray-900 dark:text-gray-100">
                      {row.exact_hits}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-900 dark:text-gray-100">
                      {row.direction_hits}
                    </td>
                    <td className="px-2 py-2 text-center font-extrabold text-gray-900 dark:text-gray-100">
                      {row.total_points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => router.push('/submit')}
          className="mt-6 w-full bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded
                     focus:outline-none focus:ring focus:ring-gray-500/30"
        >
          חזרה למסך הבית
        </button>
      </div>
    </main>
  );
}
