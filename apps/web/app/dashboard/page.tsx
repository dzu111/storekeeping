'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import ClockCard from './_components/ClockCard';
import MiniCalendar from './_components/MiniCalendar';
import ApprovalClient from './requests/[id]/ApprovalClient';

// ---------------------------------------------------------------------------
// Style tokens and icons
// ---------------------------------------------------------------------------
const glassPanel =
  'rounded-[32px] border border-white/70 bg-white/40 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(40,70,110,0.22)]';

const base = { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const IconDashboard = () => <svg className="h-5 w-5" {...base}><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const IconPermohonan = () => <svg className="h-5 w-5" {...base}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconSetting = () => <svg className="h-5 w-5" {...base}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>;
const IconLogout = () => <svg className="h-5 w-5" {...base}><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const IconChevron = () => (
  <svg className="mr-3 h-5 w-5 text-slate-400 transition-transform duration-300 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const KL_OFFSET = 8 * 60 * 60 * 1000;
const one = (v: any) => (Array.isArray(v) ? v[0] : v);
const fmtDate = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
    : '-';

const STATUS_LABEL: Record<string, string> = {
  Pending: 'Menunggu', Approved: 'Diluluskan', Rejected: 'Ditolak', Received: 'Telah Diterima', Cancelled: 'Dibatalkan',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SinglePageDashboard() {
  const [activeMenu, setActiveMenu] = useState<'DASHBOARD' | 'PERMOHONAN' | 'SETTING'>('DASHBOARD');
  const [requests, setRequests] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [officerName, setOfficerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [reqItems, setReqItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const supabase = createClient();

    // 1. Must be a logged-in, active Officer or Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/'; return; }

    const { data: me } = await supabase
      .from('users').select('full_name, role, is_active').eq('id', user.id).single();
    if (!me || me.is_active === false || !['Officer', 'Admin'].includes(me.role ?? '')) {
      await supabase.auth.signOut();
      window.location.href = '/';
      return;
    }
    setOfficerName(me.full_name ?? '');

    // 2. Data
    const [reqRes, stockRes] = await Promise.all([
      supabase
        .from('requests')
        .select('id, status, remarks, request_date, approved_at, received_at, requester:users!requests_user_id_fkey(full_name, jawatan), departments(name, department_code)')
        .order('request_date', { ascending: false })
        .limit(300),
      supabase
        .from('v_items_catalog')
        .select('id, name, item_code, unit, current_stock, minimum_stock, stock_status', { count: 'exact' })
        .in('stock_status', ['Habis', 'Stok Rendah'])
        .order('current_stock', { ascending: true })
        .limit(6),
    ]);

    if (reqRes.error) {
      console.error('requests:', reqRes.error);
      setLoadError(`Gagal memuatkan permohonan: ${reqRes.error.message}`);
    }
    if (stockRes.error) console.error('stock:', stockRes.error);

    setRequests(reqRes.data ?? []);
    setLowStock(stockRes.data ?? []);
    setLowStockCount(stockRes.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    window.location.href = '/';
  };

  const openRequestDetails = async (req: any) => {
    setSelectedReq(req);
    setReqItems([]);
    setItemsError('');
    setLoadingItems(true);

    const { data, error } = await createClient()
      .from('request_items')
      .select('id, item_id, qty_requested, qty_approved, items(name, item_code, unit, current_stock)')
      .eq('request_id', req.id)
      .order('id');

    if (error) {
      console.error('request_items:', error);
      setItemsError(`Gagal memuatkan senarai item: ${error.message}`);
    }
    setReqItems(data ?? []);
    setLoadingItems(false);
  };

  const backToList = () => { setSelectedReq(null); fetchData(); };

  const menuItems = [
    { id: 'DASHBOARD', label: 'Dashboard Utama', icon: <IconDashboard /> },
    { id: 'PERMOHONAN', label: 'Pengurusan Permohonan', icon: <IconPermohonan /> },
    { id: 'SETTING', label: 'Tetapan Sistem', icon: <IconSetting /> },
  ] as const;

  const pending = requests.filter((r) => r.status === 'Pending');
  const approved = requests.filter((r) => r.status === 'Approved');
  const received = requests.filter((r) => r.status === 'Received');
  const closedOther = requests.filter((r) => r.status === 'Rejected' || r.status === 'Cancelled');

  const markedDates = Array.from(
    new Set(pending.map((r) => new Date(new Date(r.request_date).getTime() + KL_OFFSET).toISOString().slice(0, 10)))
  );

  const deptCounts = requests.reduce((acc: Record<string, number>, r) => {
    const name = one(r.departments)?.name || 'Lain-lain';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxDept = chartData.length > 0 ? chartData[0][1] : 1;

  // Request row used by the three accordions
  const RequestRow = ({ req, label, primary }: { req: any; label: string; primary?: boolean }) => (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <p className="font-semibold text-[#111936]">{one(req.requester)?.full_name || 'Tidak Diketahui'}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          #{req.id} · {one(req.departments)?.department_code || one(req.departments)?.name || '-'} · {fmtDate(req.request_date)}
        </p>
      </div>
      <button
        onClick={() => openRequestDetails(req)}
        className={
          primary
            ? 'rounded-xl bg-[#111936] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800'
            : 'rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50'
        }
      >
        {label}
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="h-screen w-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,#ffffff_0%,#e8eef3_35%,#b3c3d1_100%)] p-4 lg:p-6">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between px-2">
          <p className="text-lg text-slate-500">
            Stor Pusat <span className="font-bold text-[#111936]">Sistem Tadbir MDR</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData()}
              className="rounded-full border border-white/70 bg-white/50 px-4 py-2 text-sm text-slate-500 backdrop-blur transition hover:bg-white/80"
            >
              Muat semula
            </button>
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-4 py-2 text-sm text-slate-500 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              {officerName ? `Pegawai: ${officerName}` : 'Log masuk sebagai Pegawai'}
            </div>
          </div>
        </div>

        <div className="grid h-[calc(100vh-85px)] grid-cols-[280px_1fr] gap-5 lg:grid-cols-[300px_1fr]">
          {/* ==================== LEFT ==================== */}
          <div className="no-scrollbar flex h-full flex-col gap-2 overflow-y-auto pb-2 pr-1">
            <section className={`${glassPanel} flex shrink-0 flex-col gap-1 p-2`}>
              {menuItems.map((item) => {
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveMenu(item.id); setSelectedReq(null); }}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[14px] font-medium transition-all lg:text-[15px] ${
                      isActive ? 'bg-[#111936] text-white shadow-lg shadow-[#111936]/20' : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
              <div className="my-1 border-t border-white/50" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[14px] font-medium text-rose-600 transition-all hover:bg-rose-50/50 lg:text-[15px]"
              >
                <IconLogout /> Log Keluar
              </button>
            </section>

            <div className="shrink-0 origin-top scale-95 transform"><ClockCard /></div>
            <div className="-mt-3 shrink-0 origin-top scale-95 transform"><MiniCalendar markedDates={markedDates} /></div>
          </div>

          {/* ==================== RIGHT ==================== */}
          <section className={`${glassPanel} relative h-full overflow-y-auto p-6 lg:p-8`}>
            {loading ? (
              <div className="flex h-full animate-pulse items-center justify-center font-medium text-slate-500">
                Menyegerakkan pangkalan data...
              </div>
            ) : (
              <>
                {loadError && (
                  <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{loadError}</div>
                )}

                {/* ----------------- DASHBOARD ----------------- */}
                {activeMenu === 'DASHBOARD' && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-[#111936]">Analisis & Prestasi Stor</h2>

                    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                      <div className="rounded-3xl border border-white/80 bg-white/60 p-5 shadow-sm">
                        <p className="mb-1 text-sm font-semibold text-slate-500">Menunggu Semakan</p>
                        <p className="text-3xl font-bold text-blue-600">{pending.length}</p>
                      </div>
                      <div className="rounded-3xl border border-white/80 bg-white/60 p-5 shadow-sm">
                        <p className="mb-1 text-sm font-semibold text-slate-500">Diluluskan (Belum Disahkan)</p>
                        <p className="text-3xl font-bold text-amber-500">{approved.length}</p>
                      </div>
                      <div className="rounded-3xl border border-white/80 bg-white/60 p-5 shadow-sm">
                        <p className="mb-1 text-sm font-semibold text-slate-500">Selesai (Diterima)</p>
                        <p className="text-3xl font-bold text-emerald-600">{received.length}</p>
                      </div>
                      <div className="rounded-3xl border border-rose-100 bg-rose-50/80 p-5 shadow-sm">
                        <p className="mb-1 text-sm font-semibold text-rose-600">Amaran Stok</p>
                        <p className="text-3xl font-bold text-rose-600">{lowStockCount}</p>
                      </div>
                    </div>

                    <div className="mb-6 rounded-3xl border border-white/70 bg-white/50 p-6 shadow-sm">
                      <h3 className="mb-6 text-lg font-semibold text-[#111936]">Permohonan Mengikut Jabatan</h3>
                      <div className="space-y-5">
                        {chartData.map(([dept, count]) => (
                          <div key={dept}>
                            <div className="mb-2 flex justify-between text-sm text-slate-600">
                              <span className="font-medium">{dept}</span>
                              <span className="font-bold text-[#111936]">{count} permohonan</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-200">
                              <div className="h-2.5 rounded-full bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${(count / maxDept) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                        {chartData.length === 0 && <p className="text-sm text-slate-400">Tiada rekod jabatan.</p>}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/70 bg-white/50 p-6 shadow-sm">
                      <h3 className="mb-4 text-lg font-semibold text-[#111936]">Item Perlu Perhatian</h3>
                      {lowStock.length === 0 ? (
                        <p className="text-sm text-slate-400">Semua baki stok mencukupi.</p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {lowStock.map((i) => (
                            <li key={i.id} className="flex items-center justify-between py-3">
                              <div>
                                <p className="text-sm font-semibold text-[#111936]">{i.name}</p>
                                <p className="text-xs text-slate-400">{i.item_code} · minimum {i.minimum_stock}</p>
                              </div>
                              <span className={`rounded-lg px-3 py-1 text-sm font-bold ${i.current_stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                {i.current_stock === 0 ? 'Habis' : `${i.current_stock} ${i.unit}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* ----------------- PERMOHONAN ----------------- */}
                {activeMenu === 'PERMOHONAN' && (
                  <div>
                    {selectedReq ? (
                      <div>
                        <button
                          onClick={backToList}
                          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[#111936]"
                        >
                          &larr; Kembali ke senarai permohonan
                        </button>

                        <div className="mb-6 flex flex-wrap items-center gap-8 rounded-3xl border border-white bg-white/70 p-6 shadow-sm">
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Pemohon</p>
                            <p className="text-lg font-bold text-[#111936]">{one(selectedReq.requester)?.full_name}</p>
                            <p className="text-xs text-slate-500">{one(selectedReq.requester)?.jawatan}</p>
                          </div>
                          <div className="border-l border-slate-300 pl-8">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Jabatan</p>
                            <p className="text-sm font-medium text-slate-700">{one(selectedReq.departments)?.name}</p>
                          </div>
                          <div className="border-l border-slate-300 pl-8">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarikh Mohon</p>
                            <p className="text-sm font-medium text-slate-700">{fmtDate(selectedReq.request_date)}</p>
                          </div>
                          <div className="border-l border-slate-300 pl-8">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                            <span className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                              {STATUS_LABEL[selectedReq.status] ?? selectedReq.status}
                            </span>
                          </div>
                          {selectedReq.remarks && (
                            <div className="w-full border-t border-slate-200 pt-3">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Catatan Pemohon</p>
                              <p className="text-sm text-slate-700">{selectedReq.remarks}</p>
                            </div>
                          )}
                        </div>

                        {itemsError && (
                          <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{itemsError}</div>
                        )}

                        {loadingItems ? (
                          <p className="animate-pulse py-10 text-center text-slate-400">Menyediakan borang KEW.PS-8...</p>
                        ) : (
                          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                            <ApprovalClient
                              key={selectedReq.id}
                              requestId={selectedReq.id}
                              status={selectedReq.status}
                              initialItems={reqItems}
                              onDone={backToList}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <h2 className="mb-6 text-2xl font-bold text-[#111936]">Pengurusan Permohonan</h2>

                        <details open className="group mb-4 rounded-3xl border border-white/70 bg-white/50 p-4 shadow-sm transition-all open:bg-white/80">
                          <summary className="flex cursor-pointer list-none items-center font-bold text-[#111936] outline-none [&::-webkit-details-marker]:hidden">
                            <IconChevron />
                            <span className="mr-3 text-[17px]">Menunggu Semakan</span>
                            <span className="rounded-lg bg-rose-100 px-2.5 py-0.5 text-sm font-bold text-rose-700">{pending.length}</span>
                          </summary>
                          <div className="mt-4 space-y-3 pl-2">
                            {[...pending].reverse().map((req) => (
                              <RequestRow key={req.id} req={req} label="Semak" primary />
                            ))}
                            {pending.length === 0 && <p className="ml-7 py-2 text-sm italic text-slate-500">Tiada permohonan baru menunggu kelulusan.</p>}
                          </div>
                        </details>

                        <details className="group mb-4 rounded-3xl border border-white/70 bg-white/50 p-4 shadow-sm transition-all open:bg-white/80">
                          <summary className="flex cursor-pointer list-none items-center font-bold text-[#111936] outline-none [&::-webkit-details-marker]:hidden">
                            <IconChevron />
                            <span className="mr-3 text-[17px]">Telah Diluluskan (Belum Disahkan Penerimaan)</span>
                            <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-700">{approved.length}</span>
                          </summary>
                          <div className="mt-4 space-y-3 pl-2">
                            {approved.map((req) => <RequestRow key={req.id} req={req} label="Lihat" />)}
                            {approved.length === 0 && <p className="ml-7 py-2 text-sm italic text-slate-500">Tiada permohonan menunggu pengesahan penerimaan.</p>}
                          </div>
                        </details>

                        <details className="group mb-4 rounded-3xl border border-white/70 bg-white/50 p-4 shadow-sm transition-all open:bg-white/80">
                          <summary className="flex cursor-pointer list-none items-center font-bold text-[#111936] outline-none [&::-webkit-details-marker]:hidden">
                            <IconChevron />
                            <span className="mr-3 text-[17px]">Selesai (Telah Diterima)</span>
                            <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-sm font-bold text-emerald-700">{received.length}</span>
                          </summary>
                          <div className="mt-4 space-y-3 pl-2">
                            {received.map((req) => <RequestRow key={req.id} req={req} label="Lihat" />)}
                            {received.length === 0 && <p className="ml-7 py-2 text-sm italic text-slate-500">Belum ada permohonan selesai.</p>}
                          </div>
                        </details>

                        <details className="group mb-4 rounded-3xl border border-white/70 bg-white/50 p-4 shadow-sm transition-all open:bg-white/80">
                          <summary className="flex cursor-pointer list-none items-center font-bold text-[#111936] outline-none [&::-webkit-details-marker]:hidden">
                            <IconChevron />
                            <span className="mr-3 text-[17px]">Ditolak / Dibatalkan</span>
                            <span className="rounded-lg bg-slate-200 px-2.5 py-0.5 text-sm font-bold text-slate-600">{closedOther.length}</span>
                          </summary>
                          <div className="mt-4 space-y-3 pl-2">
                            {closedOther.map((req) => <RequestRow key={req.id} req={req} label="Lihat" />)}
                            {closedOther.length === 0 && <p className="ml-7 py-2 text-sm italic text-slate-500">Tiada rekod.</p>}
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                )}

                {/* ----------------- SETTING ----------------- */}
                {activeMenu === 'SETTING' && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-[#111936]">Tetapan & Profil Pegawai</h2>
                    <div className="flex h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/30 text-slate-400">
                      <IconSetting />
                      <p className="mt-4 font-medium">Modul seterusnya akan dibina di fasa akan datang.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}