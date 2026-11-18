import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Image, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function LoginScreen({ onNavigateToSignUp }: { onNavigateToSignUp: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot Password States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  async function signInWithEmail() {
    setErrorMsg(''); 
    if (!email || !password) return setErrorMsg('Sila isi e-mel dan kata laluan.');

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setErrorMsg('E-mel atau Kata Laluan salah.');
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!resetEmail) {
      Alert.alert('Ralat', 'Sila masukkan e-mel anda.');
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
    setResetLoading(false);

    if (error) {
      Alert.alert('Ralat', error.message);
    } else {
      Alert.alert('Berjaya', 'Pautan untuk menetapkan semula kata laluan telah dihantar ke e-mel anda.');
      setShowResetModal(false);
      setResetEmail('');
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/bg-login-2.png')} style={styles.backgroundImage} resizeMode="cover" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardContainer}>
        <View style={styles.glassCard}>
          
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}><Feather name="shopping-cart" size={32} color="#5138a1" /></View>
            <Text style={styles.title}>Sistem Stor MDR</Text>
            <Text style={styles.subtitle}>Majlis Daerah Raub</Text>
          </View>

          {errorMsg !== '' && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Feather name="user" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="E-mel (Sistem)" placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Kata Laluan" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPasswordWrap} onPress={() => setShowResetModal(true)}>
            <Text style={styles.forgotPasswordText}>Lupa Kata Laluan?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={signInWithEmail} disabled={loading}>
            <Text style={styles.loginButtonText}>{loading ? 'Memuatkan...' : 'Log Masuk'}</Text>
            <Feather name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupWrap} onPress={onNavigateToSignUp}>
            <Text style={styles.signupText}>Belum ada akaun? <Text style={styles.signupBold}>Daftar Pengguna</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lupa Kata Laluan?</Text>
              <TouchableOpacity onPress={() => setShowResetModal(false)}>
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Masukkan e-mel yang didaftarkan. Kami akan menghantar pautan untuk menetapkan semula kata laluan anda.
            </Text>

            <View style={[styles.inputContainer, { marginBottom: 24 }]}>
              <Feather name="mail" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="E-mel anda" placeholderTextColor="#9ca3af" value={resetEmail} onChangeText={setResetEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowResetModal(false)}>
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleResetPassword} disabled={resetLoading}>
                <Text style={styles.submitText}>{resetLoading ? 'Menghantar...' : 'Hantar Pautan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { position: 'absolute', width: '100%', height: '100%' },
  keyboardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  glassCard: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(255, 255, 255, 0.90)', borderRadius: 32, padding: 32, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.6)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(81, 56, 161, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: '#1f2937' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', marginBottom: 20 },
  errorText: { color: '#ef4444', fontWeight: '700', marginLeft: 8, fontSize: 14, flex: 1 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 16, height: 56, marginBottom: 12 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1f2937' },
  eyeIcon: { padding: 8 },
  
  forgotPasswordWrap: { alignSelf: 'flex-end', marginBottom: 16, paddingVertical: 4 },
  forgotPasswordText: { color: '#5138a1', fontSize: 13, fontWeight: '700' },

  loginButton: { flexDirection: 'row', backgroundColor: '#5138a1', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 4, shadowColor: '#5138a1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  signupWrap: { marginTop: 24, alignItems: 'center' },
  signupText: { color: '#4b5563', fontSize: 14 },
  signupBold: { color: '#5138a1', fontWeight: '800' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#ffffff', padding: 24, borderRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  cancelButton: { backgroundColor: '#f3f4f6' },
  submitButton: { backgroundColor: '#5138a1' },
  cancelText: { color: '#4b5563', fontWeight: '700' },
  submitText: { color: '#ffffff', fontWeight: '700' },
});