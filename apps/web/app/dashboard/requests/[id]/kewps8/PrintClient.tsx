'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { buildKewps8Html, type Kewps8Data } from '../../../../../lib/kewps8Html';

export default function PrintClient({ requestId, data }: { requestId: number; data: Kewps8Data }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState('230mm');
  const html = buildKewps8Html(data);

  // size the preview to the form (a long request runs onto a second page)
  const fit = () => {
    const doc = frameRef.current?.contentDocument;
    if (doc?.body) setHeight(`${doc.body.scrollHeight + 60}px`);
  };

  const print = () => {
    frameRef.current?.contentWindow?.focus();
    frameRef.current?.contentWindow?.print();
  };

  const stage =
    data.status === 'Received' ? 'Lengkap (telah diterima)'
    : data.status === 'Approved' ? 'Telah diluluskan, menunggu pengesahan penerimaan'
    : data.status === 'Pending' ? 'Menunggu kelulusan'
    : data.status === 'Rejected' ? 'Ditolak'
    : 'Dibatalkan';

  return (
    <div className="min-h-screen bg-gray-200 p-6 print:p-0">
      <div className="mx-auto mb-4 flex max-w-[297mm] items-center justify-between print:hidden">
        <Link
          href={`/dashboard/requests/${requestId}`}
          className="rounded-xl bg-slate-800 px-5 py-2.5 font-semibold text-white shadow-lg transition hover:bg-slate-700"
        >
          Kembali
        </Link>
        <p className="text-sm font-medium text-slate-600">
          Permohonan #{requestId} · {stage}
        </p>
        <button
          type="button"
          onClick={print}
          className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-lg transition hover:bg-blue-700"
        >
          Cetak / Simpan PDF
        </button>
      </div>

      <iframe
        ref={frameRef}
        title={`KEW.PS-8 #${requestId}`}
        srcDoc={html}
        onLoad={fit}
        style={{ height }}
        className="mx-auto block w-[297mm] max-w-full border-0 bg-white shadow-2xl"
      />
      <p className="mx-auto mt-3 max-w-[297mm] text-center text-xs text-slate-500 print:hidden">
        Pilih saiz kertas A4 (landskap). Kotak No. BPSI dibiarkan kosong untuk ditulis tangan oleh Admin.
      </p>
    </div>
  );
}
