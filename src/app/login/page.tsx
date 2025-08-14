// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      setMessage('אנא הזן כתובת מייל תקינה');
      return;
    }

    setMessage('שולח לינק...');

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setMessage('שגיאה: ' + error.message);
    } else {
      setMessage('קישור נשלח למייל! תבדוק את תיבת הדואר שלך.');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-6">🔐 התחברות</h1>
        <input
          type="email"
          placeholder="הכנס מייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-4 text-right"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          התחבר
        </button>
        {message && <p className="mt-4 text-gray-700">{message}</p>}
      </div>
    </main>
  );
}
