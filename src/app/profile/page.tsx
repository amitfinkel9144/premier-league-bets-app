'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        router.push('/login');
        return;
      }

      setEmail(user.email || '');

      const { data } = await supabase
        .from('users')
        .select('display_name, phone_number')
        .eq('email', user.email)
        .maybeSingle();

      if (data?.display_name) setDisplayName(data.display_name);
      if (data?.phone_number) setPhoneNumber(data.phone_number);
    };

    fetchUser();
  }, [router]);

  const saveProfile = async () => {
    if (!email) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        display_name: displayName,
        phone_number: phoneNumber,
      })
      .eq('email', email);
    setSaving(false);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert(error.message);
    }
  };

  const inputBase =
    'w-full mt-1 p-2 rounded text-right border bg-white text-gray-900 border-gray-300 ' +
    'focus:outline-none focus:ring focus:ring-blue-500/30 ' +
    'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:placeholder-gray-500 ' +
    'dark:focus:ring-blue-400/30';

  const cardBase =
    'bg-white dark:bg-gray-900 shadow-lg rounded-xl p-8 max-w-md w-full text-center ' +
    'border border-gray-200 dark:border-gray-700';

  const primaryBtn =
    'bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-bold w-full ' +
    'focus:outline-none focus:ring focus:ring-blue-500/30 disabled:opacity-50';

  const secondaryBtn =
    'bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded ' +
    'focus:outline-none focus:ring focus:ring-blue-500/30';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-8">
      <div className={cardBase}>
        <h1 className="text-2xl font-bold mb-4">👤 פרופיל אישי</h1>

        <label className="block mb-4 text-right text-gray-800 dark:text-gray-200">
          שם תצוגה:
          <input
            className={inputBase}
            type="text"
            value={displayName}
            placeholder="איך שנראה בלוח התוצאות"
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

        <label className="block mb-4 text-right text-gray-800 dark:text-gray-200">
          מספר טלפון:
          <input
            className={inputBase}
            type="tel"
            inputMode="tel"
            placeholder="05XXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </label>

        <button
          className={primaryBtn}
          onClick={saveProfile}
          disabled={saving}
        >
          {saving ? 'שומר…' : 'שמור'}
        </button>

        {saved && (
          <p className="mt-4 text-green-600 dark:text-green-400">✅ נשמר בהצלחה!</p>
        )}

        <div className="mt-6 text-center">
          <Link href="/submit">
            <button className={secondaryBtn}>
              חזרה למסך הבית
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
