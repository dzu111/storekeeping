import { Suspense } from 'react';
import { connection } from 'next/server';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import ClockCard from './_components/ClockCard';
import MiniCalendar from './_components/MiniCalendar';

// ---------------------------------------------------------------------------
// Style tokens
// ---------------------------------------------------------------------------
const NAVY = '#111936';
const glassPanel =
  'rounded-[32px] border border-white/70 bg-white/40 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(40,70,110,0.22)]';
const hatch = {
  backgroundImage:
    'repeating-linear-gradient(135deg, rgba(110,135,165,0.10) 0, rgba(110,135,165,0.10) 2px, transparent 2px, transparent 7px)',
} as const;

// ---------------------------------------------------------------------------
// Waiting time (called only after connection(), so Date.now() is safe)
// ---------------------------------------------------------------------------
function getWaitingTime(requestDate: string) {
  const diff = Math.abs(Date.now() - new Date(requestDate).getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);

  if (days === 0) return { text: `${hours} jam`, color: 'bg-emerald-100/80 text-emerald-700' };
  if (days === 1) return { text: `1 hari ${hours} jam`, color: 'bg-amber-100/80 text-amber-700' };
  return { text: `${days} hari`, color: 'bg-rose-100/80 text-rose-700' };
}

// ---------------------------------------------------------------------------
// Page shell (static)
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,#ffffff_0%,#e8eef3_35%,#b3c3d1_100%)] p-5 lg:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-lg text-slate-500">
            Stor Pusat <span className="font-semibold text-[#111936]">Utama</span>
          </p>
          <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-4 py-2 text-sm text-slate-500 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Sistem sedang berjalan
          </div>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live content
