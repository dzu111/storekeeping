import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function UpdatePasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleUpdatePassword() {
    setErrorMsg('');
    if (!password || !confirmPassword) return setErrorMsg('Sila isi kedua-dua ruangan.');
    if (password !== confirmPassword) return setErrorMsg('Kata laluan tidak sepadan.');

    setLoading(true);
    
    // Tell Supabase to update the password for the current recovery session
    const { error } = await supabase.auth.updateUser({ password: password });
    
    if (error) {
      setErrorMsg(error.message);
    } else {
      Alert.alert('Berjaya', 'Kata laluan anda telah berjaya ditukar. Sila log masuk semula.', [
        { text: 'Log Masuk', onPress: async () => {
            await supabase.auth.signOut(); // Force sign out to clear recovery session
            onComplete();
          } 
        }
      ]);
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/bg-login-2.png')} style={styles.backgroundImage} resizeMode="cover" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardContainer}>
        
        <View style={styles.glassCard}>
          <Text style={styles.title}>Cipta Kata Laluan Baru</Text>
          <Text style={styles.subtitle}>Sila masukkan kata laluan baru untuk akaun anda.</Text>

          {errorMsg !== '' && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Kata Laluan Baru" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Feather name="check-circle" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Sahkan Kata Laluan Baru" placeholderTextColor="#9ca3af" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleUpdatePassword} disabled={loading}>
            <Text style={styles.loginButtonText}>{loading ? 'Menyimpan...' : 'Simpan Kata Laluan'}</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { position: 'absolute', width: '100%', height: '100%' },
  keyboardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  glassCard: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(255, 255, 255, 0.90)', borderRadius: 32, padding: 32, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.6)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 22, fontWeight: '900', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', marginBottom: 20 },
  errorText: { color: '#ef4444', fontWeight: '700', marginLeft: 8, fontSize: 14, flex: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 16, height: 56, marginBottom: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1f2937' },
  eyeIcon: { padding: 8 },
  loginButton: { flexDirection: 'row', backgroundColor: '#5138a1', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#5138a1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});