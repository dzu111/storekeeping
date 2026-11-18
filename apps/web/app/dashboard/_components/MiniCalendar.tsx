'use client';

import { useEffect, useState } from 'react';

const TZ = 'Asia/Kuala_Lumpur';
const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
const DAYS = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'];

function kualaLumpurToday() {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: get('year'), m: get('month') - 1, d: get('day') };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** markedDates: array of 'YYYY-MM-DD' (e.g. days that have pending requests) */
export default function MiniCalendar({ markedDates = [] }: { markedDates?: string[] }) {
  const [today, setToday] = useState<{ y: number; m: number; d: number } | null>(null);
  const [view, setView] = useState<{ y: number; m: number } | null>(null);

  useEffect(() => {
    const t = kualaLumpurToday();
    setToday(t);
    setView({ y: t.y, m: t.m });
  }, []);

  const shell =
    'rounded-3xl border border-white/80 bg-white/70 p-5 shadow-[0_8px_24px_-8px_rgba(40,70,110,0.18)]';

  if (!today || !view) return <div className={`${shell} h-[360px] animate-pulse`} />;

  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const daysInPrev = new Date(view.y, view.m, 0).getDate();

  const cells: { day: number; current: boolean; key: string }[] = [];
  for (let i = offset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false, key: `p${i}` });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true, key: `c${d}` });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length % 7 + 1, current: false, key: `n${cells.length}` });

  const move = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className={shell}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-base font-medium text-slate-600">
          {MONTHS[view.m]} {view.y}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => move(-1)} aria-label="Bulan sebelum"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/80">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button onClick={() => move(1)} aria-label="Bulan seterusnya"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/80">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {DAYS.map((d) => (
          <span key={d} className="pb-2 text-xs font-medium text-slate-400">{d}</span>
        ))}
        {cells.map((c) => {
          const iso = `${view.y}-${pad(view.m + 1)}-${pad(c.day)}`;
          const isToday = c.current && view.y === today.y && view.m === today.m && c.day === today.d;
          const marked = c.current && markedDates.includes(iso);
          return (
            <div key={c.key} className="flex justify-center">
              <span
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-sm ${
                  isToday
                    ? 'bg-[#111936] font-semibold text-white shadow-md'
                    : c.current
                    ? 'text-slate-700 hover:bg-white/80'
                    : 'text-slate-300'
                }`}
              >
                {c.day}
                {marked && (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isToday ? 'bg-white' : 'bg-amber-500'}`} />
                )}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setView({ y: today.y, m: today.m })}
        className="mt-3 w-full rounded-xl py-1.5 text-xs font-medium text-slate-500 hover:bg-white/70"
      >
        Hari ini
      </button>
    </div>
  );
}