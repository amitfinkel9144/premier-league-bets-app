// ✅ גרסה מעודכנת של guesses/page.tsx עם כפתור חזרה לעמוד /submit
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
      const { data: matches } = await supabase.from('matches').select('matchday, start_datetime').order('matchday', { ascending: true });
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

  const getStyle = (guess: any) => {
    const actual = actualScores[guess.match_id];
    if (!actual) return '';
    const exact = actual.home === guess.predicted_home_score && actual.away === guess.predicted_away_score;
    const tendency =
      (actual.home > actual.away && guess.predicted_home_score > guess.predicted_away_score) ||
      (actual.home < actual.away && guess.predicted_home_score < guess.predicted_away_score) ||
      (actual.home === actual.away && guess.predicted_home_score === guess.predicted_away_score);
    if (exact) return 'bg-green-200';
    if (tendency) return 'bg-yellow-200';
    return 'bg-white';
  };

  const getWinnerText = (match: { home: number; away: number; home_team: string; away_team: string }) => {
    if (match.home > match.away) return `ל ${match.home_team}`;
    if (match.home < match.away) return `ל ${match.away_team}`;
    return '';
  };

  const getMatches = () => [...new Set(guesses.map((g) => g.match_id))];

  return (
    <main className="min-h-screen flex flex-col items-center bg-gray-100 px-2 py-10">
      <div className="bg-white shadow rounded-xl p-4 w-full max-w-6xl overflow-x-auto">
        <h1 className="text-xl font-bold mb-4 text-center">הימורים למחזור {matchday ?? '...'}</h1>

        <div className="mb-4 text-right">
          <label className="ml-2 font-semibold">בחר מחזור:</label>
          <select
            className="border px-2 py-1 rounded"
            value={matchday ?? ''}
            onChange={(e) => setMatchday(Number(e.target.value))}
          >
            {[...Array(38)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>

        {!canShowGuesses ? (
          <p className="text-red-600 text-center mb-4">
            ההימורים יוצגו ב־{lockTime?.toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        ) : loading ? (
          <p className="text-center">טוען...</p>
        ) : (
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border px-1 py-1">#</th>
                <th className="border px-1 py-1">תוצאה</th>
                {users.map((user) => (
                  <th key={user} className="border px-1 py-1 whitespace-nowrap">{user}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getMatches().map((matchId, index) => {
                const match = guesses.find((g) => g.match_id === matchId);
                const actual = actualScores[matchId];
                return (
                  <tr key={matchId}>
                    <td className="border px-1 py-1 text-center">{index + 1}</td>
                    <td className="border px-1 py-1 text-center font-semibold">
                      {actual ? `${actual.home} - ${actual.away} ${getWinnerText(actual)}` : '?'}
                    </td>
                    {users.map((user) => {
                      const g = guesses.find((x) => x.display_name === user && x.match_id === matchId);
                      return (
                        <td
                          key={user}
                          className={`border px-1 py-1 text-center ${g ? getStyle(g) : ''}`}
                        >
                          {g ? `${g.predicted_home_score} - ${g.predicted_away_score}` : <span className="text-red-600 font-bold">-</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="mt-6 text-center">
          <Link href="/submit">
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
              חזרה למסך הבית
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
