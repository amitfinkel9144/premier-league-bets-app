import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== 'amit9144@gmail.com') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  const { error } = await supabase.rpc('cup_draw_random');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.rpc('cup_recalc_all'); // חישוב ראשוני
  return NextResponse.json({ ok: true });
}
