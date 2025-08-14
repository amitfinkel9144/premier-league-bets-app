'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebaseClient';
import { supabase } from '@/lib/supabaseClient';

export function usePushNotifications() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const messaging = getMessaging(app);

    const registerForNotifications = async () => {
      try {
        // 1. רישום service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service worker registered:', registration);

        // 2. בקשת הרשאת התראות
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('🔕 Notification permission not granted');
          return;
        }

        // 3. בקשת Firebase Token
        const token = await getToken(messaging, {
          vapidKey: 'BItPWxp3aILCVg9sDQSKwOpw6CNKl6ikBn6Pb7iVvBirciYC_eac7Te6Not542dqd6FUErxTrw_SEXZgVPhFTxE',
          serviceWorkerRegistration: registration,
        });

        if (!token) {
          console.warn('⚠️ No FCM token received');
          return;
        }

        console.log('🔔 Firebase token:', token);

        // 4. שליפת מזהה המשתמש הנוכחי
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('❌ Failed to get Supabase session:', sessionError.message);
          return;
        }

        const userId = session?.user?.id;
        if (!userId) {
          console.warn('⚠️ No user ID available');
          return;
        }

        // 5. שמירת הטוקן לטבלת המשתמשים
        const { error: updateError } = await supabase
          .from('users')
          .update({ device_token: token })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Token save error:', updateError.message);
        } else {
          console.log('✅ Token saved to Supabase successfully');
        }
      } catch (err) {
        console.error('❌ Push notification setup failed:', err);
      }
    };

    registerForNotifications();

    // 6. האזנה להתראות כשהמשתמש נמצא בדפדפן (foreground)
    onMessage(messaging, (payload) => {
      console.log('📩 Message received:', payload);
      const { title, body } = payload.notification || {};
      if (title && body) alert(`${title}\n${body}`);
    });
  }, []);
}
