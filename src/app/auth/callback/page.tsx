// 2. src/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;
      const userEmail = user?.email;

      if (!userEmail) {
        router.push('/login');
        return;
      }

      const { data: authorized } = await supabase
        .from('authorized_emails')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (!authorized) {
        await supabase.auth.signOut();
        router.push('/login?unauthorized=true');
        return;
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (!existingUser) {
        const { error } = await supabase.from('users').insert({
          email: userEmail,
        });

        if (error) console.error('שגיאה בהוספת משתמש ל-users:', error.message);
      }

      router.push('/');
    };

    checkUser();
  }, [router]);

  return (
    <div className="p-10 text-center">
      <h1 className="text-xl font-bold">מתחבר...</h1>
    </div>
  );
}
