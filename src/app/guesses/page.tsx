// ✅ guesses/page.tsx – לוגואים + קודי 3 אותיות מיושרים (בית—חוץ, LTR), "תוצאה" מספר בלבד, נרמול מלא ל-NFO/וכו'
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

/** קודים קנוניים לפי קבצים שיש ב-/public/logos/<CODE>_logo.svg */
const CANONICAL_CODES = [
  'ARS','AVL','BHA','BOU','BRE','BUR','CHE','CRY','EVE','FUL',
  'LEE','LIV','MCI','MUN','NEW','NFO','SUN','TOT','WHU','WOL',
] as const;
type CanonicalCode = (typeof CANONICAL_CODES)[number];

/** מיפוי ״כינויים״/שמות → קוד קנוני (מתאים לשמות הקבצים) */
const TEAM_ALIASES: Record<string, CanonicalCode> = {
  // Big 6
  'Arsenal':'ARS','ARS':'ARS',
  'Chelsea':'CHE','CHE':'CHE',
  'Liverpool':'LIV','LIV':'LIV',
  'Manchester City':'MCI','Man City':'MCI','Man. City':'MCI','MCI':'MCI',
  'Manchester United':'MUN','Man United':'MUN','Man Utd':'MUN','MUN':'MUN','MAN':'MUN',
  'Tottenham Hotspur':'TOT','Tottenham':'TOT','Spurs':'TOT','SPU':'TOT','TOT':'TOT',

  // Others
  'Aston Villa':'AVL','AVL':'AVL',
  'Bournemouth':'BOU','BOU':'BOU',
  'Brentford':'BRE','BRE':'BRE',
  'Brighton':'BHA','Brighton & Hove Albion':'BHA','BHA':'BHA',
  'Burnley':'BUR','BUR':'BUR',
  'Crystal Palace':'CRY','CRY':'CRY',
  'Everton':'EVE','EVE':'EVE',
  'Fulham':'FUL','FUL':'FUL',
  'Leeds':'LEE','Leeds United':'LEE','LEE':'LEE',
  'Newcastle':'NEW','Newcastle United':'NEW','NEW':'NEW',

  // ✅ Nottingham Forest – מכסה כל הווריאציות
  'Nottingham Forest':'NFO','Nottm Forest':'NFO','Nott Forest':'NFO','Nottingham':'NFO',
  'NOT':'NFO','NOTT':'NFO','NOTTM':'NFO','NFO':'NFO',

  'Sunderland':'SUN','SUN':'SUN',
  'West Ham':'WHU','West Ham United':'WHU','WHU':'WHU',
  'Wolves':'WOL','Wolverhampton':'WOL','Wolverhampton Wanderers':'WOL','WOL':'WOL',
};

/** ממיר שם/קיצור לקוד קנוני; כולל תיקוני דפוסים לפני fallback */
function toTeamCode(name: string | null | undefined): string {
  if (!name) return '---';
  const raw = name.trim();

  // ניסיון ישיר (case-sensitive), ואז case-insensitive
  if (TEAM_ALIASES[raw]) return TEAM_ALIASES[raw];
  const aliasKey = Object.keys(TEAM_ALIASES).find(k => k.toLowerCase() === raw.toLowerCase());
  if (aliasKey) return TEAM_ALIASES[aliasKey];

  // ניקוי תווים לא-אותיות והפקת אותיות גדולות
  const letters = raw.replace(/[^A-Za-z]/g, '').toUpperCase();

  // ✅ תיקוני דפוסים לפני נפילה ל-fallback:
  if (letters.startsWith('NOT')) return 'NFO'; // כל וריאציה של נוטינגהאם
  if (letters === 'MAN') return 'MUN';        // מנ' יונייטד
  if (letters === 'SPU') return 'TOT';        // טוטנהאם

  // fallback כללי: שלוש אותיות ראשונות
  return letters.slice(0, 3).padEnd(3, '-');
}

/** נתיב ללוגו */
function teamLogoSrc(code: string) {
  return `/logos/${code}_logo.svg`; // למשל /public/logos/NFO_logo.svg
}

/** טיפוסי נתונים */
type GuessRow = {
  display_name: string;
  match_id: number;
  predicted_home_score: number;
  predicted_away_score: number;
  matchday: number;
};

type MatchMeta = {
  id: number;
  home_team: string;
  away_team: string;
  actual_home_score: number | null;
  actual_away_score: number | null;
  start_datetime?: string;
};

