'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ← תקן כאן את הנתיב
import { useRouter } from 'next/navigation';

export default function UserAvatar() {
  const [initial, setInitial] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const email = session?.user?.email || '';
      setInitial(email.charAt(0).toUpperCase());
    };

    getUser();
  }, []);

  return (
    <div
      className="absolute top-4 left-4 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold cursor-pointer"
      onClick={() => router.push('/profile')}
      title="פרופיל אישי"
    >
      {initial}
    </div>
  );
}
