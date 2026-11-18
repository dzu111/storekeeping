import { connection } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import Link from 'next/link';

export default async function AllRequestsPage() {
  await connection(); // Elakkan prerender crash
  const supabase = await createClient();

  // Tarik semua rekod permohonan
  const { data: requests, error } = await supabase
    .from('requests')
    .select(`
      id, 
      request_date, 
      status, 
      requester:users!requests_user_id_fkey(full_name), 
      departments(name)
    `)
    .order('request_date', { ascending: false });

  if (error) {
    console.error('Ralat memuatkan senarai permohonan:', error.message);
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-blue-100 text-blue-700';
      case 'Approved':
        return 'bg-amber-100 text-amber-700';
      case 'Received':
        return 'bg-emerald-100 text-emerald-700';
      case 'Rejected':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Pending': return 'Menunggu Semakan';
      case 'Approved': return 'Belum Diambil (Lulus)';
      case 'Received': return 'Selesai (Diterima)';
      case 'Rejected': return 'Ditolak';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,#ffffff_0%,#e8eef3_35%,#b3c3d1_100%)] p-5 lg:p-10">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#111936] transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Kembali ke Dashboard Utama
          </Link>
          <h1 className="text-2xl font-semibold text-[#111936]">Senarai Penuh Permohonan</h1>
        </div>

        {/* Table Container */}
        <div className="rounded-[32px] border border-white/70 bg-white/40 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(40,70,110,0.22)] p-6 lg:p-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-white/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-4">No. Ref</th>
                  <th className="pb-4">Tarikh Permohonan</th>
                  <th className="pb-4">Pemohon</th>
                  <th className="pb-4">Jabatan</th>
                  <th className="pb-4 text-center">Status</th>
                  <th className="pb-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {requests?.map((req: any) => {
                  const requester = Array.isArray(req.requester) ? req.requester[0] : req.requester;
                  const dept = Array.isArray(req.departments) ? req.departments[0] : req.departments;
                  
                  return (
                    <tr key={req.id} className="transition-colors hover:bg-white/30">
                      <td className="py-4 font-semibold text-[#111936]">KEW.PS-8 #{req.id}</td>
                      <td className="py-4">
                        {new Date(req.request_date).toLocaleDateString('ms-MY', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 font-medium">{requester?.full_name || '-'}</td>
                      <td className="py-4">{dept?.name || '-'}</td>
                      <td className="py-4 text-center">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(req.status)}`}>
                          {getStatusLabel(req.status)}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <Link 
                          href={`/dashboard/requests/${req.id}`}
                          className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                          Lihat
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {(!requests || requests.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                      Tiada rekod permohonan ditemui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}