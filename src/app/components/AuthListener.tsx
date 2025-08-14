'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/auth/callback');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
