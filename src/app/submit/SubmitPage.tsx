'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/** ------- Types ------- */
type Match = {
  id: number;
  home_team: string;   // יכול להיות שם מלא או כבר קוד 3 אותיות
  away_team: string;
  start_datetime: string;
  matchday: number;
  actual_home_score: number | null;
  actual_away_score: number | null;
};

type PredictionValue = '' | string;
type Predictions = Record<number, { home: PredictionValue; away: PredictionValue }>;

/** --- נרמול שם קבוצה: אותיות בלבד, & -> and, בלי רווחים/פיסוק --- */
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
}

/** ------- Name -> 3-letter code mapping (על בסיס שם מנורמל) ------- */
const NAME_TO_CODE: Record<string, string> = {
  // Arsenal
  arsenal: 'ARS', ars: 'ARS',
  // Aston Villa
  astonvilla: 'AVL', avl: 'AVL',
  // Bournemouth
  bournemouth: 'BOU', bou: 'BOU',
  // Brighton & Hove Albion
  brighton: 'BHA', brightonandhovealbion: 'BHA', bha: 'BHA',
  // Brentford
  brentford: 'BRE', bre: 'BRE',
  // Burnley
  burnley: 'BUR', bur: 'BUR',
  // Chelsea
  chelsea: 'CHE', che: 'CHE',
  // Crystal Palace
  crystalpalace: 'CRY', cry: 'CRY',
  // Everton
  everton: 'EVE', eve: 'EVE',
  // Fulham
  fulham: 'FUL', ful: 'FUL',
  // Leeds (אם רלוונטי)
  leeds: 'LEE', leedsunited: 'LEE', lee: 'LEE',
  // Liverpool
  liverpool: 'LIV', lfc: 'LIV', liv: 'LIV',
  // Manchester City
  manchestercity: 'MCI', mancity: 'MCI', mci: 'MCI',
  // Manchester United
  manchesterunited: 'MUN', manutd: 'MUN', mun: 'MUN',
  // Newcastle
  newcastle: 'NEW', newcastleunited: 'NEW', new: 'NEW',
  // Nottingham Forest — כל הווריאנטים
  nottinghamforest: 'NFO',
  nottmforest: 'NFO',
  nottm: 'NFO',
  forest: 'NFO',
  // Sunderland (אם קיים)
  sunderland: 'SUN', sun: 'SUN',
  // Tottenham
  tottenham: 'TOT', tottenhamhotspur: 'TOT', spurs: 'TOT', tot: 'TOT',
  // West Ham
  westham: 'WHU', westhamunited: 'WHU', whu: 'WHU',
  // Wolves
  wolves: 'WOL', wolverhampton: 'WOL', wolverhamptonwanderers: 'WOL', wol: 'WOL',
};

/** מחזיר קוד 3‑אותיות:
 * 1) אם כבר 3 אותיות → מחזיר כמו שהוא ב-UPPERCASE
 * 2) אחרת מיפוי לפי שם מנורמל
 * 3) אחרת fallback: שלוש האותיות הראשונות של השם המנורמל (או 'TBD' אם ריק)
 */
function getTeamCode(raw: string): string {
  if (!raw) return 'TBD';
  const trimmed = raw.trim();
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();

  const key = normalizeName(trimmed);
  const mapped = NAME_TO_CODE[key];
  if (mapped) return mapped;

  const fallback = key.slice(0, 3).toUpperCase();
  return fallback || 'TBD';
}

// נתיב לוגו לפי קוד (התאם לתיקיית ה-public שלך)
function getLogoPathFromCode(code: string): string {
  return `/logos/${code}_logo.svg`;
}

/** --- ניקוי והגבלת קלט ל-0..15 כמחרוזת --- */
function sanitizeScoreInput(raw: string): PredictionValue {
  const digitsOnly = raw.replace(/[^0-9]/g, '');
  if (digitsOnly === '') return '';
  const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
  const n = Math.max(0, Math.min(15, parseInt(normalized, 10)));
  return String(n);
}

