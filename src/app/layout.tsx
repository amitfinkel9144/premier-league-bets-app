// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import BottomNav from './components/BottomNav';
import UserAvatar from './components/UserAvatar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Premier League Bets',
  description: 'הימורי פרמייר ליג עם חברים',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* מכבד העדפת מערכת ומונע ניגודיות לא תקינה */}
        <meta name="color-scheme" content="light dark" />
        {/* מניעת הבזק לפני שה-React נטען: קובע class=dark לפי localStorage/מערכת */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = saved ? saved === 'dark' : prefersDark;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
            `.trim(),
          }}
        />
      </head>

      {/* בסיס טיפוגרפיה + צבעים לשני המצבים */}
      <body
        className={
          [
            inter.className,
            'bg-white text-gray-900',
            'dark:bg-gray-950 dark:text-gray-100',
          ].join(' ')
        }
      >
        <div className="relative min-h-screen pb-20">
          <UserAvatar />
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
