'use server'

import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server'; // Adjust this import if your function is named differently

export async function loginOfficer(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  // Initialize the Supabase server client
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: 'E-mel atau kata laluan tidak sah.' };
  }

  // Verify the user is an Officer
  if (authData.user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role') // We will create this column next
      .eq('id', authData.user.id)
      .single();

    if (profile?.role === 'Officer' || profile?.role === 'admin') {
      redirect('/dashboard');
    } else {
      // Kick them out if they are just normal mobile staff
      await supabase.auth.signOut();
      return { error: 'Akses ditolak. Portal ini hanya untuk Pegawai Pelulus MDR.' };
    }
  }
  
  return { error: 'Ralat pelayan.' };
}