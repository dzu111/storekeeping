'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../../lib/supabase/server';

type Line = { id: number; approved_qty: number; note?: string };
export type ProcessResult = { error: string } | { ok: true };

export async function processRequest(
  requestId: number,
  decision: 'Approved' | 'Rejected',
  lines: Line[] = [],
  reason = ''
): Promise<ProcessResult> {
  if (!Number.isInteger(requestId) || requestId <= 0) return { error: 'ID permohonan tidak sah.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi tamat. Sila log masuk semula.' };

  if (decision === 'Approved') {
    const valid = lines.every((l) => Number.isInteger(l.id) && Number.isInteger(l.approved_qty) && l.approved_qty >= 0);
    if (!valid) return { error: 'Kuantiti tidak sah.' };

    const { error } = await supabase.rpc('approve_request_lines', {
      p_request_id: requestId,
      p_lines: lines.map((l) => ({ id: l.id, qty: l.approved_qty, note: (l.note ?? '').trim() })),
    });
    if (error) return { error: error.message };
  } else {
    if (!reason.trim()) return { error: 'Sila nyatakan sebab penolakan.' };

    const { error } = await supabase.rpc('reject_request', {
      p_request_id: requestId,
      p_reason: reason.trim(),
    });
    if (error) return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/requests/${requestId}`);
  return { ok: true }; // the caller decides where to go next
}