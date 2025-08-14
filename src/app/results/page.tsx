'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Result = {
  match_name: string;
  predicted_home_score: number;
  predicted_away_score: number;
  actual_home_score: number;
  actual_away_score: number;
  points: number;
};

export default function ResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: seasonResults } = await supabase
        .from('season_results_view')
        .select('*')
        .eq('user_id', user.id);

      setResults(seasonResults || []);

      const { data: scoreData } = await supabase
        .from('user_scores')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      setTotalPoints(scoreData?.total_points ?? null);
    };

    fetchResults();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-2">תוצאות העונה</h1>

        {totalPoints !== null && (
          <p className="text-lg text-blue-600 font-semibold mb-4">
            ניקוד מצטבר: {totalPoints} נקודות
          </p>
        )}

        {results.length === 0 ? (
          <p className="mb-6 text-gray-600">לא נמצאו תוצאות להצגה.</p>
        ) : (
          <table className="w-full text-sm rtl text-right border-t">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-1">משחק</th>
                <th className="px-2 py-1">תוצאה אמיתית</th>
                <th className="px-2 py-1">הניחוש שלך</th>
                <th className="px-2 py-1">ניקוד</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-100">
                  <td className="px-2 py-1">{r.match_name.replace('נגד', 'VS')}</td>
                  <td className="px-2 py-1 text-center">
                    {r.actual_home_score}:{r.actual_away_score}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {r.predicted_home_score}:{r.predicted_away_score}
                  </td>
                  <td className="px-2 py-1 text-center font-bold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Link href="/submit">
          <button className="mt-6 w-full bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded">
            חזרה לדף הבית
          </button>
        </Link>
      </div>
    </main>
  );
}
