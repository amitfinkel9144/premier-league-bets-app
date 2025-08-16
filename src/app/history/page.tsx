'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  user_id: string;
  display_name: string;
  titles_count: number;
  seasons: string[] | null;
};

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from('v_titles_by_user')
        .select('*');
      if (error) setErr(error.message);
      else setRows((data || []) as Row[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto text-right" dir="rtl">
      <header className="mb-6">
        <h1 className="text-2xl text-center font-bold"> היסטוריית אליפויות 📜</h1>
      </header>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900/40 shadow-sm">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-lg text-center font-semibold">אליפויות</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100/60 dark:bg-gray-900/60">
              <tr className="text-gray-700 dark:text-gray-300">
                <th className="px-4 py-3 text-right w-[40%]">שם המתמודד</th>
                <th className="px-4 py-3 text-right w-[15%]">כמות זכיות</th>
                <th className="px-4 py-3 text-right">שנות הזכייה</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    טוען נתונים…
                  </td>
                </tr>
              )}

              {!loading && err && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-red-600">
                    שגיאה בטעינה: {err}
                  </td>
                </tr>
              )}

              {!loading && !err && rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    אין עדיין זכיות להציג
                  </td>
                </tr>
              )}

              {!loading && !err && rows.map((r) => (
                <tr key={r.user_id} className="border-t border-gray-200 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium">{r.display_name}</td>
                  <td className="px-4 py-3">{r.titles_count}</td>
                  <td className="px-4 py-3">
                    {(r.seasons ?? []).length > 0 ? (r.seasons ?? []).join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
