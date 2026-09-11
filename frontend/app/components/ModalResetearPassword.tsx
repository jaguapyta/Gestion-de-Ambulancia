'use client';

import { API_URL } from '@/app/lib/api';
import { useState } from 'react';

interface Props {
  usuarioId: number;
  nombre: string;
  documento: string;
  onCerrar: () => void;
}

export default function ModalResetearPassword({ usuarioId, nombre, documento, onCerrar }: Props) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<{ password_generada: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const token = () => localStorage.getItem('token') ?? '';

  const confirmar = async () => {
    setProcesando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${usuarioId}/resetear-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al restablecer la contraseña'); return; }
      setResultado(data);
    } catch { setError('Error de conexión'); }
    finally { setProcesando(false); }
  };

  const copiar = () => {
    if (!resultado) return;
    navigator.clipboard?.writeText(resultado.password_generada);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>

        {resultado ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔑</div>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', marginBottom: '8px' }}>
              Contraseña restablecida
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>
              Comunicale esta contraseña a {nombre.split(' ')[0]}. Va a tener que cambiarla al ingresar.
            </p>
            <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '6px' }}>Contraseña generada</div>
              <div style={{ fontSize: '22px', fontWeight: '500', color: '#0a2540', letterSpacing: '2px' }}>
                {resultado.password_generada}
              </div>
              <button onClick={copiar}
                style={{ marginTop: '10px', background: 'transparent', border: '0.5px solid #bbf7d0', color: '#15803d', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                {copiado ? '✓ Copiada' : 'Copiar'}
              </button>
            </div>
            <button onClick={onCerrar}
              style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>
              Restablecer contraseña
            </h2>

            {error && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#0a2540', fontWeight: '500' }}>{nombre}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>CI: {documento}</div>
            </div>

            <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#c2410c', lineHeight: 1.5 }}>
              ⚠️ La contraseña actual del funcionario deja de funcionar. Vuelve a la contraseña por defecto
              y el sistema le va a exigir cambiarla en su próximo ingreso.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={onCerrar}
                style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>
                Cancelar
              </button>
              <button onClick={confirmar} disabled={procesando}
                style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#c2410c', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {procesando ? 'Restableciendo...' : 'Sí, restablecer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
