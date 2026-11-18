'use client';

import { useState } from 'react';
import { processRequest } from './action';

const glass =
  'rounded-[32px] border border-white/70 bg-white/40 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(40,70,110,0.22)]';

type ItemInfo = { name: string; item_code: string; current_stock: number; unit: string };
type Row = {
  id: number;
  item_id: number;
  qty_requested: number;
  qty_approved: number;
  items: ItemInfo | ItemInfo[] | null;
};

export default function ApprovalClient({
  requestId,
  status,
  initialItems,
}: {
  requestId: number;
  status: string;
  initialItems: any[];
}) {
  const readOnly = status !== 'Pending';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [rows, setRows] = useState(() =>
    (initialItems as Row[]).map((r) => {
      const info = Array.isArray(r.items) ? r.items[0] : r.items;
      const max = Math.min(r.qty_requested, info?.current_stock ?? 0);
      return {
        id: r.id,
        item_id: r.item_id,
        requested: r.qty_requested,
        stock: info?.current_stock ?? 0,
        name: info?.name ?? 'Item tidak dijumpai',
        code: info?.item_code ?? '',
        unit: info?.unit ?? '',
        max,
        // while pending: start at the most that can be approved; otherwise show what was approved
        approved: readOnly ? r.qty_approved : max,
      };
    })
  );

  const setQty = (id: number, qty: number) =>
    setRows((rs) => rs.map((r) => (r.id === id && qty >= 0 && qty <= r.max ? { ...r, approved: qty } : r)));

  const totalApproved = rows.reduce((s, r) => s + r.approved, 0);
  const totalRequested = rows.reduce((s, r) => s + r.requested, 0);
  const isPartial = rows.some((r) => r.approved < r.requested);
  const allZero = totalApproved === 0;

  const handleApprove = async () => {
    setError('');
    setLoading(true);
    const res = await processRequest(
      requestId,
      'Approved',
      rows.map((r) => ({ id: r.id, approved_qty: r.approved }))
    );
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
    // on success the server action redirects to /dashboard
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return setError('Sila nyatakan sebab penolakan.');
    setError('');
    setLoading(true);
    const res = await processRequest(requestId, 'Rejected', [], rejectReason);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <>
      {/* ---------------- LEFT: items ---------------- */}
      <section className={`${glass} p-6 lg:p-8`}>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-medium text-[#111936]">Senarai Item</h2>
          <p className="text-sm text-slate-500">
            Diluluskan <span className="font-semibold text-[#111936]">{totalApproved}</span> / Dimohon {totalRequested} unit
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center font-medium text-slate-500">
            Tiada item ditemui untuk permohonan ini. Semak kebenaran (RLS) jadual request_items dan nama lajur
            (qty_requested, qty_approved).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-white/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3">Item</th>
                  <th className="pb-3 text-center">Dimohon</th>
                  <th className="pb-3 text-center">{readOnly ? 'Diluluskan' : 'Lulus'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {rows.map((r) => {
                  const short = r.stock < r.requested;
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-white/20">
                      <td className="py-4 pr-3">
                        <p className="font-semibold text-[#111936]">{r.name}</p>
                        <p className="text-xs text-slate-400">
                          {r.code} · Stok semasa {r.stock} {r.unit}
                        </p>
                        {!readOnly && short && (
                          <p className="mt-0.5 text-xs font-bold text-rose-500">
                            {r.stock === 0 ? 'Stok habis' : `Stok hanya ${r.stock}`}
                          </p>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        <span className="text-lg font-bold text-[#111936]">{r.requested}</span>
                      </td>
                      <td className="py-4 text-center">
                        {readOnly ? (
                          <span className="text-lg font-bold text-[#111936]">{r.approved}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              aria-label="Kurang"
                              disabled={loading || r.approved <= 0}
                              onClick={() => setQty(r.id, r.approved - 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-30"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-lg font-bold text-[#111936]">{r.approved}</span>
                            <button
                              type="button"
                              aria-label="Tambah"
                              disabled={loading || r.approved >= r.max}
                              onClick={() => setQty(r.id, r.approved + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------------- RIGHT: actions ---------------- */}
      <section className={`${glass} flex flex-col justify-between p-6`}>
        {readOnly ? (
          <div className="my-auto text-center text-sm text-slate-500">
            <p className="font-semibold text-[#111936]">Permohonan ini telah diproses.</p>
            <p className="mt-1">Tiada tindakan lanjut diperlukan di halaman ini.</p>
          </div>
        ) : rejectMode ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-rose-700">Tolak Permohonan</h3>
            <textarea
              className="w-full rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              rows={4}
              placeholder="Nyatakan sebab penolakan (akan dipaparkan kepada pemohon)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectMode(false); setError(''); }}
                disabled={loading}
                className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-300 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Sahkan Tolak'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto space-y-3">
            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-600">{error}</p>
            )}

            <button
              onClick={() => { setRejectMode(true); setError(''); }}
              disabled={loading}
              className="w-full rounded-2xl border-2 border-rose-200 bg-rose-50 py-3.5 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
            >
              Tolak Permohonan
            </button>

            <button
              onClick={handleApprove}
              disabled={loading || allZero}
              className={`w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 ${
                isPartial ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading ? 'Memproses...' : isPartial ? 'Lulus Sebahagian' : 'Luluskan Permohonan'}
            </button>

            {allZero && (
              <p className="text-center text-xs font-medium text-slate-500">
                Tiada kuantiti diluluskan. Gunakan “Tolak Permohonan”.
              </p>
            )}
            {isPartial && !allZero && (
              <p className="text-center text-xs font-medium text-amber-600">
                Kuantiti diluluskan kurang daripada yang dimohon.
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}