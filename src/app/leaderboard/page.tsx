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

export default function LeaderboardPage() {
  const router = useRouter();
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    const fetchScores = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // מיון מהשרת: נקודות ↓, כיוונים ↓
      const { data, error } = await supabase
        .from('user_scores')
        .select('user_id, username, exact_hits, direction_hits, total_points')
        .order('total_points', { ascending: false })
        .order('direction_hits', { ascending: false });

      if (error) {
        console.error('שגיאה בטעינת טבלת ניקוד:', error.message);
        return;
      }

      const cleaned = (data ?? []).map((e) => ({
        user_id: e.user_id as string,
        username: (e.username ?? '') as string,
        total_points: Number(e.total_points ?? 0),
        direction_hits: Number(e.direction_hits ?? 0),
        exact_hits: Number(e.exact_hits ?? 0),
      }));

      setScores(cleaned);
    };

    fetchScores();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-6 text-center">
        <h2 className="text-xl font-bold mb-4">
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
                <td className="px-2 py-1 font-medium">{row.username}</td>
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
