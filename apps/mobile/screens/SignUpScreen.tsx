import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Image, KeyboardAvoidingView, Platform, ScrollView, Modal, type ImageStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// Added TLK and MAINCOM here
export const DEPARTMENTS = [
  { id: 1, name: 'UNIT PERHUBUNGAN AWAM DAN PEMBANGUNAN MASYARAKAT', short: 'UPA' },
  { id: 2, name: 'UNIT UNDANG-UNDANG', short: 'UU' },
  { id: 3, name: 'UNIT PUSAT SETEMPAT', short: 'OSC' },
  { id: 4, name: 'UNIT AUDIT DALAMAN', short: 'UAD' },
  { id: 5, name: 'JABATAN KHIDMAT PENGURUSAN', short: 'JKP' },
  { id: 6, name: 'BAHAGIAN TEKNOLOGI MAKLUMAT', short: 'BTM' },
  { id: 7, name: 'BAHAGIAN PENGUATKUASAAN DAN KESELAMATAN', short: 'BP' },
  { id: 8, name: 'JABATAN PERBENDAHARAAN', short: 'JP' },
  { id: 9, name: 'JABATAN PENILAIAN DAN PENGURUSAN HARTA', short: 'JPPH' },
  { id: 10, name: 'JABATAN PERANCANGAN BANDAR DAN LANDSKAP', short: 'JPBL' },
  { id: 11, name: 'BAHAGIAN LANDSKAP', short: 'BL' },
  { id: 12, name: 'JABATAN KEJURUTERAAN DAN KAWALAN BANGUNAN', short: 'JKB' },
  { id: 13, name: 'JABATAN KESIHATAN AWAM DAN PERKHIDMATAN PERBANDARAN', short: 'JKAPP' },
  { id: 14, name: 'CAWANGAN BUKIT FRASER', short: 'BF' },
  { id: 15, name: 'TEMPAT LETAK KERETA', short: 'TLK' }
];

export default function SignUpScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [jawatan, setJawatan] = useState('');
  const [deptId, setDeptId] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  
  // New visual error state
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSignUp() {
    setErrorMsg(''); // Clear old errors
    
    if (!name || !jawatan || !deptId || !email || !password || !confirmPassword) {
      return setErrorMsg('Sila isi semua maklumat.');
    }
    if (password !== confirmPassword) {
      return setErrorMsg('Kata laluan tidak sepadan.');
    }

    setLoading(true);
    
    // 1. Create Auth Account
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    
    if (authError) {
      setLoading(false);
      return setErrorMsg(authError.message);
    }

    if (authData.user) {
      // 2. Insert into public.users table (Auto-forced to 'User' role)
      const { error: dbError } = await supabase.from('users').insert([{
        id: authData.user.id,
        full_name: name,
        jawatan: jawatan,
        department_id: deptId,
        role: 'User', // <-- Forces every new account to be a normal user
        avatar: 'default'
      }]);

      if (dbError) {
        setErrorMsg('Ralat Pangkalan Data: ' + dbError.message);
      } else {
        alert('Pendaftaran Berjaya! Sila log masuk.');
        onBack();
      }
    }
    setLoading(false);
  }

  const selectedDept = DEPARTMENTS.find(d => d.id === deptId);

  return (
    <View style={styles.container}>
      <Image source={require('../assets/bg-login-2.png')} style={styles.backgroundImage} resizeMode="cover" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardContainer}>
        
        <View style={styles.glassCard}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>

          <Text style={styles.title}>Daftar Pengguna Baru</Text>
          
          {errorMsg !== '' && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            
            <View style={styles.inputContainer}>
              <Feather name="user" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Nama Penuh" placeholderTextColor="#9ca3af" value={name} onChangeText={setName} />
            </View>

            <View style={styles.inputContainer}>
              <Feather name="briefcase" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Jawatan (Cth: Pegawai Tadbir N9)" placeholderTextColor="#9ca3af" value={jawatan} onChangeText={setJawatan} />
            </View>

            <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDeptModal(true)}>
              <Feather name="layers" size={20} color="#9ca3af" style={styles.inputIcon} />
              <Text style={[styles.input, { color: selectedDept ? '#1f2937' : '#9ca3af' }]} numberOfLines={1}>
                {selectedDept ? `${selectedDept.short} - ${selectedDept.name}` : 'Pilih Jabatan'}
              </Text>
              <Feather name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Feather name="mail" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="E-mel" placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>

            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Kata Laluan" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Feather name="check-circle" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Sahkan Kata Laluan" placeholderTextColor="#9ca3af" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleSignUp} disabled={loading}>
              <Text style={styles.loginButtonText}>{loading ? 'Mendaftar...' : 'Daftar Sekarang'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showDeptModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Jabatan</Text>
              <TouchableOpacity onPress={() => setShowDeptModal(false)}><Feather name="x" size={24} color="#1f2937" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.deptScroll}>
              {DEPARTMENTS.map(dept => (
                <TouchableOpacity key={dept.id} style={styles.deptItem} onPress={() => { setDeptId(dept.id); setShowDeptModal(false); }}>
                  <Text style={styles.deptShort}>{dept.short}</Text>
                  <Text style={styles.deptName}>{dept.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { position: 'absolute', width: '100%', height: '100%' },
  keyboardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, paddingTop: 60 },
  glassCard: { width: '100%', maxWidth: 450, maxHeight: '90%', backgroundColor: 'rgba(255, 255, 255, 0.90)', borderRadius: 32, padding: 24, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.6)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#1f2937', marginBottom: 16 },
  
  // New Error Styles
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', marginBottom: 16 },
  errorText: { color: '#ef4444', fontWeight: '700', marginLeft: 8, fontSize: 14, flex: 1 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 16, height: 56, marginBottom: 12 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#1f2937'},
  eyeIcon: { padding: 8 },
  loginButton: { backgroundColor: '#5138a1', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: '#5138a1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  deptScroll: { marginBottom: 20 },
  deptItem: { paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  deptShort: { fontSize: 16, fontWeight: '800', color: '#5138a1', marginBottom: 4 },
  deptName: { fontSize: 13, color: '#4b5563' }
});