import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '../../../../../lib/supabase/server'; // 5 levels up for this deep route
import PrintClient from './PrintClient';

// KEW.PS-8 print page. All data comes from ONE database function (get_kewps8), which only
// lets the request owner or an officer/admin read it. The form itself is drawn by
// lib/kewps8Html.ts, the same file the mobile app can use.
export default async function KewPS8PrintPage({ params }: { params: Promise<{ id: string }> }) {
  await cookies(); // Prevent Next.js build crash
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) redirect('/dashboard');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data, error } = await supabase.rpc('get_kewps8', { p_request_id: requestId });
  if (error || !data) {
    console.error('get_kewps8:', error?.message);
    redirect('/dashboard');
  }

  return <PrintClient requestId={requestId} data={data} />;
}
