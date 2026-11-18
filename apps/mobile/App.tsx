import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from './lib/supabase';

import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import UpdatePasswordScreen from './screens/UpdatePasswordScreen';
import MainLayout from './screens/MainLayout';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'Login' | 'SignUp' | 'UpdatePassword'>('Login');

  useEffect(() => {
    // 1. Exchange deep-link codes or apply tokens from implicit-flow links.
    const handleUrl = async (event: { url: string }) => {
      if (event.url) {
        const url = new URL(event.url);
        const code = url.searchParams.get('code');

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          return;
        }

        const params = new URLSearchParams(url.hash.slice(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    };

    // Catch the URL if the app was completely closed
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    
    // Catch the URL if the app was already open in the background
    const urlSubscription = Linking.addEventListener('url', handleUrl);

    // 2. Standard session setup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 3. Listen for the 'PASSWORD_RECOVERY' event triggered by the URL
    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthScreen('UpdatePassword');
      } else {
        setAuthScreen('Login');
      }
    });

    return () => {
      urlSubscription.remove();
      authSubscription.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4effc' }}><ActivityIndicator size="large" color="#5138a1" /></View>;

  if (!session || authScreen === 'UpdatePassword') {
    if (authScreen === 'UpdatePassword') return <UpdatePasswordScreen onComplete={() => setAuthScreen('Login')} />;
    if (authScreen === 'SignUp') return <SignUpScreen onBack={() => setAuthScreen('Login')} />;
    return <LoginScreen onNavigateToSignUp={() => setAuthScreen('SignUp')} />;
  }

  return <MainLayout />;
}