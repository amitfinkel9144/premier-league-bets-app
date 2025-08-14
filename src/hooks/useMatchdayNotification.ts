// ✅ קובץ: src/hooks/useMatchdayNotification.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useMatchdayNotification() {
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const fetchNotification = async () => {
      const now = new Date();

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('matchday_id', { ascending: true });

      if (error || !data) return;

      for (const notif of data) {
        const notifTime = new Date(notif.remind_at);
        if (now >= notifTime) {
          setMessage(notif.message);
          break;
        }
      }
    };

    fetchNotification();
  }, []);

  return message;
}
