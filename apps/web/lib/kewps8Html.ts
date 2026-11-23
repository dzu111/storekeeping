// kewps8Html.ts
// One pure function that turns the result of supabase.rpc('get_kewps8') into the
// KEW.PS-8 form (A4 landscape). No dependencies, so the SAME file is copied to:
//   apps/web/lib/kewps8Html.ts     -> print page  (window.print())
//   apps/mobile/lib/kewps8Html.ts  -> Print.printToFileAsync({ html })

export type Kewps8Line = {
  name: string;
  code?: string | null;
  qty_requested: number | null;
  note_requester?: string | null;
  stock_before?: number | null;
  qty_approved?: number | null;
  note_officer?: string | null;
  qty_received?: number | null;
  note_receipt?: string | null;
};

export type Kewps8Person = { name?: string | null; jawatan?: string | null; signature?: string | null };

export type Kewps8Data = {
  bpsi_no?: string | null; // handwritten by Admin on paper; the box stays empty unless this is set
  status: 'Pending' | 'Approved' | 'Received' | 'Rejected' | 'Cancelled' | string;
  request_date?: string | null;
  approved_at?: string | null;
  received_at?: string | null;
  requester: Kewps8Person;
  approver: Kewps8Person;
  lines: Kewps8Line[];
};

const MIN_ROWS = 9; // the paper form has 9 rows

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const num = (v: number | null | undefined): string => (v === null || v === undefined ? '' : String(v));

const p2 = (n: number) => String(n).padStart(2, '0');
const myt = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : new Date(t + 8 * 3600 * 1000); // read with getUTC* = Malaysia time
};

// 12.08.2026
const fmtDate = (iso?: string | null): string => {
  const d = myt(iso);
  return d ? `${p2(d.getUTCDate())}.${p2(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}` : '';
};

// 12.08.2026, 15:42
const fmtStamp = (iso?: string | null): string => {
  const d = myt(iso);
  return d ? `${fmtDate(iso)}, ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}` : '';
};

// signature_data may be a full data URL or a bare base64 PNG
const sigImg = (sig?: string | null): string => {
  if (!sig) return '';
  const src = sig.startsWith('data:image') ? sig : `data:image/png;base64,${sig}`;
  return `<img class="sig" src="${esc(src)}" />`;
};

function signBlock(label: string, p: Kewps8Person, iso: string | null | undefined, action: string, showSignature: boolean): string {
  const stamp = iso
    ? `<div class="stamp"><b>${esc(action)}</b><br />${esc(fmtStamp(iso))}</div>`
    : '';
  return `
    <td class="sign">
      <div class="sign-label">${esc(label)}</div>
      <div class="sign-space">${showSignature ? sigImg(p.signature) : ''}${stamp}</div>
      <div class="dots"></div>
      <table class="meta">
        <tr><td class="k">Nama</td><td>: ${esc(p.name)}</td></tr>
        <tr><td class="k">Jawatan</td><td>: ${esc(p.jawatan)}</td></tr>
        <tr><td class="k">Tarikh</td><td>: ${esc(fmtDate(iso))}</td></tr>
      </table>
    </td>`;
}

