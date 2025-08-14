'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Score = {
  user_id: string;
  username: string;
  exact_hits: number;
  direction_hits: number;
  total_points: number;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    const fetchScores = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase.from('user_scores').select('*');

      if (error) {
        console.error('שגיאה בטעינת טבלת ניקוד:', error.message);
        return;
      }

      const cleaned = (data as Score[]).map((entry) => ({
        ...entry,
        total_points: Number(entry.total_points),
        exact_hits: Number(entry.exact_hits),
        direction_hits: Number(entry.direction_hits),
      }));

      const sorted = cleaned.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return b.exact_hits - a.exact_hits;
      });

      setScores(sorted);
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
            {scores.map((score, index) => (
              <tr
                key={score.user_id}
                className="bg-gray-100 hover:bg-gray-200 transition-all"
              >
                <td className="px-2 py-1 text-center font-bold">{index + 1}</td>
                <td className="px-2 py-1 font-medium">{score.username}</td>
                <td className="px-2 py-1 text-center">{score.exact_hits}</td>
                <td className="px-2 py-1 text-center">{score.direction_hits}</td>
                <td className="px-2 py-1 text-center font-bold">{score.total_points}</td>
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
