// ✅ קובץ: src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useMatchdayNotification } from '@/hooks/useMatchdayNotification';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const router = useRouter();
  const message = useMatchdayNotification();
  const [showFullNotification, setShowFullNotification] = useState(false);

  usePushNotifications();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user || !session.user.email) {
        router.push('/login');
        return;
      }

      setEmail(session.user.email);
    };

    fetchUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getInitial = (email: string) => email.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center relative">
        <img
          src="/images/logo.jpeg"
          alt="Logo"
          className="w-24 h-24 mx-auto mb-4 rounded-full shadow"
        />

        {/* 🔔 אינדיקטור התראה */}
        <div
          className="absolute top-4 left-4 cursor-pointer"
          onClick={() => setShowFullNotification(!showFullNotification)}
        >
          <div className="relative">
            <span className="text-2xl">🔔</span>
            {message && (
              <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-600"></span>
            )}
          </div>
        </div>

        {/* 🟡 עיגול פרופיל */}
        {email && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow">
            {getInitial(email)}
          </div>
        )}

        {showFullNotification && message && (
          <div className="absolute top-16 left-4 bg-yellow-100 border border-yellow-400 text-red-800 px-4 py-2 rounded shadow-md text-sm">
            {message}
          </div>
        )}

        <h1 className="text-3xl font-bold mb-2">Welcome</h1>
        <p className="text-gray-600 mb-6">{email}</p>

        <div className="flex flex-col gap-4 text-right">
          <a href="/submit">
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
              שליחת ניחושים
            </button>
          </a>
          <a href="/results">
            <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
              תוצאות העונה
            </button>
          </a>
          <a href="/leaderboard">
            <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded">
              טבלת ניקוד
            </button>
          </a>
          <a href="/guesses">
            <button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded">
              הימורים לפי מחזור
            </button>
          </a>
        </div>

        <button
          onClick={handleSignOut}
          className="mt-8 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded w-full"
        >
          התנתקות
        </button>
      </div>
    </main>
  );
}
