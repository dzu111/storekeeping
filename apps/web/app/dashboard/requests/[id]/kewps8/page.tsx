import { cookies } from 'next/headers';
import { createClient } from '../../../../../lib/supabase/server'; // 5 levels up for this deep route
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function KewPS8PrintPage({ params }: { params: Promise<{ id: string }> }) {
  await cookies(); // Prevent Next.js build crash
  const { id } = await params;
  const supabase = await createClient();

  const { data: request, error: reqError } = await supabase
    .from('requests')
    .select('*, requester:users!requests_user_id_fkey(full_name, jawatan), departments(name)')
    .eq('id', Number(id))
    .single();

  if (reqError || !request) redirect('/dashboard');

  const { data: requestItems } = await supabase
    .from('request_items')
    .select('id, quantity, approved_quantity, items(name, item_code, unit)')
    .eq('request_id', Number(id));

  const requester = Array.isArray(request.requester) ? request.requester[0] : request.requester;
  const dept = Array.isArray(request.departments) ? request.departments[0] : request.departments;
  
  // Format Date
  const dateObj = new Date(request.request_date);
  const formattedDate = dateObj.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-200 p-8 print:p-0 print:bg-white flex justify-center">
      
      {/* Floating Action Bar (Hidden when printing) */}
      <div className="fixed top-6 right-6 flex gap-4 print:hidden">
        <Link href={`/dashboard/requests/${id}`} className="px-6 py-2.5 bg-slate-800 text-white font-semibold rounded-xl shadow-lg hover:bg-slate-700 transition">
          Kembali
        </Link>
        <button type="button"
          className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition"
        >
          Cetak PDF
        </button>
      </div>

      {/* A4 Paper Container */}
      <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none p-12 text-black font-sans">
        
        {/* Document Header */}
        <div className="flex justify-between items-start mb-10">
          <div></div>
          <div className="text-right">
            <h1 className="font-bold text-xl uppercase">KEW.PS-8</h1>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="font-bold text-lg uppercase">Borang Permohonan Stok</h2>
          <h3 className="font-bold text-md uppercase">(Individu / Jabatan)</h3>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black mb-12 text-sm">
          <thead>
            <tr>
              <th className="border border-black p-2 w-12 text-center">Bil.</th>
              <th className="border border-black p-2 text-left">Perihal Stok</th>
              <th className="border border-black p-2 text-center w-32">Kuantiti Dimohon</th>
              <th className="border border-black p-2 text-center w-32">Kuantiti Diluluskan</th>
              <th className="border border-black p-2 text-left w-48">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {requestItems?.map((reqItem: any, index: number) => {
              const item = Array.isArray(reqItem.items) ? reqItem.items[0] : reqItem.items;
              return (
                <tr key={reqItem.id}>
                  <td className="border border-black p-2 text-center">{index + 1}</td>
                  <td className="border border-black p-2">
                    <span className="font-bold block">{item?.name}</span>
                    <span className="text-xs text-gray-600">{item?.item_code}</span>
                  </td>
                  <td className="border border-black p-2 text-center">{reqItem.quantity} {item?.unit}</td>
                  <td className="border border-black p-2 text-center">
                    {reqItem.approved_quantity !== null ? `${reqItem.approved_quantity} ${item?.unit}` : '-'}
                  </td>
                  <td className="border border-black p-2"></td>
                </tr>
              );
            })}
            
            {/* Fill empty rows to make it look like a standard form if items are few */}
            {Array.from({ length: Math.max(0, 5 - (requestItems?.length || 0)) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black p-2 h-10"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 text-sm mt-20">
          
          {/* Pemohon */}
          <div>
            <p className="mb-16 font-semibold">Tandatangan Pemohon :</p>
            <div className="border-b border-black w-full mb-2"></div>
            <p>Nama: <span className="font-semibold">{requester?.full_name}</span></p>
            <p>Jawatan: {requester?.jawatan || '.............................................'}</p>
            <p>Jabatan: {dept?.name}</p>
            <p>Tarikh: {formattedDate}</p>
          </div>

          {/* Pelulus (Only shows data if approved) */}
          <div>
            <p className="mb-16 font-semibold">Tandatangan Pegawai Pelulus :</p>
            <div className="border-b border-black w-full mb-2"></div>
            {request.status === 'Approved' || request.status === 'Received' ? (
              <>
                <p>Nama: <span className="font-semibold uppercase">Pegawai Stor Pusat</span></p>
                <p>Jawatan: Pegawai Tadbir</p>
                <p>Tarikh: {new Date(request.approved_at).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </>
            ) : (
              <>
                <p>Nama: .............................................</p>
                <p>Jawatan: ..........................................</p>
                <p>Tarikh: .............................................</p>
              </>
            )}
          </div>
          
        </div>
      </div>
      
      {/* Hack to enable onClick print without making this a Client Component */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelector('button').addEventListener('click', function() {
          window.print();
        });
      `}} />
    </div>
  );
}