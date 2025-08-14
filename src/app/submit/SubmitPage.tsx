'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  start_datetime: string;
  matchday: number;
  actual_home_score: number | null;
  actual_away_score: number | null;
};

export default function SubmitPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<number, { home: number | ''; away: number | '' }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lockTime, setLockTime] = useState<Date | null>(null);
  const [isMatchdayLocked, setIsMatchdayLocked] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: allMatches } = await supabase
        .from('matches')
        .select('*')
        .order('matchday', { ascending: true });

      if (!allMatches || allMatches.length === 0) return;

      const now = new Date();
      const grouped: Record<number, Match[]> = {};

      allMatches.forEach((m: Match) => {
        grouped[m.matchday] = grouped[m.matchday] || [];
        grouped[m.matchday].push(m);
      });

      let nextMatchdayMatches: Match[] = [];
      for (const md of Object.keys(grouped).map(Number).sort((a, b) => a - b)) {
        const allFinished = grouped[md].every((m) =>
          m.actual_home_score !== null && m.actual_away_score !== null
        );
        if (!allFinished) {
          nextMatchdayMatches = grouped[md];
          break;
        }
      }

      if (nextMatchdayMatches.length === 0) return;
      setMatches(nextMatchdayMatches);

      const firstGame = [...nextMatchdayMatches].sort(
        (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      )[0];

      const lock = new Date(new Date(firstGame.start_datetime).getTime() - 90 * 60 * 1000);
      setLockTime(lock);
      setIsMatchdayLocked(now >= lock);

      const { data: existingPredictions } = await supabase
        .from('predictions')
        .select('match_id, predicted_home_score, predicted_away_score')
        .eq('user_id', user.id);

      const initial: Record<number, { home: number | ''; away: number | '' }> = {};
      for (const m of nextMatchdayMatches) {
        initial[m.id] = { home: '', away: '' };
      }
      if (existingPredictions) {
        existingPredictions.forEach((p) => {
          initial[p.match_id] = {
            home: p.predicted_home_score,
            away: p.predicted_away_score,
          };
        });
      }
      setPredictions(initial);
    };

    fetchInitialData();
  }, []);

  const handleChange = (matchId: number, field: 'home' | 'away', value: string) => {
    const n = value === '' ? '' : Math.max(0, Math.min(15, parseInt(value) || 0));
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: n,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!userId) return;

    const rows = Object.entries(predictions)
      .filter(([, s]) => s.home !== '' && s.away !== '')
      .map(([matchId, s]) => ({
        user_id: userId,
        match_id: Number(matchId),
        predicted_home_score: Number(s.home),
        predicted_away_score: Number(s.away),
      }));

    if (rows.length === 0) {
      alert('לא הוזנו ניחושים.');
      return;
    }

    const { error } = await supabase
      .from('predictions')
      .upsert(rows, { onConflict: 'user_id,match_id' });

    if (!error) setSubmitted(true);
    else alert(error.message);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">הימורים למחזור הקרוב</h1>

        {lockTime && !isMatchdayLocked && (
          <p className="mb-4 text-sm text-red-600">
            המחזור ינעל להימורים ב־{' '}
            {lockTime.toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        )}

        {matches.length === 0 ? (
          <p className="mb-6 text-gray-600">אין כרגע משחקים פתוחים להימור.</p>
        ) : (
          matches.map((match) => {
            const p = predictions[match.id] ?? { home: '', away: '' };
            return (
              <div key={match.id} className="mb-5 rounded-2xl border p-4">
                <p className="font-semibold mb-3 text-center">
                  {match.home_team} <span className="text-gray-500 font-normal">VS</span> {match.away_team}
                </p>

                {/* 3 עמודות: בית | VS | חוץ (ללא תלות ב‑RTL) */}
                <div dir="ltr" className="grid grid-cols-3 items-center gap-3">
                  {/* בית מתחת לקבוצת הבית */}
                  <div className="flex flex-col items-center">
                    <span className="text-sm mb-1">{match.home_team}</span>
                    <input
                      type="number"
                      min="0"
                      disabled={isMatchdayLocked}
                      className={`border p-2 rounded w-16 text-center transition-all ${
                        isMatchdayLocked ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white'
                      }`}
                      placeholder="בית"
                      value={p.home}
                      onChange={(e) => handleChange(match.id, 'home', e.target.value)}
                    />
                  </div>

                  {/* VS באמצע */}
                  <div className="flex items-center justify-center">
                    <span className="text-xs text-gray-500">VS</span>
                  </div>

                  {/* חוץ מתחת לקבוצת החוץ */}
                  <div className="flex flex-col items-center">
                    <span className="text-sm mb-1">{match.away_team}</span>
                    <input
                      type="number"
                      min="0"
                      disabled={isMatchdayLocked}
                      className={`border p-2 rounded w-16 text-center transition-all ${
                        isMatchdayLocked ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white'
                      }`}
                      placeholder="חוץ"
                      value={p.away}
                      onChange={(e) => handleChange(match.id, 'away', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}

        {matches.length > 0 && !isMatchdayLocked && (
          <button
            onClick={handleSubmit}
            disabled={submitted}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-6"
          >
            {submitted ? 'הניחושים נשמרו בהצלחה!' : 'שמור הימורים'}
          </button>
        )}

        {matches.length > 0 && isMatchdayLocked && (
          <button
            disabled
            className="w-full bg-gray-300 text-gray-500 font-bold py-2 px-4 rounded mt-6 cursor-not-allowed"
          >
            חלון ההימורים נסגר
          </button>
        )}
      </div>
    </main>
  );
}
