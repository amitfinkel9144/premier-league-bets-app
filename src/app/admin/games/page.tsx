// ✅ קובץ: src/app/guesses/page.tsx (תיקון לשימוש ב-start_datetime)
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function GuessesPage() {
  const [guesses, setGuesses] = useState<any[]>([])
  const [matchday, setMatchday] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [canShowGuesses, setCanShowGuesses] = useState<boolean>(false)
  const [actualScores, setActualScores] = useState<Record<number, { home: number; away: number }>>({})

  useEffect(() => {
    const determineCurrentMatchday = async () => {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('matchday, start_datetime')
        .order('matchday', { ascending: true })

      if (error || !matches) return

      const now = new Date()
      const grouped: Record<number, Date[]> = {}

      matches.forEach((match) => {
        grouped[match.matchday] = grouped[match.matchday] || []
        grouped[match.matchday].push(new Date(match.start_datetime))
      })

      for (const md of Object.keys(grouped).map(Number).sort((a, b) => a - b)) {
        const allFinished = grouped[md].every((d) => now > d)
        if (!allFinished) {
          setMatchday(md)
          return
        }
      }

      setMatchday(matches[matches.length - 1]?.matchday || 1)
    }

    determineCurrentMatchday()
  }, [])

  useEffect(() => {
    if (matchday === null) return

    const fetchGuesses = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('guesses_per_matchday')
        .select('*')
        .eq('matchday', matchday)
        .order('match_id', { ascending: true })

      if (error) {
        console.error('שגיאה בשליפת הימורים:', error.message)
      } else {
        setGuesses(data || [])
      }

      setLoading(false)
    }

    const fetchActualScores = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('id, actual_home_score, actual_away_score')
        .eq('matchday', matchday)

      if (error || !data) return

      const scoreMap: Record<number, { home: number; away: number }> = {}
      data.forEach((m) => {
        if (m.actual_home_score !== null && m.actual_away_score !== null) {
          scoreMap[m.id] = { home: m.actual_home_score, away: m.actual_away_score }
        }
      })
      setActualScores(scoreMap)
    }

    fetchGuesses()
    fetchActualScores()
  }, [matchday])

  useEffect(() => {
    if (matchday === null) return

    const checkLockTime = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('start_datetime')
        .eq('matchday', matchday)
        .order('start_datetime', { ascending: true })
        .limit(1)
        .single()

      if (error || !data?.start_datetime) return

      const matchDate = new Date(data.start_datetime)
      matchDate.setMinutes(matchDate.getMinutes() - 90)

      const now = new Date()
      setCanShowGuesses(now >= matchDate)
    }

    checkLockTime()
  }, [matchday])

  const getBoxStyle = (guess: any) => {
    const actual = actualScores[guess.match_id]
    if (!actual) return 'bg-white'

    const exact = actual.home === guess.predicted_home_score && actual.away === guess.predicted_away_score
    const tendency =
      (actual.home > actual.away && guess.predicted_home_score > guess.predicted_away_score) ||
      (actual.home < actual.away && guess.predicted_home_score < guess.predicted_away_score) ||
      (actual.home === actual.away && guess.predicted_home_score === guess.predicted_away_score)

    if (exact) return 'bg-green-100 border-green-400'
    if (tendency) return 'bg-yellow-100 border-yellow-400'
    return 'bg-white'
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-gray-100 px-4 py-10">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-3xl text-center">
        <img src="/images/logo.jpeg" alt="לוגו" className="w-20 h-20 mx-auto mb-4 rounded-full shadow" />
        <h1 className="text-2xl font-bold mb-4">הימורים למחזור {matchday ?? '...'}</h1>

        {matchday !== null && (
          <div className="mb-6">
            <label className="ml-2 font-semibold">בחר מחזור:</label>
            <select
              className="border px-3 py-1 rounded"
              value={matchday}
              onChange={(e) => setMatchday(Number(e.target.value))}
            >
              {[...Array(38)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
        )}

        {matchday === null ? (
          <p className="text-gray-600">טוען מחזור...</p>
        ) : !canShowGuesses ? (
          <p className="text-gray-600">
            ההימורים יוצגו שעה וחצי לפני פתיחת המשחק הראשון במחזור.
          </p>
        ) : loading ? (
          <p>טוען נתונים...</p>
        ) : guesses.length === 0 ? (
          <p>אין הימורים למחזור זה.</p>
        ) : (
          <div className="space-y-6 text-right">
            {[...new Set(guesses.map((g) => g.match_id))].map((matchId) => {
              const matchGuesses = guesses.filter((g) => g.match_id === matchId)
              const match = matchGuesses[0]

              return (
                <div key={matchId} className="border rounded-lg p-4 bg-gray-50">
                  <h2 className="font-semibold text-lg mb-3">
                    {match.home_team} - {match.away_team}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {matchGuesses.map((g) => (
                      <div
                        key={g.guess_id}
                        className={`shadow p-3 rounded border text-sm ${getBoxStyle(g)}`}
                      >
                        <div className="font-semibold text-blue-700">{g.display_name}</div>
                        <div className="text-gray-700">{g.predicted_home_score} : {g.predicted_away_score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-10">
          <Link href="/">
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
              חזרה לעמוד הבית
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}
