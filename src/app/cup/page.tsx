// ✅ /app/cup/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SEMI_FINAL_MATCHDAYS = [8, 14, 21, 27];
const FINAL_MATCHDAYS = [30, 35, 38];

type DrawState = {
  semiFinal1: [string, string];
  semiFinal2: [string, string];
};

type WinnersState = {
  semi1?: string | null;
  semi2?: string | null;
  final?: string | null;
};

type CupDrawRow = {
  match_type: 'semi_1' | 'semi_2' | 'final';
  users1?: { display_name?: string | null } | null;
  users2?: { display_name?: string | null } | null;
  winner?: { display_name?: string | null } | null;
};

export default function CupPage() {
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [winners, setWinners] = useState<WinnersState>({});
  const supabase = createClientComponentClient();
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    const fetchDraw = async () => {
      const { data, error } = await supabase
        .from('cup_draw')
        .select(
          'match_type, users1:user1_id(display_name), users2:user2_id(display_name), winner:winner_id(display_name)'
        );

      if (error) {
        console.error('cup_draw fetch error:', error.message);
        return;
      }
      const rows = (data ?? []) as CupDrawRow[];

      const semi1 = rows.find((d) => d.match_type === 'semi_1');
      const semi2 = rows.find((d) => d.match_type === 'semi_2');
      const final = rows.find((d) => d.match_type === 'final');

      setDraw({
        semiFinal1: [
          semi1?.users1?.display_name || '',
          semi1?.users2?.display_name || '',
        ],
        semiFinal2: [
          semi2?.users1?.display_name || '',
          semi2?.users2?.display_name || '',
        ],
      });

      setWinners({
        semi1: semi1?.winner?.display_name || null,
        semi2: semi2?.winner?.display_name || null,
        final: final?.winner?.display_name || null,
      });
    };

    fetchDraw();
  }, [supabase]);

  const handleDraw = async () => {
    const res = await fetch('/api/draw-cup', {
      method: 'POST',
      body: JSON.stringify({ matchdayId: SEMI_FINAL_MATCHDAYS[0] }),
    });
    if (res.ok) router.refresh();
    else alert('ההגרלה נכשלה');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-xl font-semibold mb-2 text-center">גביע הליגה 🏆</h1>
      <p className="text-sm text-gray-600 mb-6 text-center">
        ארבעה מתחרים. שני חצאי גמר (מחזורים {SEMI_FINAL_MATCHDAYS.join(', ')}). גמר ({FINAL_MATCHDAYS.join(', ')}). תואר אחד.
      </p>

      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white border rounded-md p-2 w-32 text-center shadow-sm">
              {draw?.semiFinal1?.[0] || '—'}
            </div>
            <div className="bg-white border rounded-md p-2 w-32 text-center shadow-sm">
              {draw?.semiFinal1?.[1] || '—'}
            </div>
            <div className="text-sm text-gray-500 mt-1">חצי גמר 1</div>
            {winners.semi1 && (
              <div className="text-xs text-green-600">מנצח: {winners.semi1}</div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="bg-white border rounded-md p-2 w-32 text-center shadow-sm">
              {draw?.semiFinal2?.[0] || '—'}
            </div>
            <div className="bg-white border rounded-md p-2 w-32 text-center shadow-sm">
              {draw?.semiFinal2?.[1] || '—'}
            </div>
            <div className="text-sm text-gray-500 mt-1">חצי גמר 2</div>
            {winners.semi2 && (
              <div className="text-xs text-green-600">מנצח: {winners.semi2}</div>
            )}
          </div>
        </div>

        <div className="text-2xl">⬇️</div>

        <div className="bg-yellow-100 border border-yellow-300 rounded-md p-2 w-40 text-center shadow">
          גמר: מנצח 1 נגד מנצח 2
        </div>

        <div className="text-4xl mt-4">🏆</div>
        <div className="text-sm text-gray-600">
          הזוכה בגביע: {winners.final || '—'}
        </div>

        <Link
          href="/submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-6"
        >
          חזרה למסך הבית
        </Link>

        {user?.email === 'amit9144@gmail.com' && (
          <button
            onClick={handleDraw}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            בצע הגרלת גביע
          </button>
        )}
      </div>
    </div>
  );
}
