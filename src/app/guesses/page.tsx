// ✅ guesses/page.tsx – Option A: רקע מלא לתא, מותאם כהה/בהיר
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function GuessesPage() {
  const [guesses, setGuesses] = useState<any[]>([]);
  const [matchday, setMatchday] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [canShowGuesses, setCanShowGuesses] = useState<boolean>(false);
  const [lockTime, setLockTime] = useState<Date | null>(null);
  const [actualScores, setActualScores] = useState<Record<number, { home: number; away: number; home_team: string; away_team: string }>>({});
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    const determineCurrentMatchday = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('matchday, start_datetime')
        .order('matchday', { ascending: true });

      if (!matches) return;

      const now = new Date();
      const grouped: Record<number, Date[]> = {};
      matches.forEach((match) => {
        grouped[match.matchday] = grouped[match.matchday] || [];
        grouped[match.matchday].push(new Date(match.start_datetime));
      });

      for (const md of Object.keys(grouped).map(Number).sort((a, b) => a - b)) {
        const allFinished = grouped[md].every((d) => now > d);
        if (!allFinished) {
          setMatchday(md);
          return;
        }
      }
      setMatchday(matches[matches.length - 1]?.matchday || 1);
    };
    determineCurrentMatchday();
  }, []);

  useEffect(() => {
    if (matchday === null) return;

    const fetchGuesses = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('guesses_per_matchday')
        .select('*')
        .eq('matchday', matchday)
        .order('match_id', { ascending: true });
      setGuesses(data || []);
      setLoading(false);
    };

    const fetchActualScores = async () => {
      const { data } = await supabase
        .from('matches')
        .select('id, actual_home_score, actual_away_score, home_team, away_team')
        .eq('matchday', matchday);

      if (!data) return;
      const scoreMap: Record<number, { home: number; away: number; home_team: string; away_team: string }> = {};
      data.forEach((m) => {
        if (m.actual_home_score !== null && m.actual_away_score !== null) {
          scoreMap[m.id] = {
            home: m.actual_home_score,
            away: m.actual_away_score,
            home_team: m.home_team,
            away_team: m.away_team,
          };
        }
      });
      setActualScores(scoreMap);
    };

    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('display_name');
      if (!data) return;
      const allNames = data.map((u) => u.display_name).filter(Boolean);
      setUsers(allNames);
    };

    fetchGuesses();
    fetchActualScores();
    fetchUsers();
  }, [matchday]);

  useEffect(() => {
    if (matchday === null) return;

    const checkLockTime = async () => {
      const { data } = await supabase
        .from('matches')
        .select('start_datetime')
        .eq('matchday', matchday)
        .order('start_datetime', { ascending: true })
        .limit(1)
        .single();

      if (!data?.start_datetime) return;

      const matchDate = new Date(data.start_datetime);
      matchDate.setMinutes(matchDate.getMinutes() - 90);

      const now = new Date();
      setLockTime(matchDate);
      setCanShowGuesses(now >= matchDate);
    };

    checkLockTime();
  }, [matchday]);

  // ✅ קובע מחלקות רקע מלא עם גרסאות כהות
  const highlightClass = (kind: 'exact' | 'tendency' | 'miss') => {
    switch (kind) {
      case 'exact':    // בול
        return 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100';
      case 'tendency': // כיוון
        return 'bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-100';
      default:         // פספוס
        return 'bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const outcomeKind = (g: any): 'exact' | 'tendency' | 'miss' => {
    const actual = actualScores[g.match_id];
    if (!actual) return 'miss';
    const exact =
      actual.home === g.predicted_home_score &&
      actual.away === g.predicted_away_score;

    const tendency =
      (actual.home > actual.away && g.predicted_home_score > g.predicted_away_score) ||
      (actual.home < actual.away && g.predicted_home_score < g.predicted_away_score) ||
      (actual.home === actual.away && g.predicted_home_score === g.predicted_away_score);

    if (exact) return 'exact';
    if (tendency) return 'tendency';
    return 'miss';
  };

  const getWinnerText = (match: { home: number; away: number; home_team: string; away_team: string }) => {
    if (match.home > match.away) return `ל ${match.home_team}`;
    if (match.home < match.away) return `ל ${match.away_team}`;
    return '';
  };

  const getMatches = () => [...new Set(guesses.map((g) => g.match_id))];

  const selectBase =
    'border px-2 py-1 rounded bg-white text-gray-900 border-gray-300 ' +
    'focus:outline-none focus:ring focus:ring-blue-500/30 ' +
    'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus:ring-blue-400/30';

  return (
    <main className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 px-2 py-10">
      <div className="bg-white dark:bg-gray-900 shadow rounded-2xl p-4 w-full max-w-6xl overflow-x-auto border border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold mb-4 text-center">הימורים למחזור {matchday ?? '...'}</h1>

        <div className="mb-4 text-right">
          <label className="ml-2 font-semibold text-gray-800 dark:text-gray-200">בחר מחזור:</label>
          <select
            className={selectBase}
            value={matchday ?? ''}
            onChange={(e) => setMatchday(Number(e.target.value))}
          >
            {[...Array(38)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>

        {!canShowGuesses ? (
          <p className="text-red-600 dark:text-red-400 text-center mb-4">
            ההימורים יוצגו ב־{lockTime?.toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        ) : loading ? (
          <p className="text-center text-gray-700 dark:text-gray-300">טוען...</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-gray-700 dark:text-gray-200">#</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-gray-700 dark:text-gray-200">תוצאה</th>
                  {users.map((user) => (
                    <th
                      key={user}
                      className="border border-gray-200 dark:border-gray-700 px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200"
                    >
                      {user}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getMatches().map((matchId, index) => {
                  const actual = actualScores[matchId];
                  return (
                    <tr key={matchId}>
                      <td className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-center text-gray-900 dark:text-gray-100">
                        {index + 1}
                      </td>
                      <td className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">
                        {actual ? `${actual.home} - ${actual.away} ${getWinnerText(actual)}` : '?'}
                      </td>
                      {users.map((user) => {
                        const g = guesses.find((x) => x.display_name === user && x.match_id === matchId);
                        if (!g) {
                          return (
                            <td
                              key={user}
                              className={`border border-gray-200 dark:border-gray-700 px-2 py-2 text-center ${highlightClass('miss')}`}
                            >
                              <span className="text-red-600 dark:text-red-400 font-bold">-</span>
                            </td>
                          );
                        }
                        const kind = outcomeKind(g);
                        return (
                          <td
                            key={user}
                            className={`border border-gray-200 dark:border-gray-700 px-2 py-2 text-center ${highlightClass(kind)}`}
                          >
                            {g.predicted_home_score} - {g.predicted_away_score}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/submit">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded
                               focus:outline-none focus:ring focus:ring-blue-500/30">
              חזרה למסך הבית
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
