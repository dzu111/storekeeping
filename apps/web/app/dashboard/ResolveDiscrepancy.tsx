'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

// Officer closes a "Perbezaan Penerimaan" (user received less than approved).
//  - RETURN_TO_STOCK : the missing units are still in the store -> they go back into stock
//  - WRITE_OFF       : the missing units are gone (lost/damaged) -> stock stays deducted
// Both need a note, and both are logged by the database function.
export default function ResolveDiscrepancy({
  requestId,
  onDone,
}: {
  requestId: number;
  onDone: (action: 'RETURN_TO_STOCK' | 'WRITE_OFF') => void;
}) {
  const [action, setAction] = useState<'RETURN_TO_STOCK' | 'WRITE_OFF'>('RETURN_TO_STOCK');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!note.trim()) {
      setError('Sila isi catatan penyelesaian.');
      return;
    }
    setError('');
    setLoading(true);
    const { error } = await createClient().rpc('resolve_discrepancy', {
      p_request_id: requestId,
      p_action: action,
      p_note: note.trim(),
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone(action);
  };

  const opt = (value: 'RETURN_TO_STOCK' | 'WRITE_OFF', title: string, desc: string) => (
    <label
      className={`flex cursor-pointer gap-3 rounded-2xl border p-3 text-sm transition ${
        action === value ? 'border-amber-500 bg-white' : 'border-amber-200 bg-white/50'
      }`}
    >
      <input type="radio" name="resolve" checked={action === value} onChange={() => setAction(value)} className="mt-1" />
      <span>
        <span className="block font-bold text-[#111936]">{title}</span>
        <span className="block text-xs text-slate-600">{desc}</span>
      </span>
    </label>
  );

  return (
    <div className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <p className="mb-3 text-sm font-bold text-amber-900">Selesaikan Perbezaan</p>
      <div className="grid gap-2 md:grid-cols-2">
        {opt('RETURN_TO_STOCK', 'Barang masih di stor', 'Kuantiti yang tidak diterima dipulangkan ke baki stok.')}
        {opt('WRITE_OFF', 'Hilang / rosak', 'Stok kekal ditolak. Hanya direkodkan sebagai selesai.')}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Catatan penyelesaian (wajib)..."
        className="mt-3 w-full rounded-xl border border-amber-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="mt-3 rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? 'Memproses...' : 'Tandakan Selesai'}
      </button>
    </div>
  );
}
