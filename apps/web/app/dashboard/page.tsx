'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import ClockCard from './_components/ClockCard';
import MiniCalendar from './_components/MiniCalendar';
import ApprovalClient from './requests/[id]/ApprovalClient';

// ---------------------------------------------------------------------------
// Style tokens and icons
// ---------------------------------------------------------------------------
const glassPanel =
  'rounded-[32px] border border-white/70 bg-white/40 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(40,70,110,0.22)]';

const base = {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const IconDashboard = () => (
  <svg className="h-5 w-5" {...base}>
    <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const IconPermohonan = () => (
  <svg className="h-5 w-5" {...base}>
    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconSetting = () => (
  <svg className="h-5 w-5" {...base}>
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconLogout = () => (
  <svg className="h-5 w-5" {...base}>
    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const IconBell = () => (
  <svg className="h-5 w-5" {...base}>
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const IconChevron = () => (
  <svg
    className="mr-3 h-5 w-5 text-slate-400 transition-transform duration-300 group-open:rotate-90"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// ---------------------------------------------------------------------------
// Reusable Signature Pad Component (Draw or Upload PNG/JPG)
// ---------------------------------------------------------------------------
function SignaturePad({
  value,
  onChange,
  label = 'Tandatangan Digital (Untuk Borang KEW.PS-8)',
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#111936';

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
  }, [value]);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    isDrawingRef.current = true;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange('');
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-600">{label}</label>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
            Muat Naik PNG/JPG
            <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={clearCanvas}
            className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            Padam Tandatangan
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          width={520}
          height={160}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          className="h-40 w-full cursor-crosshair touch-none"
        />
        {!value && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400">
            Lukis tandatangan anda di dalam kotak ini atau muat naik imej tandatangan
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const KL_OFFSET = 8 * 60 * 60 * 1000;
const one = (v: any) => (Array.isArray(v) ? v[0] : v);

const fmtDate = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat('ms-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(iso))
    : '-';

const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Intl.DateTimeFormat('ms-MY', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(iso))
    : '-';

const STATUS_LABEL: Record<string, string> = {
  Pending: 'Menunggu Semakan',
  Approved: 'Diluluskan',
  Rejected: 'Ditolak',
  Received: 'Telah Diterima',
  Cancelled: 'Dibatalkan',
};

const STATUS_BADGE_STYLE: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-blue-100 text-blue-800 border-blue-200',
  Rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  Received: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-slate-200 text-slate-700 border-slate-300',
};

const ACTION_BADGE: Record<string, { label: string; cls: string }> = {
  LOGIN: { label: 'Log Masuk', cls: 'bg-emerald-100 text-emerald-800' },
  LOGOUT: { label: 'Log Keluar', cls: 'bg-slate-200 text-slate-700' },
  VIEW_REQUEST: { label: 'Semak Permohonan', cls: 'bg-blue-100 text-blue-800' },
  UPDATE_PROFILE: { label: 'Kemaskini Profil', cls: 'bg-indigo-100 text-indigo-800' },
  OFFICER_HANDOVER: { label: 'Serah Tugas (KEW.PS-8)', cls: 'bg-amber-100 text-amber-800' },
  NOTIFICATION: { label: 'Notifikasi', cls: 'bg-purple-100 text-purple-800' },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SinglePageDashboard() {
  const [activeMenu, setActiveMenu] = useState<'DASHBOARD' | 'PERMOHONAN' | 'SETTING'>('DASHBOARD');
  const [requests, setRequests] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Officer Profile State
  const [officerId, setOfficerId] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [userRole, setUserRole] = useState('Officer');
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    staff_no: '',
    jawatan: '',
    phone: '',
    department_id: '',
    signature_data: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Officer Handover State
  const [handoverForm, setHandoverForm] = useState({
    new_full_name: '',
    new_staff_no: '',
    new_jawatan: '',
    new_phone: '',
    handover_note: '',
    new_signature_data: '',
  });
  const [savingHandover, setSavingHandover] = useState(false);
  const [handoverMsg, setHandoverMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Activity Logs State
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'AUTH' | 'REQUEST' | 'PROFILE'>('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Settings Sub-tab
  const [settingTab, setSettingTab] = useState<'PROFILE' | 'LOGS' | 'HANDOVER'>('PROFILE');

  // Permohonan Full List Filter & Search States
  const [reqViewMode, setReqViewMode] = useState<'FULL_LIST' | 'GROUPED'>('FULL_LIST');
  const [reqStatusFilter, setReqStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Received' | 'CLOSED'>('ALL');
  const [reqSearch, setReqSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [liveToast, setLiveToast] = useState<any | null>(null);

  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [reqItems, setReqItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState('');

  // Helper: Record officer activity log
  const logActivity = useCallback(
    async (actionType: string, description: string, overrideActorName?: string, overrideUserId?: string) => {
      try {
        const supabase = createClient();
        const uid = overrideUserId || officerId;
        const actor = overrideActorName || officerName || 'Pegawai Stor';
        if (!uid) return;

        await supabase.from('officer_activity_logs').insert({
          user_id: uid,
          actor_name: actor,
          action_type: actionType,
          description,
        });
      } catch (err) {
        console.error('Gagal merekod log aktiviti:', err);
      }
    },
    [officerId, officerName]
  );

  const fetchActivityLogs = useCallback(async () => {
    setLoadingLogs(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('officer_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      setActivityLogs(data);
    }
    setLoadingLogs(false);
  }, []);

  const fetchNotifications = useCallback(async (roleName: string) => {
    const supabase = createClient();
    const normalizedRole = roleName.toLowerCase() === 'admin' ? 'Admin' : 'Officer';
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_role', normalizedRole)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const supabase = createClient();

    // 1. Must be a logged-in, active Officer or Admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/';
      return;
    }

    const { data: me } = await supabase
      .from('users')
      .select('id, full_name, jawatan, role, is_active, department_id, staff_no, phone, signature_data')
      .eq('id', user.id)
      .single();

    if (!me || me.is_active === false || !['Officer', 'Admin', 'admin'].includes(me.role ?? '')) {
      await supabase.auth.signOut();
      window.location.href = '/';
      return;
    }

    setOfficerId(me.id);
    setOfficerEmail(user.email ?? '');
    setOfficerName(me.full_name ?? '');
    setUserRole(me.role ?? 'Officer');
    setProfileForm({
      full_name: me.full_name ?? '',
      staff_no: me.staff_no ?? '',
      jawatan: me.jawatan ?? '',
      phone: me.phone ?? '',
      department_id: me.department_id ? String(me.department_id) : '',
      signature_data: me.signature_data ?? '',
    });

    // Record LOGIN once per browser session
    if (typeof window !== 'undefined' && !sessionStorage.getItem(`mdr_login_logged_${user.id}`)) {
      sessionStorage.setItem(`mdr_login_logged_${user.id}`, '1');
      await supabase.from('officer_activity_logs').insert({
        user_id: me.id,
        actor_name: me.full_name ?? user.email ?? 'Pegawai',
        action_type: 'LOGIN',
        description: `Log masuk ke Sistem Tadbir Stor Pusat (${me.role ?? 'Officer'}).`,
      });
    }

    // 2. Fetch requests, departments, stock alerts & notifications
    const [reqRes, stockRes, deptRes] = await Promise.all([
      supabase
        .from('requests')
        .select(
          'id, status, remarks, has_discrepancy, discrepancy_note, request_date, approved_at, received_at, requester:users!requests_user_id_fkey(full_name, jawatan), departments(name, department_code)'
        )
        .order('request_date', { ascending: false })
        .limit(500),
      supabase
        .from('v_items_catalog')
        .select('id, name, item_code, unit, current_stock, minimum_stock, stock_status', { count: 'exact' })
        .in('stock_status', ['Habis', 'Stok Rendah'])
        .order('current_stock', { ascending: true })
        .limit(6),
      supabase.from('departments').select('id, name, department_code').order('name'),
    ]);

    await Promise.all([fetchNotifications(me.role ?? 'Officer'), fetchActivityLogs()]);

    if (reqRes.error) {
      console.error('requests:', reqRes.error);
      setLoadError(`Gagal memuatkan permohonan: ${reqRes.error.message}`);
    }
    if (stockRes.error) console.error('stock:', stockRes.error);

    setRequests(reqRes.data ?? []);
    setLowStock(stockRes.data ?? []);
    setLowStockCount(stockRes.count ?? 0);
    setDepartments(deptRes.data ?? []);
    setLoading(false);
  }, [fetchNotifications, fetchActivityLogs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close notification box on Escape key
  useEffect(() => {
    if (!notifOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [notifOpen]);

  // Real-time subscription for instant notifications when user verifies on mobile
  useEffect(() => {
    const supabase = createClient();
    const normalizedRole = userRole.toLowerCase() === 'admin' ? 'Admin' : 'Officer';

    const channel = supabase
      .channel('officer-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const newNotif = payload.new as any;
        if (newNotif.recipient_role === normalizedRole) {
          setNotifications((prev) => [newNotif, ...prev]);
          setLiveToast(newNotif);
          fetchData();
          setTimeout(() => setLiveToast(null), 8000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, fetchData]);

  const handleLogout = async () => {
    const supabase = createClient();
    await logActivity('LOGOUT', 'Log keluar daripada Sistem Tadbir Stor Pusat.');
    if (typeof window !== 'undefined' && officerId) {
      sessionStorage.removeItem(`mdr_login_logged_${officerId}`);
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const openRequestDetails = async (req: any) => {
    setSelectedReq(req);
    setReqItems([]);
    setItemsError('');
    setLoadingItems(true);

    logActivity(
      'VIEW_REQUEST',
      `Membuka rekod Permohonan #${req.id} oleh ${one(req.requester)?.full_name || 'Pemohon'} (${STATUS_LABEL[req.status] ?? req.status}).`
    );

    const { data, error } = await createClient()
      .from('request_items')
      .select('id, item_id, qty_requested, qty_approved, qty_received, items(name, item_code, unit, current_stock)')
      .eq('request_id', req.id)
      .order('id');

    if (error) {
      console.error('request_items:', error);
      setItemsError(`Gagal memuatkan senarai item: ${error.message}`);
    }
    setReqItems(data ?? []);
    setLoadingItems(false);
  };

  // Save Officer Profile & Digital Signature
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.full_name.trim()) {
      setProfileMsg({ type: 'err', text: 'Nama penuh pegawai wajib diisi.' });
      return;
    }

    setSavingProfile(true);
    setProfileMsg(null);
    const supabase = createClient();

    const updatePayload: any = {
      full_name: profileForm.full_name.trim(),
      staff_no: profileForm.staff_no.trim() || null,
      jawatan: profileForm.jawatan.trim() || null,
      phone: profileForm.phone.trim() || null,
      signature_data: profileForm.signature_data || null,
    };
    if (profileForm.department_id) {
      updatePayload.department_id = Number(profileForm.department_id);
    }

    const { error } = await supabase.from('users').update(updatePayload).eq('id', officerId);

    if (error) {
      setProfileMsg({ type: 'err', text: `Gagal menyimpan profil: ${error.message}` });
    } else {
      const updatedName = profileForm.full_name.trim();
      setOfficerName(updatedName);
      await logActivity(
        'UPDATE_PROFILE',
        `Mengemaskini maklumat profil pegawai & tandatangan digital KEW.PS-8 (${updatedName}).`,
        updatedName
      );
      await fetchActivityLogs();
      setProfileMsg({ type: 'ok', text: 'Profil pegawai dan tandatangan digital KEW.PS-8 berjaya disimpan.' });
    }
    setSavingProfile(false);
  };

  // Officer Handover (Updates profile & signature for KEW.PS-8 forms + logs audit trail)
  const handleOfficerHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverForm.new_full_name.trim() || !handoverForm.new_jawatan.trim()) {
      setHandoverMsg({ type: 'err', text: 'Sila isi Nama Penuh dan Jawatan pegawai baharu.' });
      return;
    }
    if (!handoverForm.new_signature_data) {
      setHandoverMsg({ type: 'err', text: 'Sila lengkapkan tandatangan digital pegawai baharu untuk borang KEW.PS-8.' });
      return;
    }

    setSavingHandover(true);
    setHandoverMsg(null);
    const supabase = createClient();

    const previousOfficer = officerName;
    const incomingOfficer = handoverForm.new_full_name.trim();

    const { error } = await supabase
      .from('users')
      .update({
        full_name: incomingOfficer,
        staff_no: handoverForm.new_staff_no.trim() || null,
        jawatan: handoverForm.new_jawatan.trim(),
        phone: handoverForm.new_phone.trim() || null,
        signature_data: handoverForm.new_signature_data,
      })
      .eq('id', officerId);

    if (error) {
      setHandoverMsg({ type: 'err', text: `Gagal memproses serah tugas: ${error.message}` });
    } else {
      const noteText = handoverForm.handover_note.trim()
        ? ` Catatan: "${handoverForm.handover_note.trim()}"`
        : '';

      await logActivity(
        'OFFICER_HANDOVER',
        `Serah Tugas Pegawai Stor & KEW.PS-8 daripada ${previousOfficer} kepada ${incomingOfficer} (${handoverForm.new_jawatan.trim()}).${noteText}`,
        incomingOfficer
      );

      setOfficerName(incomingOfficer);
      setProfileForm((prev) => ({
        ...prev,
        full_name: incomingOfficer,
        staff_no: handoverForm.new_staff_no.trim(),
        jawatan: handoverForm.new_jawatan.trim(),
        phone: handoverForm.new_phone.trim(),
        signature_data: handoverForm.new_signature_data,
      }));
      setHandoverForm({
        new_full_name: '',
        new_staff_no: '',
        new_jawatan: '',
        new_phone: '',
        handover_note: '',
        new_signature_data: '',
      });
      await fetchActivityLogs();
      setHandoverMsg({
        type: 'ok',
        text: `Serah tugas berjaya! Semua borang KEW.PS-8 seterusnya akan menggunakan profil & tandatangan ${incomingOfficer}.`,
      });
    }
    setSavingHandover(false);
  };

  // Delete a single notification via remove button
  const handleDeleteNotification = async (e: React.MouseEvent, notifId: number) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    const { error } = await createClient().from('notifications').delete().eq('id', notifId);
    if (!error) {
      logActivity('NOTIFICATION', `Memadam notifikasi #${notifId}.`);
    }
  };

  // Delete notification when clicked AND navigate to the request
  const handleNotificationClick = async (notif: any) => {
    setNotifOpen(false);
    setLiveToast(null);
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    await createClient().from('notifications').delete().eq('id', notif.id);

    if (notif.request_id) {
      setActiveMenu('PERMOHONAN');
      const targetReq = requests.find((r) => r.id === notif.request_id);
      if (targetReq) {
        openRequestDetails(targetReq);
      } else {
        const { data: freshReq } = await createClient()
          .from('requests')
          .select(
            'id, status, remarks, has_discrepancy, discrepancy_note, request_date, approved_at, received_at, requester:users!requests_user_id_fkey(full_name, jawatan), departments(name, department_code)'
          )
          .eq('id', notif.request_id)
          .single();
        if (freshReq) openRequestDetails(freshReq);
      }
    }
  };

  // Delete all notifications
  const clearAllNotifications = async () => {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;
    setNotifications([]);
    const { error } = await createClient().from('notifications').delete().in('id', ids);
    if (!error) {
      logActivity('NOTIFICATION', `Memadam semua notifikasi (${ids.length} rekod).`);
    }
  };

  const backToList = () => {
    setSelectedReq(null);
    fetchData();
  };

  const menuItems = [
    { id: 'DASHBOARD', label: 'Dashboard Utama', icon: <IconDashboard /> },
    { id: 'PERMOHONAN', label: 'Pengurusan Permohonan', icon: <IconPermohonan /> },
    { id: 'SETTING', label: 'Tetapan Sistem', icon: <IconSetting /> },
  ] as const;

  const pending = requests.filter((r) => r.status === 'Pending');
  const approved = requests.filter((r) => r.status === 'Approved');
  const received = requests.filter((r) => r.status === 'Received');
  const discrepancyReqs = requests.filter((r) => r.has_discrepancy);
  const closedOther = requests.filter((r) => r.status === 'Rejected' || r.status === 'Cancelled');
  const notifCount = notifications.length;

  // Filtered requests for the Full List table
  const filteredRequests = requests.filter((r) => {
    if (reqStatusFilter === 'Pending' && r.status !== 'Pending') return false;
    if (reqStatusFilter === 'Approved' && r.status !== 'Approved') return false;
    if (reqStatusFilter === 'Received' && r.status !== 'Received') return false;
    if (reqStatusFilter === 'CLOSED' && r.status !== 'Rejected' && r.status !== 'Cancelled') return false;

    if (reqSearch.trim()) {
      const q = reqSearch.toLowerCase();
      const idMatch = `#${r.id}`.includes(q) || String(r.id).includes(q);
      const nameMatch = (one(r.requester)?.full_name || '').toLowerCase().includes(q);
      const jawatanMatch = (one(r.requester)?.jawatan || '').toLowerCase().includes(q);
      const deptMatch =
        (one(r.departments)?.name || '').toLowerCase().includes(q) ||
        (one(r.departments)?.department_code || '').toLowerCase().includes(q);
      const remarkMatch = (r.remarks || '').toLowerCase().includes(q);
      return idMatch || nameMatch || jawatanMatch || deptMatch || remarkMatch;
    }
    return true;
  });

  // Filtered activity logs
  const filteredLogs = activityLogs.filter((log) => {
    if (logFilter === 'AUTH' && !['LOGIN', 'LOGOUT'].includes(log.action_type)) return false;
    if (logFilter === 'REQUEST' && !['VIEW_REQUEST', 'APPROVE_REQUEST', 'REJECT_REQUEST'].includes(log.action_type))
      return false;
    if (logFilter === 'PROFILE' && !['UPDATE_PROFILE', 'OFFICER_HANDOVER'].includes(log.action_type)) return false;

    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      return (
        (log.actor_name || '').toLowerCase().includes(q) ||
        (log.description || '').toLowerCase().includes(q) ||
        (log.action_type || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const markedDates = Array.from(
    new Set(pending.map((r) => new Date(new Date(r.request_date).getTime() + KL_OFFSET).toISOString().slice(0, 10)))
  );

  const deptCounts = requests.reduce((acc: Record<string, number>, r) => {
    const name = one(r.departments)?.name || 'Lain-lain';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxDept = chartData.length > 0 ? chartData[0][1] : 1;

  const RequestRow = ({ req, label, primary }: { req: any; label: string; primary?: boolean }) => (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[#111936]">{one(req.requester)?.full_name || 'Tidak Diketahui'}</p>
          {req.has_discrepancy && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              Perbezaan Penerimaan
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          #{req.id} · {one(req.departments)?.department_code || one(req.departments)?.name || '-'} ·{' '}
          {fmtDate(req.request_date)}
        </p>
      </div>
      <button
        onClick={() => openRequestDetails(req)}
        className={
          primary
            ? 'rounded-xl bg-[#111936] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800'
            : 'rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50'
        }
      >
        {label}
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="h-screen w-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,#ffffff_0%,#e8eef3_35%,#b3c3d1_100%)] p-4 lg:p-6">
        {/* Full-screen click-outside backdrop to close Notification Box */}
        {notifOpen && (
          <div onClick={() => setNotifOpen(false)} className="fixed inset-0 z-30 bg-transparent" aria-hidden="true" />
        )}

        {/* Live Toast Alert when user confirms receipt on mobile */}
        {liveToast && (
          <div
            onClick={() => handleNotificationClick(liveToast)}
            className="fixed bottom-6 right-6 z-50 max-w-md cursor-pointer rounded-2xl border border-white bg-[#111936] p-4 text-white shadow-2xl transition hover:scale-[1.02]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {liveToast.type === 'discrepancy' ? 'Amaran Perbezaan' : 'Notifikasi Baharu'}
                </p>
                <p className="mt-0.5 text-sm font-bold">{liveToast.title}</p>
                <p className="mt-1 text-xs text-slate-300">{liveToast.message}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLiveToast(null);
                }}
                aria-label="Tutup amaran"
                className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between px-2">
          <p className="text-lg text-slate-500">
            Stor Pusat <span className="font-bold text-[#111936]">Sistem Tadbir MDR</span>
          </p>
          <div className="relative z-40 flex items-center gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Notifikasi"
              className="relative flex items-center justify-center rounded-full border border-white/70 bg-white/50 p-2 text-slate-600 backdrop-blur transition hover:bg-white/80"
            >
              <IconBell />
              {notifCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow">
                  {notifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-12 z-40 w-96 rounded-3xl border border-white/80 bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <p className="text-sm font-bold text-[#111936]">
                    Notifikasi Penerimaan {notifCount > 0 ? `(${notifCount})` : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    {notifCount > 0 && (
                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        Padam semua
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      aria-label="Tutup notifikasi"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto pr-0.5">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">Tiada notifikasi baharu.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className="group relative cursor-pointer rounded-2xl border border-blue-100 bg-blue-50/70 p-3 pr-9 text-left transition hover:bg-blue-100/80"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold ${
                              n.type === 'discrepancy' ? 'text-amber-700' : 'text-[#111936]'
                            }`}
                          >
                            {n.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">{fmtDate(n.created_at)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{n.message}</p>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(e, n.id)}
                          aria-label="Padam notifikasi"
                          title="Padam notifikasi"
                          className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-slate-400 transition hover:bg-rose-100 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => fetchData()}
              className="rounded-full border border-white/70 bg-white/50 px-4 py-2 text-sm text-slate-500 backdrop-blur transition hover:bg-white/80"
            >
              Muat semula
            </button>
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-4 py-2 text-sm text-slate-500 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              {officerName ? `${userRole}: ${officerName}` : 'Log masuk sebagai Pegawai'}
            </div>
          </div>
        </div>

        <div className="grid h-[calc(100vh-85px)] grid-cols-[280px_1fr] gap-5 lg:grid-cols-[300px_1fr]">
          {/* ==================== LEFT ==================== */}
          <div className="no-scrollbar flex h-full flex-col gap-2 overflow-y-auto pb-2 pr-1">
            <section className={`${glassPanel} flex shrink-0 flex-col gap-1 p-2`}>
              {menuItems.map((item) => {
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id);
                      setSelectedReq(null);
                      if (item.id === 'SETTING') fetchActivityLogs();
                    }}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[14px] font-medium transition-all lg:text-[15px] ${
                      isActive
                        ? 'bg-[#111936] text-white shadow-lg shadow-[#111936]/20'
                        : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
              <div className="my-1 border-t border-white/50" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[14px] font-medium text-rose-600 transition-all hover:bg-rose-50/50 lg:text-[15px]"
              >
                <IconLogout /> Log Keluar
              </button>
            </section>

            <div className="shrink-0 origin-top scale-95 transform">
              <ClockCard />
            </div>
            <div className="-mt-3 shrink-0 origin-top scale-95 transform">
              <MiniCalendar markedDates={markedDates} />
            </div>
          </div>

          {/* ==================== RIGHT ==================== */}
          <section className={`${glassPanel} relative h-full overflow-y-auto p-6 lg:p-8`}>
            {loading ? (
              <div className="flex h-full animate-pulse items-center justify-center font-medium text-slate-500">
                Menyegerakkan pangkalan data...
              </div>
            ) : (
              <>
                {loadError && (
                  <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{loadError}</div>
                )}

                {/* ----------------- DASHBOARD ----------------- */}
                {activeMenu === 'DASHBOARD' && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-[#111936]">Analisis & Prestasi Stor</h2>

                    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                      <div className="rounded-3xl border border-white/80 bg-white/60 p-5 shadow-sm">
                        <p className="mb-1 text-sm font-semibold text-slate-500">Menunggu Semakan</p>
                        <p className="text-3xl font-bold text-blue-600">{pending.length}</p>
                      </div>
                      <div className="rounded-3xl border border-white/80 bg-white/60 p-5 shadow-sm">
                        <p className="mb-1 text-sm font-semibold text-slate-500">Diluluskan (Belum Disahkan)</p>
                        <p className="text-3xl font-bold text-amber-500">{approved.length}</p>
                      </div>
                      <div className="rounded-3xl border border-white/80 bg-white/60 p-5 shadow-sm">
                        <p className="mb-1 text-sm font-semibold text-slate-500">Selesai (Diterima)</p>
                        <p className="text-3xl font-bold text-emerald-600">{received.length}</p>
                      </div>
                      <div className="rounded-3xl border border-rose-100 bg-rose-50/80 p-5 shadow-sm">
                        <p className="mb-1 text-sm font-semibold text-rose-600">Amaran Stok</p>
                        <p className="text-3xl font-bold text-rose-600">{lowStockCount}</p>
                      </div>
                    </div>

                    {discrepancyReqs.length > 0 && (
                      <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                        <h3 className="mb-2 text-base font-bold text-amber-900">
                          Laporan Perbezaan Penerimaan ({discrepancyReqs.length})
                        </h3>
                        <div className="space-y-2">
                          {discrepancyReqs.slice(0, 3).map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-2.5 text-sm"
                            >
                              <div>
                                <span className="font-bold text-[#111936]">
                                  #{d.id} ({one(d.requester)?.full_name})
                                </span>
                                <span className="ml-2 text-slate-600">{d.discrepancy_note}</span>
                              </div>
                              <button
                                onClick={() => {
                                  setActiveMenu('PERMOHONAN');
                                  openRequestDetails(d);
                                }}
                                className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700"
                              >
                                Semak
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-6 rounded-3xl border border-white/70 bg-white/50 p-6 shadow-sm">
                      <h3 className="mb-6 text-lg font-semibold text-[#111936]">Permohonan Mengikut Jabatan</h3>
                      <div className="space-y-5">
                        {chartData.map(([dept, count]) => (
                          <div key={dept}>
                            <div className="mb-2 flex justify-between text-sm text-slate-600">
                              <span className="font-medium">{dept}</span>
                              <span className="font-bold text-[#111936]">{count} permohonan</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-200">
                              <div
                                className="h-2.5 rounded-full bg-blue-600 transition-all duration-1000 ease-out"
                                style={{ width: `${(count / maxDept) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                        {chartData.length === 0 && <p className="text-sm text-slate-400">Tiada rekod jabatan.</p>}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/70 bg-white/50 p-6 shadow-sm">
                      <h3 className="mb-4 text-lg font-semibold text-[#111936]">Item Perlu Perhatian</h3>
                      {lowStock.length === 0 ? (
                        <p className="text-sm text-slate-400">Semua baki stok mencukupi.</p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {lowStock.map((i) => (
                            <li key={i.id} className="flex items-center justify-between py-3">
                              <div>
                                <p className="text-sm font-semibold text-[#111936]">{i.name}</p>
                                <p className="text-xs text-slate-400">
                                  {i.item_code} · minimum {i.minimum_stock}
                                </p>
                              </div>
                              <span
                                className={`rounded-lg px-3 py-1 text-sm font-bold ${
                                  i.current_stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {i.current_stock === 0 ? 'Habis' : `${i.current_stock} ${i.unit}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* ----------------- PERMOHONAN (FULL LIST + GROUPED VIEW) ----------------- */}
                {activeMenu === 'PERMOHONAN' && (
                  <div>
                    {selectedReq ? (
                      <div>
                        <button
                          onClick={backToList}
                          className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[#111936]"
                        >
                          &larr; Kembali ke senarai penuh permohonan
                        </button>

                        <div className="mb-6 flex flex-wrap items-center gap-6 rounded-3xl border border-white bg-white/70 p-6 shadow-sm">
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">No. Rujukan</p>
                            <p className="text-lg font-extrabold text-[#111936]">#{selectedReq.id}</p>
                          </div>
                          <div className="border-l border-slate-300 pl-6">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Pemohon</p>
                            <p className="text-base font-bold text-[#111936]">{one(selectedReq.requester)?.full_name}</p>
                            <p className="text-xs text-slate-500">{one(selectedReq.requester)?.jawatan}</p>
                          </div>
                          <div className="border-l border-slate-300 pl-6">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Jabatan</p>
                            <p className="text-sm font-medium text-slate-700">{one(selectedReq.departments)?.name}</p>
                          </div>
                          <div className="border-l border-slate-300 pl-6">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarikh Mohon</p>
                            <p className="text-sm font-medium text-slate-700">{fmtDateTime(selectedReq.request_date)}</p>
                          </div>
                          {selectedReq.approved_at && (
                            <div className="border-l border-slate-300 pl-6">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarikh Lulus</p>
                              <p className="text-sm font-medium text-blue-700">{fmtDateTime(selectedReq.approved_at)}</p>
                            </div>
                          )}
                          {selectedReq.received_at && (
                            <div className="border-l border-slate-300 pl-6">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarikh Terima</p>
                              <p className="text-sm font-medium text-emerald-700">{fmtDateTime(selectedReq.received_at)}</p>
                            </div>
                          )}
                          <div className="border-l border-slate-300 pl-6">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                            <span
                              className={`rounded-lg border px-3 py-1 text-xs font-bold ${
                                STATUS_BADGE_STYLE[selectedReq.status] ?? 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {STATUS_LABEL[selectedReq.status] ?? selectedReq.status}
                            </span>
                          </div>
                          {selectedReq.remarks && (
                            <div className="w-full border-t border-slate-200 pt-3">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Catatan Pemohon</p>
                              <p className="text-sm text-slate-700">{selectedReq.remarks}</p>
                            </div>
                          )}
                          {selectedReq.has_discrepancy && selectedReq.discrepancy_note && (
                            <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-3">
                              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                                Catatan Perbezaan Penerimaan
                              </p>
                              <p className="text-sm text-amber-900">{selectedReq.discrepancy_note}</p>
                            </div>
                          )}
                        </div>

                        {itemsError && (
                          <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{itemsError}</div>
                        )}

                        {loadingItems ? (
                          <p className="animate-pulse py-10 text-center text-slate-400">Menyediakan borang KEW.PS-8...</p>
                        ) : (
                          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                            <ApprovalClient
                              key={selectedReq.id}
                              requestId={selectedReq.id}
                              status={selectedReq.status}
                              initialItems={reqItems}
                              onDone={backToList}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h2 className="text-2xl font-bold text-[#111936]">Senarai Penuh Permohonan</h2>
                            <p className="text-xs text-slate-500">
                              Paparan menyeluruh semua permohonan KEW.PS-8, status kelulusan, dan pengesahan penerimaan.
                            </p>
                          </div>

                          {/* View Switcher */}
                          <div className="flex rounded-2xl border border-white/80 bg-white/60 p-1 shadow-sm">
                            <button
                              type="button"
                              onClick={() => setReqViewMode('FULL_LIST')}
                              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                                reqViewMode === 'FULL_LIST'
                                  ? 'bg-[#111936] text-white shadow'
                                  : 'text-slate-600 hover:text-[#111936]'
                              }`}
                            >
                              Senarai Penuh ({requests.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setReqViewMode('GROUPED')}
                              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                                reqViewMode === 'GROUPED'
                                  ? 'bg-[#111936] text-white shadow'
                                  : 'text-slate-600 hover:text-[#111936]'
                              }`}
                            >
                              Kumpulan Status
                            </button>
                          </div>
                        </div>

                        {reqViewMode === 'FULL_LIST' ? (
                          <div className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-sm">
                            {/* Search & Status Filter Pills */}
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { id: 'ALL', label: `Semua (${requests.length})` },
                                  { id: 'Pending', label: `Menunggu (${pending.length})` },
                                  { id: 'Approved', label: `Diluluskan (${approved.length})` },
                                  { id: 'Received', label: `Telah Diterima (${received.length})` },
                                  { id: 'CLOSED', label: `Ditolak/Batal (${closedOther.length})` },
                                ].map((tab) => (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setReqStatusFilter(tab.id as any)}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                      reqStatusFilter === tab.id
                                        ? 'bg-[#111936] text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {tab.label}
                                  </button>
                                ))}
                              </div>

                              <input
                                type="text"
                                value={reqSearch}
                                onChange={(e) => setReqSearch(e.target.value)}
                                placeholder="Cari ID, nama pemohon, jabatan..."
                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-700 outline-none focus:border-[#111936] sm:w-64"
                              />
                            </div>

                            {/* Full Information Table */}
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Tarikh & Masa Mohon</th>
                                    <th className="px-4 py-3">Pemohon & Jawatan</th>
                                    <th className="px-4 py-3">Jabatan</th>
                                    <th className="px-4 py-3">Status & Pengesahan</th>
                                    <th className="px-4 py-3">Catatan</th>
                                    <th className="px-4 py-3 text-right">Tindakan</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {filteredRequests.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                                        Tiada permohonan sepadan dengan carian atau penapis dipilih.
                                      </td>
                                    </tr>
                                  ) : (
                                    filteredRequests.map((req) => (
                                      <tr key={req.id} className="transition hover:bg-slate-50/80">
                                        <td className="px-4 py-3.5 font-extrabold text-[#111936]">#{req.id}</td>
                                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                                          {fmtDateTime(req.request_date)}
                                        </td>
                                        <td className="px-4 py-3.5">
                                          <p className="font-bold text-[#111936]">
                                            {one(req.requester)?.full_name || 'Tidak Diketahui'}
                                          </p>
                                          <p className="text-[11px] text-slate-500">
                                            {one(req.requester)?.jawatan || '-'}
                                          </p>
                                        </td>
                                        <td className="px-4 py-3.5">
                                          <span className="font-semibold text-slate-700">
                                            {one(req.departments)?.department_code || '-'}
                                          </span>
                                          <p className="max-w-[180px] truncate text-[11px] text-slate-500">
                                            {one(req.departments)?.name || '-'}
                                          </p>
                                        </td>
                                        <td className="px-4 py-3.5">
                                          <div className="flex flex-col items-start gap-1">
                                            <span
                                              className={`rounded-lg border px-2.5 py-0.5 text-[11px] font-bold ${
                                                STATUS_BADGE_STYLE[req.status] ?? 'bg-slate-100 text-slate-700'
                                              }`}
                                            >
                                              {STATUS_LABEL[req.status] ?? req.status}
                                            </span>
                                            {req.received_at && (
                                              <span className="text-[10px] text-emerald-700">
                                                Sah terima: {fmtDate(req.received_at)}
                                              </span>
                                            )}
                                            {req.has_discrepancy && (
                                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                                Perbezaan Kuantiti
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="max-w-[200px] px-4 py-3.5 text-slate-600">
                                          <p className="line-clamp-2">
                                            {req.discrepancy_note || req.remarks || <span className="text-slate-300">-</span>}
                                          </p>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                          <button
                                            onClick={() => openRequestDetails(req)}
                                            className={
                                              req.status === 'Pending'
                                                ? 'rounded-xl bg-[#111936] px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-slate-800'
                                                : 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50'
                                            }
                                          >
                                            {req.status === 'Pending' ? 'Semak' : 'Lihat Penuh'}
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <>
                            <details
                              open
                              className="group mb-4 rounded-3xl border border-white/70 bg-white/50 p-4 shadow-sm transition-all open:bg-white/80"
                            >
                              <summary className="flex cursor-pointer list-none items-center font-bold text-[#111936] outline-none [&::-webkit-details-marker]:hidden">
                                <IconChevron />
                                <span className="mr-3 text-[17px]">Menunggu Semakan</span>
                                <span className="rounded-lg bg-rose-100 px-2.5 py-0.5 text-sm font-bold text-rose-700">
                                  {pending.length}
                                </span>
                              </summary>
                              <div className="mt-4 space-y-3 pl-2">
                                {[...pending].reverse().map((req) => (
                                  <RequestRow key={req.id} req={req} label="Semak" primary />
                                ))}
                                {pending.length === 0 && (
                                  <p className="ml-7 py-2 text-sm italic text-slate-500">
                                    Tiada permohonan baru menunggu kelulusan.
                                  </p>
                                )}
                              </div>
                            </details>

                            <details className="group mb-4 rounded-3xl border border-white/70 bg-white/50 p-4 shadow-sm transition-all open:bg-white/80">
                              <summary className="flex cursor-pointer list-none items-center font-bold text-[#111936] outline-none [&::-webkit-details-marker]:hidden">
                                <IconChevron />
                                <span className="mr-3 text-[17px]">Telah Diluluskan (Belum Disahkan Penerimaan)</span>
                                <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-700">
                                  {approved.length}
                                </span>
                              </summary>
                              <div className="mt-4 space-y-3 pl-2">
                                {approved.map((req) => (
                                  <RequestRow key={req.id} req={req} label="Lihat" />
                                ))}
                                {approved.length === 0 && (
                                  <p className="ml-7 py-2 text-sm italic text-slate-500">
                                    Tiada permohonan menunggu pengesahan penerimaan.
                                  </p>
                                )}
                              </div>
                            </details>

                            <details className="group mb-4 rounded-3xl border border-white/70 bg-white/50 p-4 shadow-sm transition-all open:bg-white/80">
                              <summary className="flex cursor-pointer list-none items-center font-bold text-[#111936] outline-none [&::-webkit-details-marker]:hidden">
                                <IconChevron />
                                <span className="mr-3 text-[17px]">Selesai (Telah Diterima)</span>
                                <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-sm font-bold text-emerald-700">
                                  {received.length}
                                </span>
                              </summary>
                              <div className="mt-4 space-y-3 pl-2">
                                {received.map((req) => (
                                  <RequestRow key={req.id} req={req} label="Lihat" />
                                ))}
                                {received.length === 0 && (
                                  <p className="ml-7 py-2 text-sm italic text-slate-500">Belum ada permohonan selesai.</p>
                                )}
                              </div>
                            </details>

                            <details className="group mb-4 rounded-3xl border border-white/70 bg-white/50 p-4 shadow-sm transition-all open:bg-white/80">
                              <summary className="flex cursor-pointer list-none items-center font-bold text-[#111936] outline-none [&::-webkit-details-marker]:hidden">
                                <IconChevron />
                                <span className="mr-3 text-[17px]">Ditolak / Dibatalkan</span>
                                <span className="rounded-lg bg-slate-200 px-2.5 py-0.5 text-sm font-bold text-slate-600">
                                  {closedOther.length}
                                </span>
                              </summary>
                              <div className="mt-4 space-y-3 pl-2">
                                {closedOther.map((req) => (
                                  <RequestRow key={req.id} req={req} label="Lihat" />
                                ))}
                                {closedOther.length === 0 && (
                                  <p className="ml-7 py-2 text-sm italic text-slate-500">Tiada rekod.</p>
                                )}
                              </div>
                            </details>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ----------------- SETTING (PROFILE, ACTIVITY LOGS, HANDOVER) ----------------- */}
                {activeMenu === 'SETTING' && (
                  <div>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-[#111936]">Tetapan Sistem & Pegawai Stor</h2>
                        <p className="text-xs text-slate-500">
                          Urus profil pegawai pelulus, tandatangan rasmi KEW.PS-8, log aktiviti, dan serah tugas.
                        </p>
                      </div>

                      {/* Sub-navigation Tabs */}
                      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/80 bg-white/60 p-1.5 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setSettingTab('PROFILE')}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                            settingTab === 'PROFILE'
                              ? 'bg-[#111936] text-white shadow'
                              : 'text-slate-600 hover:bg-white/80 hover:text-[#111936]'
                          }`}
                        >
                          Profil Pegawai & Tandatangan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSettingTab('LOGS');
                            fetchActivityLogs();
                          }}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                            settingTab === 'LOGS'
                              ? 'bg-[#111936] text-white shadow'
                              : 'text-slate-600 hover:bg-white/80 hover:text-[#111936]'
                          }`}
                        >
                          Log Aktiviti ({activityLogs.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSettingTab('HANDOVER')}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                            settingTab === 'HANDOVER'
                              ? 'bg-[#111936] text-white shadow'
                              : 'text-slate-600 hover:bg-white/80 hover:text-[#111936]'
                          }`}
                        >
                          Serah Tugas Pegawai
                        </button>
                      </div>
                    </div>

                    {/* SUB-TAB 1: PROFILE & SIGNATURE */}
                    {settingTab === 'PROFILE' && (
                      <form
                        onSubmit={handleSaveProfile}
                        className="rounded-3xl border border-white/80 bg-white/75 p-6 shadow-sm"
                      >
                        <h3 className="mb-4 text-lg font-bold text-[#111936]">Maklumat Profil Pegawai Pelulus</h3>

                        {profileMsg && (
                          <div
                            className={`mb-5 rounded-2xl p-3.5 text-xs font-bold ${
                              profileMsg.type === 'ok'
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border border-rose-200 bg-rose-50 text-rose-700'
                            }`}
                          >
                            {profileMsg.text}
                          </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              Nama Penuh Pegawai *
                            </label>
                            <input
                              type="text"
                              required
                              value={profileForm.full_name}
                              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              No. Pekerja / No. Kad Pengenalan
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: MDR-1042"
                              value={profileForm.staff_no}
                              onChange={(e) => setProfileForm({ ...profileForm, staff_no: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              Jawatan & Gred
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: Penolong Pegawai Tadbir N29"
                              value={profileForm.jawatan}
                              onChange={(e) => setProfileForm({ ...profileForm, jawatan: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">No. Telefon</label>
                            <input
                              type="text"
                              placeholder="Contoh: 019-9876543"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Jabatan / Unit</label>
                            <select
                              value={profileForm.department_id}
                              onChange={(e) => setProfileForm({ ...profileForm, department_id: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                            >
                              <option value="">-- Pilih Jabatan --</option>
                              {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.department_code ? `${d.department_code} - ${d.name}` : d.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              E-mel Akaun Sistem (Tetap)
                            </label>
                            <input
                              type="email"
                              disabled
                              value={officerEmail}
                              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500"
                            />
                          </div>
                        </div>

                        <div className="mt-6 border-t border-slate-200/80 pt-5">
                          <SignaturePad
                            value={profileForm.signature_data}
                            onChange={(sig) => setProfileForm({ ...profileForm, signature_data: sig })}
                            label="Tandatangan Rasmi Pegawai (Dipaparkan Pada Borang KEW.PS-8)"
                          />
                        </div>

                        <div className="mt-6 flex justify-end">
                          <button
                            type="submit"
                            disabled={savingProfile}
                            className="rounded-2xl bg-[#111936] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-50"
                          >
                            {savingProfile ? 'Menyimpan...' : 'Simpan Profil & Tandatangan'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* SUB-TAB 2: ACTIVITY LOGS */}
                    {settingTab === 'LOGS' && (
                      <div className="rounded-3xl border border-white/80 bg-white/75 p-6 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-[#111936]">Log Aktiviti Pegawai</h3>
                            <p className="text-xs text-slate-500">
                              Merekod setiap aktiviti pegawai dari log masuk hingga log keluar beserta tarikh & masa tepat.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                              {[
                                { id: 'ALL', label: 'Semua' },
                                { id: 'AUTH', label: 'Log Masuk/Keluar' },
                                { id: 'REQUEST', label: 'Permohonan' },
                                { id: 'PROFILE', label: 'Profil & Serah Tugas' },
                              ].map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setLogFilter(f.id as any)}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                    logFilter === f.id ? 'bg-[#111936] text-white' : 'text-slate-600 hover:text-[#111936]'
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>

                            <input
                              type="text"
                              value={logSearch}
                              onChange={(e) => setLogSearch(e.target.value)}
                              placeholder="Cari aktiviti atau nama..."
                              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#111936]"
                            />

                            <button
                              type="button"
                              onClick={fetchActivityLogs}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                              Segar Semula
                            </button>
                          </div>
                        </div>

                        {loadingLogs ? (
                          <p className="py-10 text-center text-sm text-slate-400">Memuatkan rekod log aktiviti...</p>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  <th className="px-4 py-3">Tarikh & Masa</th>
                                  <th className="px-4 py-3">Pegawai</th>
                                  <th className="px-4 py-3">Jenis Aktiviti</th>
                                  <th className="px-4 py-3">Keterangan Aktiviti</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredLogs.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                                      Tiada rekod aktiviti dijumpai.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredLogs.map((log) => {
                                    const badge = ACTION_BADGE[log.action_type] ?? {
                                      label: log.action_type,
                                      cls: 'bg-slate-100 text-slate-700',
                                    };
                                    return (
                                      <tr key={log.id} className="hover:bg-slate-50/80">
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">
                                          {fmtDateTime(log.created_at)}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-[#111936]">{log.actor_name}</td>
                                        <td className="px-4 py-3">
                                          <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>
                                            {badge.label}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{log.description}</td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 3: OFFICER HANDOVER (KEW.PS-8) */}
                    {settingTab === 'HANDOVER' && (
                      <div className="space-y-6">
                        {/* Outgoing Officer Summary Card */}
                        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/75 p-5 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <span className="rounded-lg bg-amber-200/80 px-2.5 py-1 text-[11px] font-extrabold uppercase text-amber-900">
                                Pegawai Semasa (Menyerahkan Tugas)
                              </span>
                              <h3 className="mt-2 text-lg font-bold text-[#111936]">{profileForm.full_name}</h3>
                              <p className="text-xs text-slate-600">
                                {profileForm.jawatan || 'Tiada Jawatan'}
                                {profileForm.staff_no ? ` · No. Staf: ${profileForm.staff_no}` : ''}
                              </p>
                            </div>
                            {profileForm.signature_data && (
                              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-2 text-center">
                                <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Tandatangan Semasa</p>
                                <img
                                  src={profileForm.signature_data}
                                  alt="Tandatangan Pegawai Semasa"
                                  className="h-12 object-contain"
                                />
                              </div>
                            )}
                          </div>
                          <p className="mt-3 text-xs leading-relaxed text-amber-900">
                            Proses Serah Tugas ini akan menggantikan maklumat profil dan tandatangan digital aktif supaya semua
                            cetakan serta kelulusan borang <strong>KEW.PS-8</strong> seterusnya menggunakan identiti pegawai
                            baharu, sambil merekodkan sejarah serah tugas dalam Log Aktiviti.
                          </p>
                        </div>

                        {/* Incoming Officer Form */}
                        <form
                          onSubmit={handleOfficerHandover}
                          className="rounded-3xl border border-white/80 bg-white/75 p-6 shadow-sm"
                        >
                          <h3 className="mb-4 text-lg font-bold text-[#111936]">
                            Maklumat Pegawai Baharu (Penerima Tugas KEW.PS-8)
                          </h3>

                          {handoverMsg && (
                            <div
                              className={`mb-5 rounded-2xl p-3.5 text-xs font-bold ${
                                handoverMsg.type === 'ok'
                                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border border-rose-200 bg-rose-50 text-rose-700'
                              }`}
                            >
                              {handoverMsg.text}
                            </div>
                          )}

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                Nama Penuh Pegawai Baharu *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Masukkan nama penuh pegawai pengganti"
                                value={handoverForm.new_full_name}
                                onChange={(e) => setHandoverForm({ ...handoverForm, new_full_name: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                Jawatan & Gred Pegawai Baharu *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="Contoh: Penolong Pegawai Tadbir N29"
                                value={handoverForm.new_jawatan}
                                onChange={(e) => setHandoverForm({ ...handoverForm, new_jawatan: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                No. Pekerja / No. K/P Baharu
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: MDR-1088"
                                value={handoverForm.new_staff_no}
                                onChange={(e) => setHandoverForm({ ...handoverForm, new_staff_no: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                No. Telefon Pegawai Baharu
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: 013-4567890"
                                value={handoverForm.new_phone}
                                onChange={(e) => setHandoverForm({ ...handoverForm, new_phone: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                Catatan / Rujukan Memo Serah Tugas
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: Pertukaran penempatan pegawai stor berkuat kuasa 20 Nov 2026"
                                value={handoverForm.handover_note}
                                onChange={(e) => setHandoverForm({ ...handoverForm, handover_note: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111936] outline-none focus:border-[#111936]"
                              />
                            </div>
                          </div>

                          <div className="mt-6 border-t border-slate-200/80 pt-5">
                            <SignaturePad
                              value={handoverForm.new_signature_data}
                              onChange={(sig) => setHandoverForm({ ...handoverForm, new_signature_data: sig })}
                              label="Tandatangan Digital Pegawai Baharu (Wajib Untuk Borang KEW.PS-8) *"
                            />
                          </div>

                          <div className="mt-6 flex justify-end">
                            <button
                              type="submit"
                              disabled={savingHandover}
                              className="rounded-2xl bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-amber-700 disabled:opacity-50"
                            >
                              {savingHandover
                                ? 'Memproses Serah Tugas...'
                                : 'Sahkan Serah Tugas & Kemaskini Borang KEW.PS-8'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}