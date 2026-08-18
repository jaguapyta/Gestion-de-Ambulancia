'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCambiar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/cambiar-password', { password });
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      usuario.debe_cambiar_password = false;
      localStorage.setItem('usuario', JSON.stringify(usuario));
      const rol = usuario.rol;
      if (rol === 'ADMINISTRADOR') router.push('/admin');
      else if (rol === 'RECEPCIONISTA') router.push('/recepcion');
      else if (rol === 'DESPACHANTE') router.push('/despacho');
      else if (rol === 'MEDICO') router.push('/medico');
      else router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-6">
          <Image src="/log_seme.gif" alt="Logo SEME" width={80} height={80} className="mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-gray-800">Cambiar Contraseña</h2>
          <p className="text-sm text-gray-500 mt-1">Por seguridad debés cambiar tu contraseña antes de continuar</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-yellow-700 text-sm">
          ⚠️ Esta es tu primera sesión. Establecé una contraseña segura.
        </div>

        <form onSubmit={handleCambiar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Mínimo 8 caracteres"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
            <div className="relative">
              <input
                type={showConfirmar ? 'text' : 'password'}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Repetí la contraseña"
                required
              />
              <button type="button" onClick={() => setShowConfirmar(!showConfirmar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmar ? '🙈' : '👁️'}
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
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}