'use client';

import dynamic from 'next/dynamic';

// טוען את קומפוננטת ההתראות רק בצד הלקוח
const NotificationIndicator = dynamic(() => import('@/app/components/NotificationIndicator'), {
  ssr: false,
});

export default function ClientWrapper() {
  return <NotificationIndicator />;
}
