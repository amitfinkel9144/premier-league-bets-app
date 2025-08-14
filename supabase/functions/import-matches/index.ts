// supabase/functions/import-matches/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const FOOTBALL_DATA_API_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function normalizeTeamName(name: string): string {
  const map: Record<string, string> = {
    'Liverpool FC': 'LIV',
    'Manchester City FC': 'M.CITY',
    'Manchester United FC': 'M.UTD',
    'Arsenal FC': 'ARS',
    'Chelsea FC': 'CHE',
    'Tottenham Hotspur FC': 'SPURS',
    'Everton FC': 'EVE',
    'Aston Villa FC': 'AVL',
    'Wolverhampton Wanderers FC': 'WOL',
    'Fulham FC': 'FUL',
    'Huddersfield Town AFC': 'HUD',
  }
  return map[name] || name
}

serve(async () => {
  const res = await fetch('https://api.football-data.org/v4/competitions/PL/matches?season=2025', {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
  })

  if (!res.ok) {
    return new Response(`API fetch failed: ${res.statusText}`, { status: 500 })
  }

  const data = await res.json()

  for (const match of data.matches) {
    const matchday = match.matchday
    const home = normalizeTeamName(match.homeTeam.name)
    const away = normalizeTeamName(match.awayTeam.name)
    const datetime = match.utcDate
    const homeScore = match.score.fullTime.home
    const awayScore = match.score.fullTime.away

    const { error } = await supabase.from('matches').upsert({
      matchday,
      home_team: home,
      away_team: away,
      start_datetime: datetime,
      actual_home_score: homeScore,
      actual_away_score: awayScore,
    }, {
      onConflict: 'matchday,home_team,away_team'
    })

    if (error) {
      console.error(`שגיאה בשמירת המשחק ${home} - ${away}: ${error.message}`)
    }
  }

  return new Response('✅ ייבוא הושלם')
})
