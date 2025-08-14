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
      <body className={inter.className}>
        <div className="relative min-h-screen pb-20">
          <UserAvatar />
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