export function buildKewps8Html(d: Kewps8Data): string {
  const rows: string[] = [];
  const total = Math.max(MIN_ROWS, d.lines.length);

  for (let i = 0; i < total; i++) {
    const l = d.lines[i];
    rows.push(`
      <tr>
        <td class="c">${i + 1}.</td>
        <td class="name">${l ? esc(l.name) : ''}</td>
        <td class="c">${l ? num(l.qty_requested) : ''}</td>
        <td class="note">${l ? esc(l.note_requester) : ''}</td>
        <td class="c thick-l">${l ? num(l.stock_before) : ''}</td>
        <td class="c">${l ? num(l.qty_approved) : ''}</td>
        <td class="note">${l ? esc(l.note_officer) : ''}</td>
        <td class="c thick-l">${l ? num(l.qty_received) : ''}</td>
        <td class="note">${l ? esc(l.note_receipt) : ''}</td>
      </tr>`);
  }

  const approved = d.status === 'Approved' || d.status === 'Received';
  const received = d.status === 'Received';

  return `<!DOCTYPE html>
<html lang="ms"><head><meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 12mm 12mm 10mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; margin: 0; }
  .top { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 10mm; }
  .top .r { font-family: 'Times New Roman', serif; }
  .ref { text-align: right; font-weight: 700; margin-bottom: 1mm; }
  .ref .no { display: inline-block; margin-top: 1mm; }
  .ref .box { display: inline-block; width: 38mm; height: 13mm; border: 1px solid #000;
              vertical-align: bottom; margin-left: 2mm; padding: 2mm; font-size: 8pt; text-align: center;
              line-height: 9mm; }
  .title { text-align: center; font-weight: 700; font-size: 8.5pt; margin: -6mm 0 3mm; line-height: 1.25; }

  table.form { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.form th, table.form td { border: 1px solid #000; padding: 1.6mm 1.4mm; vertical-align: middle; }
  table.form thead { display: table-header-group; }
  table.form tr { page-break-inside: avoid; }
  .grp { background: #d9d9d9; text-align: center; font-weight: 700; font-size: 8.5pt; padding: 1.6mm; }
  .col { background: #e6e6e6; text-align: center; font-weight: 700; font-size: 8pt; }
  .thick-l { border-left: 2.5px solid #000 !important; }
  td.c { text-align: center; }
  td.name { text-transform: uppercase; }
  td.note { font-size: 8.5pt; }
  tbody td { height: 7.4mm; }

  table.signs { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: avoid; }
  table.signs > tbody > tr > td.sign { border: 1px solid #000; border-top: 0; padding: 2mm 2.4mm; width: 33.33%; vertical-align: top; }
  table.signs > tbody > tr > td.sign + td.sign { border-left: 2.5px solid #000; }
  .sign-label { font-weight: 700; }
  .sign-space { height: 14mm; text-align: left; position: relative; }
  .stamp { font-size: 7.5pt; line-height: 1.35; color: #1f2937; padding-top: 2mm; }
  .sig + .stamp { position: absolute; right: 0; top: 0; text-align: right; padding-top: 0; }
  .sig { max-height: 13mm; max-width: 60mm; }
  .dots { border-top: 1px dotted #000; margin-bottom: 2.5mm; width: 85%; }
  table.meta { border-collapse: collapse; width: 100%; }
  table.meta td { border: 0; padding: 0.6mm 0; font-weight: 700; text-transform: uppercase; }
  table.meta td.k { width: 17mm; text-transform: none; }
</style></head>
<body>
  <div class="top"><span class="r">Pekeliling Perbendaharaan Malaysia</span><span class="r">AM 6.5 Lampiran B</span></div>
  <div class="ref">KEW.PS-8<br /><span class="no">No. BPSI :</span><span class="box">${esc(d.bpsi_no)}</span></div>
  <div class="title">BORANG PERMOHONAN STOK<br />(INDIVIDU KEPADA STOR)</div>

  <table class="form">
    <colgroup>
      <col style="width:4.4%"/><col style="width:14.1%"/><col style="width:7.6%"/><col style="width:7.2%"/>
      <col style="width:8.1%"/><col style="width:9.1%"/><col style="width:16.2%"/>
      <col style="width:16.3%"/><col style="width:17%"/>
    </colgroup>
    <thead>
      <tr>
        <th class="grp" colspan="4">PERMOHONAN</th>
        <th class="grp thick-l" colspan="3">PEGAWAI PELULUS</th>
        <th class="grp thick-l" colspan="2">PERAKUAN PENERIMAAN</th>
      </tr>
      <tr>
        <th class="col">NO.<br />KOD</th><th class="col">PERIHAL STOK</th>
        <th class="col">KUANTITI<br />DIMOHON</th><th class="col">CATATAN</th>
        <th class="col thick-l">BAKI SEDIA<br />ADA</th><th class="col">KUANTITI<br />DILULUSKAN</th><th class="col">CATATAN</th>
        <th class="col thick-l">KUANTITI DITERIMA</th><th class="col">CATATAN</th>
      </tr>
    </thead>
    <tbody>${rows.join('')}</tbody>
  </table>

  <table class="signs"><tbody><tr>
    ${signBlock('Pemohon:', d.requester, d.request_date, 'Dihantar secara elektronik', false)}
    ${signBlock('Pegawai Pelulus:', approved ? d.approver : {}, approved ? d.approved_at : null, 'Diluluskan secara elektronik', true)}
    ${signBlock('Pemohon:', received ? d.requester : {}, received ? d.received_at : null, 'Diterima & disahkan secara elektronik', false)}
  </tr></tbody></table>
</body></html>`;
}
