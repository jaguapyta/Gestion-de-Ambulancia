import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiLogin } from '../lib/api';

export default function Login() {
  const [verificando, setVerificando] = useState(true);
  const [doc, setDoc] = useState('');
  const [pass, setPass] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Si ya hay sesión, salta directo a la pantalla principal.
  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('token');
      if (t) router.replace('/home');
      else setVerificando(false);
    })();
  }, []);

  const entrar = async () => {
    if (!doc || !pass) { setError('Completá documento y contraseña'); return; }
    setCargando(true); setError('');
    try {
      const data = await apiLogin(doc.trim(), pass);
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('usuario', JSON.stringify(data.usuario));
      router.replace('/home');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  if (verificando) {
    return <View style={s.center}><ActivityIndicator size="large" color="#0a2540" /></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.c}>
      <Text style={s.logo}>🚑 SEME</Text>
      <Text style={s.sub}>App de tripulación</Text>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <TextInput style={s.inp} placeholder="Nº de documento" placeholderTextColor="#9ca3af" keyboardType="number-pad" value={doc} onChangeText={setDoc} autoCapitalize="none" />
      <TextInput style={s.inp} placeholder="Contraseña" placeholderTextColor="#9ca3af" secureTextEntry value={pass} onChangeText={setPass} />
      <TouchableOpacity style={s.btn} onPress={entrar} disabled={cargando} activeOpacity={0.8}>
        {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Ingresar</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f9' },
  c: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#f4f6f9' },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#0a2540', textAlign: 'center' },
  sub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 28 },
  inp: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12, color: '#0a2540' },
  btn: { backgroundColor: '#0a2540', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  err: { backgroundColor: '#fef2f2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 12, textAlign: 'center' },
});
