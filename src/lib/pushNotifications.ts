import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { supabase } from './supabaseClient';

export async function requestNotificationPermission(userId: string) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('🔕 Notification permission denied by user');
    return;
  }

  try {
    const fcmToken = await getToken(messaging, {
      vapidKey: 'BItPWxp3aILCVg9sDQSKwOpw6CNKl6ikBn6Pb7iVvBirciYC_eac7Te6Not542dqd6FUErxTrw_SEXZgVPhFTxE',
    });

    if (!fcmToken) {
      console.warn('⚠️ No FCM token received');
      return;
    }

    console.log('✅ FCM Token:', fcmToken);

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) return;

    const { error } = await supabase
      .from('users')
      .update({ device_token: fcmToken })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error saving token to Supabase:', error.message);
    } else {
      console.log('📬 Token saved to Supabase successfully');
    }
  } catch (error) {
    console.error('❌ Failed to get FCM token:', error);
  }
}

export function listenToForegroundMessages() {
  onMessage(messaging, (payload) => {
    console.log('🔔 Notification received in foreground:', payload);
    const { title, body } = payload.notification || {};
    if (title && body) alert(`${title}\n${body}`);
  });
}
