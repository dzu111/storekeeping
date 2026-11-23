'use client';

// apps/web/app/dashboard/DashboardCharts.tsx
// npm i recharts   (run inside apps/web)
//
// Usage in dashboard/page.tsx (inside the DASHBOARD tab, replacing the old bar blocks):
//   import DashboardCharts from './DashboardCharts';
//   <DashboardCharts refreshKey={requests.length} />
//
// It loads its own data from the dashboard_stats() RPC, so it does not depend on the
// 500-row requests list and stays correct as the data grows.

import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { createClient } from '../../lib/supabase/client';

type Stats = {
  monthly: { month: string; total: number; received: number; approved: number; pending: number; rejected: number; cancelled: number }[];
  status: { status: string; count: number }[];
  departments: { name: string; count: number }[];
  top_items: { name: string; qty: number }[];
  stock: { habis: number; rendah: number; cukup: number };
  avg_approval_hours: number | null;
  avg_collect_hours: number | null;
  discrepancy_open: number;
  discrepancy_resolved: number;
};

const STATUS_LABEL: Record<string, string> = {
  Pending: 'Menunggu', Approved: 'Diluluskan', Received: 'Diterima', Rejected: 'Ditolak', Cancelled: 'Dibatalkan',
};
const STATUS_COLOR: Record<string, string> = {
  Pending: '#2563eb', Approved: '#f59e0b', Received: '#16a34a', Rejected: '#dc2626', Cancelled: '#94a3b8',
};
const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
const monthLabel = (ym: string) => MONTHS[parseInt(ym.slice(5, 7), 10) - 1] ?? ym;
const hours = (h: number | null) => (h === null || h === undefined ? '-' : h < 48 ? `${h} jam` : `${Math.round(h / 24)} hari`);

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-white/70 p-6 shadow-sm ring-1 ring-white/60 ${className}`}>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-slate-500">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-3xl bg-white/70 p-5 shadow-sm ring-1 ring-white/60">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

const Empty = () => <p className="py-10 text-center text-sm text-slate-400">Tiada data untuk tempoh ini.</p>;

export default function DashboardCharts({ refreshKey = 0 }: { refreshKey?: number }) {
  const [months, setMonths] = useState(6);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('dashboard_stats', { p_months: months });
    if (error) setError(error.message);
    else { setStats(data as Stats); setError(''); }
  }, [months]);

  // reload when the range changes or when the dashboard receives live changes
  useEffect(() => { load(); }, [load, refreshKey]);

  if (error) return <p className="text-sm text-red-600">Gagal memuatkan carta: {error}</p>;
  if (!stats) return <p className="text-sm text-slate-400">Memuatkan carta...</p>;

  const monthly = stats.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const statusData = stats.status.map((s) => ({ name: STATUS_LABEL[s.status] ?? s.status, value: s.count, key: s.status }));
  const stockData = [
    { name: 'Habis', value: stats.stock.habis, color: '#dc2626' },
    { name: 'Rendah', value: stats.stock.rendah, color: '#f59e0b' },
    { name: 'Cukup', value: stats.stock.cukup, color: '#16a34a' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Analisis Permohonan</h2>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm"
        >
          <option value={3}>3 bulan</option>
          <option value={6}>6 bulan</option>
          <option value={12}>12 bulan</option>
        </select>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Purata masa kelulusan" value={hours(stats.avg_approval_hours)} tone="text-blue-600" />
        <Kpi label="Purata masa pengambilan" value={hours(stats.avg_collect_hours)} tone="text-amber-500" />
        <Kpi label="Perbezaan belum selesai" value={stats.discrepancy_open} tone={stats.discrepancy_open ? 'text-red-600' : 'text-green-600'} />
        <Kpi label="Perbezaan telah selesai" value={stats.discrepancy_resolved} tone="text-slate-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. trend */}
        <Card title="Trend Permohonan" subtitle="Bilangan permohonan setiap bulan mengikut status" className="lg:col-span-2">
          {monthly.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <Tooltip />
                <Legend />
                <Bar dataKey="received" name="Diterima" stackId="a" fill={STATUS_COLOR.Received} />
                <Bar dataKey="approved" name="Diluluskan" stackId="a" fill={STATUS_COLOR.Approved} />
                <Bar dataKey="pending" name="Menunggu" stackId="a" fill={STATUS_COLOR.Pending} />
                <Bar dataKey="rejected" name="Ditolak" stackId="a" fill={STATUS_COLOR.Rejected} />
                <Bar dataKey="cancelled" name="Dibatalkan" stackId="a" fill={STATUS_COLOR.Cancelled} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 2. status split */}
        <Card title="Status Permohonan" subtitle="Pecahan dalam tempoh dipilih">
          {statusData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {statusData.map((s) => <Cell key={s.key} fill={STATUS_COLOR[s.key] ?? '#94a3b8'} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 3. top items (from the ledger) */}
        <Card title="10 Item Paling Banyak Dikeluarkan" subtitle="Jumlah unit dikeluarkan (rekod lejar)" className="lg:col-span-2">
          {stats.top_items.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(240, stats.top_items.length * 32)}>
              <BarChart data={stats.top_items} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={170} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="qty" name="Unit" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* 4. stock health */}
        <Card title="Kesihatan Stok" subtitle="Bilangan item aktif mengikut paras stok">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stockData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {stockData.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* 5. by department */}
        <Card title="Permohonan Mengikut Jabatan" subtitle="Dalam tempoh dipilih" className="lg:col-span-3">
          {stats.departments.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(200, stats.departments.length * 34)}>
              <BarChart data={stats.departments} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={260} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Permohonan" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
