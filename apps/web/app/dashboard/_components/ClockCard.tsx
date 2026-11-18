'use client';

import { useEffect, useState } from 'react';

const TZ = 'Asia/Kuala_Lumpur';

function getTimeParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { h: get('hour') % 24, m: get('minute'), s: get('second') };
}

export default function ClockCard() {
  // Start empty and fill after mount, so the server never reads the current time
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const shell =
    'flex items-center gap-6 rounded-3xl border border-white/80 bg-white/70 p-5 shadow-[0_8px_24px_-8px_rgba(40,70,110,0.18)]';

  if (!now) {
    return (
      <div className={`${shell} h-[190px]`}>
        <div className="h-36 w-36 shrink-0 animate-pulse rounded-full bg-slate-200/60" />
        <div className="space-y-2">
          <div className="h-6 w-24 animate-pulse rounded bg-slate-200/60" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200/60" />
        </div>
      </div>
    );
  }

  const { h, m, s } = getTimeParts(now);
  const hourAngle = (h % 12) * 30 + m * 0.5;
  const minuteAngle = m * 6 + s * 0.1;
  const secondAngle = s * 6;

  const timeText = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(now).toLowerCase();

  const dateText = new Intl.DateTimeFormat('ms-MY', {
    timeZone: TZ, weekday: 'short', day: 'numeric', month: 'long',
  }).format(now);

  return (
    <div className={shell}>
      <svg viewBox="0 0 200 200" className="h-36 w-36 shrink-0">
        {/* ticks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const major = i % 5 === 0;
          return (
            <line
              key={i}
              x1="100" y1={major ? 10 : 12} x2="100" y2={major ? 20 : 16}
              stroke={major ? '#1c2540' : '#a9b6c6'}
              strokeWidth={major ? 2 : 1}
              strokeLinecap="round"
              transform={`rotate(${i * 6} 100 100)`}
            />
          );
        })}
        {/* hour hand */}
        <polygon
          points="100,52 104.5,100 100,108 95.5,100"
          fill="#111936"
          transform={`rotate(${hourAngle} 100 100)`}
        />
        {/* minute hand */}
        <polygon
          points="100,30 103.5,100 100,106 96.5,100"
          fill="#111936"
          transform={`rotate(${minuteAngle} 100 100)`}
        />
        {/* second hand */}
        <line
          x1="100" y1="112" x2="100" y2="34"
          stroke="#9fb0f5" strokeWidth="1.2" strokeLinecap="round"
          transform={`rotate(${secondAngle} 100 100)`}
        />
        <circle cx="100" cy="100" r="5" fill="#111936" />
        <circle cx="100" cy="100" r="1.8" fill="#fff" />
      </svg>

      <div>
        <p className="text-3xl font-semibold tracking-tight text-[#111936]">{timeText}</p>
        <p className="mt-1 text-sm text-slate-500">{dateText}</p>
      </div>
    </div>
  );
}