import { Suspense } from 'react';
import { connection } from 'next/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import ApprovalClient from './ApprovalClient';

const glassPanel =
  'rounded-[32px] border border-white/70 bg-white/40 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(40,70,110,0.22)]';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  Pending: { text: 'Menunggu', cls: 'bg-amber-100/80 text-amber-700' },
  Approved: { text: 'Diluluskan', cls: 'bg-sky-100/80 text-sky-700' },
  Rejected: { text: 'Ditolak', cls: 'bg-rose-100/80 text-rose-700' },
  Received: { text: 'Telah Diterima', cls: 'bg-emerald-100/80 text-emerald-700' },
  Cancelled: { text: 'Dibatalkan', cls: 'bg-slate-200/80 text-slate-600' },
};

// ---------------------------------------------------------------------------
// Page shell (static). Everything that reads data is inside <Suspense>.
// ---------------------------------------------------------------------------
export default function RequestReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,#ffffff_0%,#e8eef3_35%,#b3c3d1_100%)] p-5 lg:p-10">
      <div className="mx-auto max-w-5xl">
        <Suspense fallback={<ReviewSkeleton />}>
          <ReviewContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live content
// ---------------------------------------------------------------------------
async function ReviewContent({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // dynamic: must come before params, dates and queries

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) redirect('/dashboard');

  const supabase = await createClient();

  const [reqRes, itemsRes] = await Promise.all([
    supabase
      .from('requests')
      .select(
        `id, status, remarks, reject_reason, request_date,
         requester:users!requests_user_id_fkey (full_name, jawatan),
         departments (name, department_code)`
      )
      .eq('id', requestId)
      .single(),

    supabase
      .from('request_items')
      .select('id, item_id, qty_requested, qty_approved, items (name, item_code, current_stock, unit)')
      .eq('request_id', requestId)
      .order('id'),
  ]);

  if (reqRes.error || !reqRes.data) {
    console.error('Review page: request', reqRes.error?.message);
    redirect('/dashboard');
  }
  if (itemsRes.error) console.error('Review page: items', itemsRes.error.message);

  const request: any = reqRes.data;
  const requester = Array.isArray(request.requester) ? request.requester[0] : request.requester;
  const dept = Array.isArray(request.departments) ? request.departments[0] : request.departments;
  const status = STATUS_LABEL[request.status] ?? { text: request.status, cls: 'bg-slate-200 text-slate-600' };

  const requestedAt = request.request_date
    ? new Intl.DateTimeFormat('ms-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date(request.request_date))
    : '-';

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#111936]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali
        </Link>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}>{status.text}</span>
          <div className="rounded-full border border-white/70 bg-white/50 px-4 py-1.5 text-sm font-bold text-[#111936] backdrop-blur">
            KEW.PS-8 #{request.id}
          </div>
        </div>
      </div>

      <section className={`${glassPanel} mb-6 grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4`}>
        <Info label="Pemohon" value={requester?.full_name} />
        <Info label="Jawatan" value={requester?.jawatan} />
        <Info label="Bahagian / Jabatan" value={dept?.name} />
        <Info label="Tarikh Mohon" value={requestedAt} />
        {request.remarks && (
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Catatan Pemohon</p>
            <p className="mt-1 text-sm text-slate-700">{request.remarks}</p>
          </div>
        )}
        {request.status === 'Rejected' && request.reject_reason && (
          <div className="sm:col-span-2 lg:col-span-4 rounded-2xl bg-rose-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">Sebab Penolakan</p>
            <p className="mt-1 text-sm text-rose-700">{request.reject_reason}</p>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ApprovalClient
          requestId={requestId}
          status={request.status}
          initialItems={itemsRes.data ?? []}
        />
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111936]">{value || '-'}</p>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <>
      <div className="mb-6 h-8 w-40 animate-pulse rounded-full bg-white/50" />
      <div className={`${glassPanel} mb-6 h-28 animate-pulse`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className={`${glassPanel} h-80 animate-pulse`} />
        <div className={`${glassPanel} h-80 animate-pulse`} />
      </div>
    </>
  );
}