// ---------------------------------------------------------------------------
async function DashboardContent() {
  await connection();
  const supabase = await createClient();

  const KL_OFFSET = 8 * 60 * 60 * 1000;
  const startOfTodayKL = new Date(Math.floor((Date.now() + KL_OFFSET) / 86400000) * 86400000 - KL_OFFSET);

  const [pendingRes, approvedTodayRes, awaitingRes, discrepancyRes, lowStockRes] = await Promise.all([
    supabase
      .from('requests')
      .select(
        `id, request_date, status,
         requester:users!requests_user_id_fkey (full_name),
         departments (name, department_code),
         request_items (id)`
      )
      .eq('status', 'Pending')
      .order('request_date', { ascending: true }),

    supabase.from('requests').select('*', { count: 'exact', head: true })
      .in('status', ['Approved', 'Received'])
      .gte('approved_at', startOfTodayKL.toISOString()),

    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),

    supabase.from('requests').select('*', { count: 'exact', head: true })
      .eq('has_discrepancy', true).is('discrepancy_resolved_at', null),

    supabase.from('v_items_catalog')
      .select('id, name, item_code, unit, current_stock, minimum_stock, stock_status')
      .in('stock_status', ['Habis', 'Stok Rendah'])
      .order('current_stock', { ascending: true })
      .limit(8),
  ]);

  if (pendingRes.error) console.error('Dashboard: pending requests', pendingRes.error.message);
  if (approvedTodayRes.error) console.error('Dashboard: approved today', approvedTodayRes.error.message);
  if (awaitingRes.error) console.error('Dashboard: awaiting', awaitingRes.error.message);
  if (lowStockRes.error) console.error('Dashboard: low stock', lowStockRes.error.message);

  const pending: any[] = pendingRes.data ?? [];
  const lowStock: any[] = lowStockRes.data ?? [];
  const pendingCount = pending.length;
  const approvedToday = approvedTodayRes.count ?? 0;
  const awaitingCount = awaitingRes.count ?? 0;
  const discrepancyCount = discrepancyRes.error ? 0 : discrepancyRes.count ?? 0;

  // Days (Malaysia time) that have pending requests, shown as dots on the calendar
  const markedDates = Array.from(
    new Set(pending.map((r) => new Date(new Date(r.request_date).getTime() + KL_OFFSET).toISOString().slice(0, 10)))
  );

  const oldest = pendingCount > 0 ? getWaitingTime(pending[0].request_date).text : null;

  const summaryRows = [
    { label: 'Menunggu Semakan', count: pendingCount, icon: <IconInbox />, href: '/dashboard/requests', tone: 'navy', active: true },
    { label: 'Diluluskan Hari Ini', count: approvedToday, icon: <IconCheck />, href: '/dashboard/requests', tone: 'green' },
    { label: 'Belum Diambil', count: awaitingCount, icon: <IconPackage />, href: '/dashboard/requests', tone: 'amber' },
    { label: 'Perbezaan Penerimaan', count: discrepancyCount, icon: <IconAlert />, href: '/dashboard/requests', tone: 'red' },
  ] as const;

  const pill: Record<string, string> = {
    navy: 'bg-[#dfe6f5] text-[#111936]',
    green: 'bg-emerald-100/80 text-emerald-700',
    amber: 'bg-amber-100/80 text-amber-700',
    red: 'bg-rose-100/80 text-rose-700',
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      {/* ------------------------------ LEFT: Ringkasan ------------------------------ */}
      <section className={`${glassPanel} p-6`}>
        <h2 className="mb-5 text-2xl font-medium text-[#111936]">Ringkasan</h2>

        <div className="space-y-1.5">
          {summaryRows.map((r) => (
            <Link
              key={r.label}
              href={r.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-slate-600 transition ${
                'active' in r && r.active
                  ? 'bg-white/80 shadow-[0_6px_18px_-8px_rgba(40,70,110,0.25)]'
                  : 'hover:bg-white/50'
              }`}
            >
              <span className="text-slate-500">{r.icon}</span>
              <span className="flex-1 text-[15px]">{r.label}</span>
              <span className={`min-w-[28px] rounded-lg px-2 py-0.5 text-center text-sm font-semibold ${pill[r.tone]}`}>
                {r.count}
              </span>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          <ClockCard />
          <MiniCalendar markedDates={markedDates} />
        </div>
      </section>

      {/* ------------------------------ RIGHT: Permohonan ------------------------------ */}
      <section className={`${glassPanel} p-6 lg:p-8`}>
        <h2 className="mb-5 text-2xl font-medium text-[#111936]">Permohonan</h2>

        <div className="mb-5 flex items-center gap-3 text-[#111936]">
          <IconList />
          <p className="text-lg">
            Semakan <span className="font-semibold">Menunggu</span>
            {oldest && <span className="ml-3 rounded-full bg-rose-100/80 px-3 py-0.5 text-xs font-medium text-rose-700">Paling lama: {oldest}</span>}
          </p>
        </div>

        <Link
          href="/dashboard/requests"
          className="mb-8 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/40 px-5 py-4 text-slate-500 transition hover:bg-white/70"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span className="flex-1">Buka senarai penuh permohonan</span>
          <span className="rounded-lg bg-white/80 px-2 py-0.5 text-xs">&rarr;</span>
        </Link>

        {/* Group: pending requests */}
        <details open className="group mb-8">
          <summary className="mb-3 flex cursor-pointer list-none items-center gap-3 text-slate-600 [&::-webkit-details-marker]:hidden">
            <Chevron />
            <span className="text-[17px]">Menunggu Semakan</span>
            <span className="rounded-lg bg-white/80 px-2 py-0.5 text-sm font-medium text-slate-500">{pendingCount}</span>
          </summary>

          {pendingCount > 0 ? (
            <ul className="space-y-3">
              {pending.map((req: any) => {
                const t = getWaitingTime(req.request_date);
                const requester = Array.isArray(req.requester) ? req.requester[0] : req.requester;
                const dept = Array.isArray(req.departments) ? req.departments[0] : req.departments;
                return (
                  <li
                    key={req.id}
                    style={hatch}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-3 shadow-[0_6px_16px_-10px_rgba(40,70,110,0.3)]"
                  >
                    <span className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 text-sm font-medium text-[#111936] shadow-sm">
                      <IconCheck small /> #{req.id}
                    </span>

                    <div className="min-w-[140px] flex-1">
                      <p className="truncate font-medium text-[#111936]">{requester?.full_name || 'Tidak Diketahui'}</p>
                      <p className="text-xs text-slate-400">
                        {dept?.department_code || dept?.name || '-'} · {req.request_items?.length || 0} item
                      </p>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${t.color}`}>{t.text}</span>

                    <Link
                      href={`/dashboard/requests/${req.id}`}
                      style={{ backgroundColor: NAVY }}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:opacity-90"
                    >
                      Semak
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300/70 bg-white/30 py-10 text-center text-slate-400">
              <IconCheck big />
              <p className="mt-2">Tiada permohonan menunggu semakan.</p>
            </div>
          )}
        </details>

        {/* Group: stock warning */}
        <details open className="group">
          <summary className="mb-3 flex cursor-pointer list-none items-center gap-3 text-slate-600 [&::-webkit-details-marker]:hidden">
            <Chevron />
            <span className="text-[17px]">Amaran Stok</span>
            <span className="rounded-lg bg-white/80 px-2 py-0.5 text-sm font-medium text-slate-500">{lowStock.length}</span>
          </summary>

          {lowStock.length > 0 ? (
            <ul className="space-y-3">
              {lowStock.map((item: any) => {
                const out = item.current_stock === 0;
                return (
                  <li
                    key={item.id}
                    style={hatch}
                    className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/50 px-4 py-3"
                  >
                    <span className="rounded-xl bg-white/90 px-3 py-1.5 text-sm font-medium text-[#111936] shadow-sm">
                      {item.item_code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#111936]">{item.name}</p>
                      <p className="text-xs text-slate-400">Minimum {item.minimum_stock}</p>
                    </div>
                    <span
                      className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                        out ? 'bg-rose-100/80 text-rose-700' : 'bg-amber-100/80 text-amber-700'
                      }`}
                    >
                      {out ? 'Habis' : item.current_stock}{' '}
                      {!out && <span className="text-[10px] font-normal">{item.unit}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300/70 bg-white/30 py-8 text-center text-slate-400">
              Semua baki stok mencukupi buat masa ini.
            </p>
          )}
        </details>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <div className={`${glassPanel} h-[720px] animate-pulse`} />
      <div className={`${glassPanel} h-[720px] animate-pulse`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons (thin line style)
// ---------------------------------------------------------------------------
const base = { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const IconInbox = () => (
  <svg className="h-6 w-6" {...base}><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.6a1 1 0 00-.7.3l-2.4 2.4a1 1 0 01-.7.3h-3.2a1 1 0 01-.7-.3l-2.4-2.4a1 1 0 00-.7-.3H4" /></svg>
);
const IconCheck = ({ small, big }: { small?: boolean; big?: boolean } = {}) => (
  <svg className={big ? 'mx-auto h-10 w-10 text-slate-300' : small ? 'h-4 w-4' : 'h-6 w-6'} {...base}>
    <circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </svg>
);
const IconPackage = () => (
  <svg className="h-6 w-6" {...base}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
);
const IconAlert = () => (
  <svg className="h-6 w-6" {...base}><path d="M12 9v4m0 3h.01M5.1 19h13.8c1.5 0 2.5-1.6 1.7-3L13.7 4.2c-.8-1.3-2.6-1.3-3.4 0L3.4 16c-.8 1.4.2 3 1.7 3z" /></svg>
);
const IconList = () => (
  <svg className="h-6 w-6" {...base}><path d="M10 6h10M10 12h10M10 18h10M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5" /></svg>
);
const Chevron = () => (
  <svg className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" {...base} strokeWidth={1.8}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);