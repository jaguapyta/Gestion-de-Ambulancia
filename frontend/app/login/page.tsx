'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [nro_documento, setNroDocumento] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { nro_documento, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      if (res.data.usuario.debe_cambiar_password) {
        router.push('/cambiar-password');
        return;
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:w-1/2 relative bg-green-900">
          <img src="/foto_seme.jpg" alt="SEME" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          <div className="relative z-10 flex flex-col items-center justify-center px-12 text-white">
            <Image src="/log_seme.gif" alt="Logo SEME" width={120} height={120} className="mb-6" />
            <h1 className="text-5xl font-extrabold mb-4">SEME</h1>
            <p className="text-xl opacity-80 text-center">Servicio de Emergencias Médicas Extrahospitalarias</p>
            <p className="text-sm opacity-60 mt-4 text-center">Ministerio de Salud Pública y Bienestar Social</p>
          </div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-8">
          <div className="w-full max-w-md">
            <button onClick={() => setShowForgot(false)} className="text-green-600 text-sm mb-6 flex items-center gap-1 hover:underline">
              ← Volver al inicio de sesión
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Olvidé mi contraseña</h2>
            <p className="text-gray-500 text-sm mb-6">Contactá al administrador del sistema para restablecer tu contraseña.</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
              📞 Comunicarse con el área de TI del SEME para solicitar el restablecimiento de contraseña.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-green-900">
        <img src="/foto_seme.jpg" alt="SEME" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="relative z-10 flex flex-col items-center justify-center px-12 text-white">
          <Image src="/log_seme.gif" alt="Logo SEME" width={140} height={140} className="mb-6 drop-shadow-lg" />
          <div className="mb-4">
            <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">Sistema Oficial</span>
          </div>
          <h1 className="text-6xl font-extrabold mb-4 text-center">SEME</h1>
          <p className="text-xl opacity-90 font-light text-center">Servicio de Emergencias Médicas Extrahospitalarias</p>
          <p className="text-sm opacity-60 mt-4 text-center">Ministerio de Salud Pública y Bienestar Social</p>
          <div className="mt-12 space-y-3">
            <div className="flex items-center gap-3 text-sm opacity-70">
              <span className="text-green-400">✓</span> Gestión de solicitudes en tiempo real
            </div>
            <div className="flex items-center gap-3 text-sm opacity-70">
              <span className="text-green-400">✓</span> Despacho inteligente de ambulancias
            </div>
            <div className="flex items-center gap-3 text-sm opacity-70">
              <span className="text-green-400">✓</span> Regulación médica integrada
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Image src="/log_seme.gif" alt="Logo SEME" width={80} height={80} className="mx-auto mb-3" />
            <h1 className="text-4xl font-extrabold text-green-600">SEME</h1>
            <p className="text-gray-500 text-sm">Servicio de Emergencias Médicas Extrahospitalarias</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">Bienvenido</h2>
          <p className="text-gray-500 text-sm mb-8">Ingresá tus credenciales para continuar</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nro. de Documento</label>
              <input
                type="text"
                value={nro_documento}
                onChange={(e) => setNroDocumento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="Ej: 1234567"
                required
              />
            </div>

            <div>
              <div className="mb-1">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              </div>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="Ingrese su contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : 'Iniciar Sesión'}
            </button>
              <div className="text-center mt-3">
                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-green-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            SEME © {new Date().getFullYear()} — Ministerio de Salud Pública y Bienestar Social
          </p>
        </div>
      </div>
    </div>
  );
}