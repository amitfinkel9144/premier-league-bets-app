'use client';

import { useEffect, useState } from 'react';
import { requestNotificationPermission, listenToForegroundMessages } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabaseClient';

export default function NotificationIndicator() {
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'default'>('default');

  useEffect(() => {
    const enableNotifications = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (typeof window !== 'undefined') {
        const permission = Notification.permission;
        setNotificationStatus(permission as 'granted' | 'denied' | 'default');

        if (permission === 'granted' && userId) {
          await requestNotificationPermission(userId);
          listenToForegroundMessages();
        }
      }
    };

    enableNotifications();
  }, []);

  return (
    <div style={{ position: 'absolute', top: 10, right: 10 }}>
      <div
        title={
          notificationStatus === 'granted'
            ? 'התראות מופעלות'
            : notificationStatus === 'denied'
            ? 'התראות חסומות – ניתן לשנות בהגדרות הדפדפן'
            : 'ממתין לאישור התראות'
        }
      >
        🔔{' '}
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor:
              notificationStatus === 'granted'
                ? 'green'
                : notificationStatus === 'denied'
                ? 'gray'
                : 'orange',
            marginLeft: 4,
          }}
        />
      </div>
    </div>
  );
}