export default function GuessesPage() {
  const [guesses, setGuesses] = useState<GuessRow[]>([]);
  const [matchday, setMatchday] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [canShowGuesses, setCanShowGuesses] = useState<boolean>(false);
  const [lockTime, setLockTime] = useState<Date | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [matchesMeta, setMatchesMeta] = useState<MatchMeta[]>([]);

  /** קביעת מחזור נוכחי */
  useEffect(() => {
    const determineCurrentMatchday = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('matchday, start_datetime')
        .order('matchday', { ascending: true });

      if (!matches) return;

      const now = new Date();
      const grouped: Record<number, Date[]> = {};
      matches.forEach((m) => {
        grouped[m.matchday] = grouped[m.matchday] || [];
        grouped[m.matchday].push(new Date(m.start_datetime));
      });

      for (const md of Object.keys(grouped).map(Number).sort((a, b) => a - b)) {
        const allFinished = grouped[md].every((d) => now > d);
        if (!allFinished) { setMatchday(md); return; }
      }
      setMatchday(matches[matches.length - 1]?.matchday || 1);
    };
    determineCurrentMatchday();
  }, []);

  /** טעינת משחקים/הימורים/משתמשים למחזור */
  useEffect(() => {
    if (matchday === null) return;
    const load = async () => {
      setLoading(true);

      const { data: matches } = await supabase
        .from('matches')
        .select('id, home_team, away_team, actual_home_score, actual_away_score, start_datetime')
        .eq('matchday', matchday)
        .order('start_datetime', { ascending: true });

      setMatchesMeta((matches || []) as MatchMeta[]);

      const { data: gData } = await supabase
        .from('guesses_per_matchday')
        .select('display_name, match_id, predicted_home_score, predicted_away_score, matchday')
        .eq('matchday', matchday)
        .order('match_id', { ascending: true });

      setGuesses(gData || []);

      const { data: uData } = await supabase.from('users').select('display_name').order('display_name');
      setUsers((uData || []).map(u => u.display_name).filter(Boolean) as string[]);

      setLoading(false);
    };
    load();
  }, [matchday]);

  /** זמן נעילה (90 דק’ לפני המשחק הראשון במחזור) */
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
      setLockTime(matchDate);
      setCanShowGuesses(new Date() >= matchDate);
    };
    checkLockTime();
  }, [matchday]);

  /** עוזרים להצגה */
  const matchesById = useMemo(() => {
    const map: Record<number, MatchMeta> = {};
    for (const m of matchesMeta) map[m.id] = m;
    return map;
  }, [matchesMeta]);

  const actualScores = useMemo(() => {
    const map: Record<number, { home: number; away: number }> = {};
    matchesMeta.forEach(m => {
      if (m.actual_home_score !== null && m.actual_away_score !== null) {
        map[m.id] = { home: m.actual_home_score, away: m.actual_away_score };
      }
    });
    return map;
  }, [matchesMeta]);

  const highlightClass = (kind: 'exact' | 'tendency' | 'miss') => {
    switch (kind) {
      case 'exact':    return 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100';
      case 'tendency': return 'bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-100';
      default:         return 'bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const outcomeKind = (g: GuessRow): 'exact' | 'tendency' | 'miss' => {
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

  const matchIds = useMemo(() => matchesMeta.map(m => m.id), [matchesMeta]);

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
          <select className={selectBase} value={matchday ?? ''} onChange={(e) => setMatchday(Number(e.target.value))}>
            {[...Array(38)].map((_, i) => (<option key={i + 1} value={i + 1}>{i + 1}</option>))}
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
                  <th className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-gray-700 dark:text-gray-200 text-center">משחק</th>
                  <th className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-gray-700 dark:text-gray-200 text-center">תוצאה</th>
                  {users.map((user) => (
                    <th key={user} className="border border-gray-200 dark:border-gray-700 px-2 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                      {user}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {matchIds.map((matchId) => {
                  const meta = matchesById[matchId];
                  const homeCode = toTeamCode(meta?.home_team);
                  const awayCode = toTeamCode(meta?.away_team);
                  const actual = (meta.actual_home_score !== null && meta.actual_away_score !== null)
                    ? { home: meta.actual_home_score as number, away: meta.actual_away_score as number }
                    : null;

                  return (
                    <tr key={matchId}>
                      {/* משחק – בית—חוץ (לוגו + קוד), שמאל→ימין */}
                      <td className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-center text-gray-900 dark:text-gray-100">
                        <div dir="ltr" className="inline-flex items-center justify-center gap-3">
                          <span className="inline-flex items-center gap-1.5">
                            <img
                              src={teamLogoSrc(homeCode)}
                              alt={homeCode}
                              className="h-5 w-5 object-contain"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                            />
                            <span className="font-medium">{homeCode}</span>
                          </span>
                          <span>—</span>
                          <span className="inline-flex items-center gap-1.5">
                            <img
                              src={teamLogoSrc(awayCode)}
                              alt={awayCode}
                              className="h-5 w-5 object-contain"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                            />
                            <span className="font-medium">{awayCode}</span>
                          </span>
                        </div>
                      </td>

                      {/* תוצאה בפועל – מספרים בלבד (בית—חוץ), LTR */}
                      <td className="border border-gray-200 dark:border-gray-700 px-2 py-2 text-center font-semibold text-gray-900 dark:text-gray-100">
                        {actual ? <span dir="ltr">{actual.home} - {actual.away}</span> : '?'}
                      </td>

                      {/* הימורי משתמשים – תמיד בית—חוץ, LTR */}
                      {users.map((user) => {
                        const g = guesses.find((x) => x.display_name === user && x.match_id === matchId);
                        if (!g) {
                          return (
                            <td key={user} className={`border border-gray-200 dark:border-gray-700 px-2 py-2 text-center ${highlightClass('miss')}`}>
                              <span className="text-red-600 dark:text-red-400 font-bold">-</span>
                            </td>
                          );
                        }
                        const kind = outcomeKind(g);
                        return (
                          <td key={user} className={`border border-gray-200 dark:border-gray-700 px-2 py-2 text-center ${highlightClass(kind)}`}>
                            <span dir="ltr">{g.predicted_home_score} - {g.predicted_away_score}</span>
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
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring focus:ring-blue-500/30">
              חזרה למסך הבית
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
