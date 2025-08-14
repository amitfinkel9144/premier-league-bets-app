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
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
    const { error } = await supabase
      .from('users')
      .update({
        display_name: displayName,
        phone_number: phoneNumber,
      })
      .eq('email', email);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">👤 פרופיל אישי</h1>

        <label className="block mb-4 text-right">
          שם תצוגה:
          <input
            className="w-full mt-1 p-2 border rounded text-right"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

        <label className="block mb-4 text-right">
          מספר טלפון:
          <input
            className="w-full mt-1 p-2 border rounded text-right"
            type="tel"
            placeholder="05XXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </label>

        <button
          className="bg-blue-600 text-white py-2 px-4 rounded font-bold hover:bg-blue-700 w-full"
          onClick={saveProfile}
        >
          שמור
        </button>

        {saved && <p className="mt-4 text-green-600">✅ נשמר בהצלחה!</p>}

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
