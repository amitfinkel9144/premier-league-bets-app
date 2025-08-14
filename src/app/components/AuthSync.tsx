'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthSync() {
  useEffect(() => {
    const syncUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) return;

      const { email, user_metadata, id } = user;
      const displayName = user_metadata?.display_name || user.user_metadata?.name || '';

      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('שגיאה בבדיקת משתמש קיים:', selectError.message);
        return;
      }

      if (!existingUser) {
        const { error: insertError } = await supabase.from('users').insert([
          {
            id,
            email,
            display_name: displayName,
          },
        ]);

        if (insertError) {
          console.error('שגיאה בהכנסת משתמש חדש:', insertError.message);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await supabase.auth.setSession(session);
      }
    });

    syncUser();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
