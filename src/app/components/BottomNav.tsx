'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/submit', label: 'הימורים', emoji: '⚽️' },
  { href: '/results', label: 'תוצאות', emoji: '📊' },
  { href: '/leaderboard', label: 'טבלה', emoji: '🏅' },
  { href: '/guesses', label: 'לפי מחזור', emoji: '🗓️' },
  { href: '/cup', label: 'גביע', emoji: '🏆' }, // ← הוספה כאן
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 flex z-50">
      {navItems.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex-1 flex flex-col items-center justify-center py-2 text-xs ${
            index > 0 ? 'border-r border-gray-300' : ''
          } ${pathname === item.href ? 'text-blue-600 font-bold' : 'text-gray-600'}`}
        >
          <span>{item.emoji}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
