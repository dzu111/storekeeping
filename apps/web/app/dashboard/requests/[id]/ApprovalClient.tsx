'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { processRequest } from './action';
import { createClient } from '../../../../lib/supabase/client';

const glass =
  'rounded-[32px] border border-white/70 bg-white/40 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(40,70,110,0.22)]';

type ItemInfo = { name: string; item_code: string; current_stock: number; unit: string };
type Row = {
  id: number;
  item_id: number;
  qty_requested: number;
  qty_approved: number;
  note_officer?: string | null;
  qty_received?: number | null;
  note_receipt?: string | null;
  items: ItemInfo | ItemInfo[] | null;
};

export default function ApprovalClient({
  requestId,
  status,
  initialItems,
  onDone,
}: {
  requestId: number;
  status: string;
  initialItems: any[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const readOnly = status !== 'Pending';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // The officer signs the form by approving. Their saved digital signature (Tetapan > Profil)
  // is stamped on the form together with the date and time of approval.
  const [signature, setSignature] = useState<string | null | undefined>(undefined); // undefined = loading
  const [signerName, setSignerName] = useState('');
  useEffect(() => {
    if (readOnly) return;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setSignature(null);
      const { data } = await supabase.from('users').select('full_name, jawatan, signature_data').eq('id', user.id).single();
      setSignature(data?.signature_data || null);
      setSignerName([data?.full_name, data?.jawatan].filter(Boolean).join(' · '));
    })();
  }, [readOnly]);

  const [rows, setRows] = useState(() =>
    (initialItems as Row[]).map((r) => {
      const info = Array.isArray(r.items) ? r.items[0] : r.items;
      const stock = info?.current_stock ?? 0;
      const max = Math.min(r.qty_requested, stock);
      return {
        id: r.id,
        item_id: r.item_id,
        requested: r.qty_requested,
        stock,
        name: info?.name ?? 'Item tidak dijumpai',
        code: info?.item_code ?? '',
        unit: info?.unit ?? '',
        max,
        // Pending: start at the most that can be approved. Otherwise show what was approved.
        approved: readOnly ? r.qty_approved ?? 0 : max,
        note: r.note_officer ?? '',
        received: r.qty_received ?? 0,
        noteReceipt: r.note_receipt ?? '',
      };
    })
  );

  const setQty = (id: number, qty: number) =>
    setRows((rs) => rs.map((r) => (r.id === id && qty >= 0 && qty <= r.max ? { ...r, approved: qty } : r)));

  const setNote = (id: number, note: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, note } : r)));

  const totalApproved = rows.reduce((s, r) => s + r.approved, 0);
  const totalRequested = rows.reduce((s, r) => s + r.requested, 0);
  const isPartial = rows.some((r) => r.approved < r.requested);
  const allZero = totalApproved === 0;

  // Called after a successful approve or reject
  const finish = () => {
    if (onDone) onDone();            // used by the single-page dashboard
    else router.push('/dashboard');  // used by the standalone review page
  };

  const handleApprove = async () => {
    setError('');
    // KEW.PS-8: a reduced quantity must be explained in the Catatan column
    if (!signature) {
      setError('Tandatangan digital belum ditetapkan. Sila tetapkan di Tetapan Sistem > Profil sebelum meluluskan.');
      return;
    }
    const missing = rows.find((r) => r.approved < r.requested && !r.note.trim());
    if (missing) {
      setError(`Sila isi catatan bagi "${missing.name}" kerana kuantiti dikurangkan.`);
      return;
    }
    setLoading(true);
    const res = await processRequest(
      requestId,
      'Approved',
      rows.map((r) => ({ id: r.id, approved_qty: r.approved, note: r.note }))
    );
    if ('error' in res) {
      setError(res.error);
      setLoading(false);
      return;
    }
    finish();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Sila nyatakan sebab penolakan.');
      return;
    }
    setError('');
    setLoading(true);
    const res = await processRequest(requestId, 'Rejected', [], rejectReason);
    if ('error' in res) {
      setError(res.error);
      setLoading(false);
      return;
    }
    finish();
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
                  {status === 'Received' && <th className="pb-3 text-center">Diterima</th>}
                  <th className="pb-3 pl-3">Catatan</th>
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
                      {status === 'Received' && (
                        <td className="py-4 text-center">
                          <span className={`text-lg font-bold ${r.received < r.approved ? 'text-rose-600' : 'text-[#111936]'}`}>
                            {r.received}
                          </span>
                        </td>
                      )}
                      <td className="py-4 pl-3">
                        {readOnly ? (
                          <span className="text-xs text-slate-500">
                            {r.note || '-'}
                            {status === 'Received' && r.noteReceipt && (
                              <span className="mt-1 block font-semibold text-rose-600">Penerimaan: {r.noteReceipt}</span>
                            )}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={r.note}
                            disabled={loading}
                            onChange={(e) => setNote(r.id, e.target.value)}
                            placeholder={r.approved < r.requested ? 'Wajib: sebab dikurangkan' : 'Pilihan'}
                            className={`w-full min-w-[150px] rounded-lg border bg-white/70 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                              r.approved < r.requested && !r.note.trim() ? 'border-amber-400' : 'border-slate-200'
                            }`}
                          />
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
      <section className={`${glass} flex flex-col justify-between gap-4 p-6`}>
        <a
          href={`/dashboard/requests/${requestId}/kewps8`}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-2xl border border-slate-200 bg-white/70 py-3 text-center text-sm font-semibold text-[#111936] shadow-sm transition hover:bg-white"
        >
          Lihat / Cetak Borang KEW.PS-8
        </a>
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

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tandatangan Pegawai Pelulus</p>
              {signature === undefined ? (
                <p className="text-xs text-slate-400">Memuatkan...</p>
              ) : signature ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signature.startsWith('data:image') ? signature : `data:image/png;base64,${signature}`}
                    alt="Tandatangan"
                    className="h-12 object-contain"
                  />
                  <p className="mt-1 text-xs text-slate-500">{signerName}</p>
                  <p className="text-[11px] text-slate-400">Akan dicop pada borang bersama tarikh dan masa kelulusan.</p>
                </>
              ) : (
                <p className="text-xs font-semibold text-rose-600">
                  Belum ada tandatangan digital. Tetapkan di Tetapan Sistem &gt; Profil sebelum meluluskan.
                </p>
              )}
            </div>

            <button
              onClick={() => { setRejectMode(true); setError(''); }}
              disabled={loading}
              className="w-full rounded-2xl border-2 border-rose-200 bg-rose-50 py-3.5 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
            >
              Tolak Permohonan
            </button>

            <button
              onClick={handleApprove}
              disabled={loading || allZero || !signature}
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