/** -------- Component: Team Badge (ללא מסגרת; מציג גם את הקוד מתחת) -------- */
function TeamBadge({ teamName }: { teamName: string }) {
  const code = useMemo(() => getTeamCode(teamName), [teamName]);
  const initialLogo = useMemo(() => getLogoPathFromCode(code), [code]);
  const [imgSrc, setImgSrc] = useState<string | null>(initialLogo);

  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 flex items-center justify-center bg-transparent">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={code}
            className="w-14 h-14 object-contain"
            onError={() => setImgSrc(null)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="text-sm text-gray-500">{code}</span>
        )}
      </div>
      <span className="text-xs text-gray-600 mt-1 tracking-wide">{code}</span>
    </div>
  );
}

/** --- אפשרויות הקבוצות ל-select של אלופה --- */
const TEAM_OPTIONS = [
  'ARS','AVL','BOU','BRE','BHA','CHE','CRY','EVE','FUL','LEE','LIV','MCI','MUN','NEW','NFO','SUN','TOT','WHU','WOL'
];

export default function SubmitPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Predictions>({});
  const [submitted, setSubmitted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lockTime, setLockTime] = useState<Date | null>(null);
  const [isMatchdayLocked, setIsMatchdayLocked] = useState(false);

  // אלופה
  const [championPick, setChampionPick] = useState<string>('');
  const [existingChampionPick, setExistingChampionPick] = useState<string>('');
  const [isSeasonPickSaving, setIsSeasonPickSaving] = useState(false);
  const [beforeFirstKickoff, setBeforeFirstKickoff] = useState<boolean>(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      /** קביעת האם אנחנו לפני המשחק הראשון של העונה */
      const { data: firstMatch } = await supabase
        .from('matches')
        .select('start_datetime')
        .order('start_datetime', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstMatch?.start_datetime) {
        const first = new Date(firstMatch.start_datetime).getTime();
        setBeforeFirstKickoff(Date.now() < first);
      } else {
        setBeforeFirstKickoff(false);
      }

      /** טעינת כל המשחקים לקביעת המחזור הקרוב שלא הושלם */
      const { data: allMatches } = await supabase
        .from('matches')
        .select('*')
        .order('matchday', { ascending: true });

      if (!allMatches || allMatches.length === 0) return;

      // מציאת המחזור הקרוב שלא הושלם
      const grouped: Record<number, Match[]> = {};
      allMatches.forEach((m) => {
        grouped[m.matchday] = grouped[m.matchday] || [];
        grouped[m.matchday].push(m);
      });

      let nextMatchdayMatches: Match[] = [];
      for (const md of Object.keys(grouped).map(Number).sort((a, b) => a - b)) {
        const allFinished = grouped[md].every(
          (m) => m.actual_home_score !== null && m.actual_away_score !== null
        );
        if (!allFinished) {
          nextMatchdayMatches = grouped[md];
          break;
        }
      }
      if (nextMatchdayMatches.length === 0) return;
      setMatches(nextMatchdayMatches);

      // נעילה: 90 דקות לפני המשחק הראשון במחזור
      const firstGame = [...nextMatchdayMatches].sort(
        (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      )[0];
      const lock = new Date(new Date(firstGame.start_datetime).getTime() - 90 * 60 * 1000);
      setLockTime(lock);
      setIsMatchdayLocked(new Date() >= lock);

      // טעינת ניחושים קיימים למחזור
      const { data: existingPredictions } = await supabase
        .from('predictions')
        .select('match_id, predicted_home_score, predicted_away_score')
        .eq('user_id', user.id);

      const initial: Predictions = {};
      for (const m of nextMatchdayMatches) {
        initial[m.id] = { home: '', away: '' };
      }
      if (existingPredictions) {
        (existingPredictions as any[]).forEach((p) => {
          initial[p.match_id] = {
            home: p.predicted_home_score == null ? '' : String(p.predicted_home_score),
            away: p.predicted_away_score == null ? '' : String(p.predicted_away_score),
          };
        });
      }
      setPredictions(initial);

      // טעינת הימור אלופה קיים
      const { data: pickData } = await supabase
        .from('season_winner_picks')
        .select('team_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (pickData?.team_code) {
        setExistingChampionPick(pickData.team_code);
        setChampionPick(pickData.team_code);
      }
    };

    fetchInitialData();
  }, []);

  const handleChange = (matchId: number, field: 'home' | 'away', rawValue: string) => {
    const cleaned = sanitizeScoreInput(rawValue);
    setPredictions((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: cleaned },
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

  const saveChampionPick = async () => {
    if (!userId || !championPick) return;
    setIsSeasonPickSaving(true);
    const { error } = await supabase
      .from('season_winner_picks')
      .upsert({ user_id: userId, team_code: championPick }, { onConflict: 'user_id' });
    setIsSeasonPickSaving(false);
    if (error) {
      console.error('שגיאה בשמירת הימור אלופה:', error.message);
    } else {
      setExistingChampionPick(championPick);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">הימורים למחזור הקרוב</h1>

        {/* חלונית הימור אלופה — מופיעה רק לפני המשחק הראשון של העונה */}
        {beforeFirstKickoff && (
          <div className="mb-6 rounded-2xl border p-4 text-left">
            <h3 className="font-semibold mb-2">הימור אלופת העונה</h3>

            {existingChampionPick ? (
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={getLogoPathFromCode(existingChampionPick)}
                  alt={existingChampionPick}
                  className="w-6 h-6"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
                <span>
                  ההימור הנוכחי שלך: <b>{existingChampionPick}</b>
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-2">
                בחר/י אלופה לפני תחילת המשחק הראשון של העונה. לאחר מכן לא ניתן יהיה לבחור.
              </p>
            )}

            <div className="flex gap-3 items-center">
              <select
                className="border rounded-md px-3 py-2"
                value={championPick}
                onChange={(e) => setChampionPick(e.target.value)}
              >
                <option value="">בחר/י קבוצה...</option>
                {TEAM_OPTIONS.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>

              <button
                disabled={!championPick || isSeasonPickSaving}
                onClick={saveChampionPick}
                className="bg-gray-800 hover:bg-gray-900 text-white rounded px-4 py-2 disabled:opacity-50"
              >
                שמירה
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              ניתן לשנות עד תחילת המחזור הראשון .
            </p>
          </div>
        )}

        {/* הודעת נעילה למחזור */}
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
            const homeCode = getTeamCode(match.home_team);
            const awayCode = getTeamCode(match.away_team);

            return (
              <div key={match.id} className="mb-5 rounded-2xl border p-4">
                {/* תאריך/שעה */}
                <p className="text-xs text-gray-500 mb-2">
                  {new Date(match.start_datetime).toLocaleString('he-IL', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>

                {/* 3 עמודות: בית | VS | חוץ */}
                <div dir="ltr" className="grid grid-cols-3 items-center gap-3">
                  {/* בית */}
                  <div className="flex flex-col items-center gap-2">
                    <TeamBadge teamName={match.home_team} />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      disabled={isMatchdayLocked}
                      className={`border p-2 rounded w-16 text-center transition-all ${
                        isMatchdayLocked
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-white'
                      }`}
                      placeholder="בית"
                      value={p.home}
                      onChange={(e) => handleChange(match.id, 'home', e.target.value)}
                    />
                    <span className="text-xs text-gray-500">בית</span>
                  </div>

                  {/* VS */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 font-semibold">VS</span>
                  </div>

                  {/* חוץ */}
                  <div className="flex flex-col items-center gap-2">
                    <TeamBadge teamName={match.away_team} />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      disabled={isMatchdayLocked}
                      className={`border p-2 rounded w-16 text-center transition-all ${
                        isMatchdayLocked
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-white'
                      }`}
                      placeholder="חוץ"
                      value={p.away}
                      onChange={(e) => handleChange(match.id, 'away', e.target.value)}
                    />
                    <span className="text-xs text-gray-500">חוץ</span>
                  </div>
                </div>

                {/* שורת fallback/נגישות – תמיד קוד 3 אותיות */}
                <p className="mt-3 text-xs text-gray-600 tracking-wide">
                  {homeCode} <span className="text-gray-400">VS</span> {awayCode}
                </p>
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
