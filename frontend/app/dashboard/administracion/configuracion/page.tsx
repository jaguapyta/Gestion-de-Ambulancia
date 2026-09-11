'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';

export default function ConfiguracionPage() {
  const [guardado, setGuardado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre_sistema: '',
    telefono_emergencias: '',
    direccion: '',
    ciudad: '',
    tiempo_sesion_minutos: '480',
    exigir_habilitacion_vigente: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/configuracion`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data) setForm({
          nombre_sistema: data.nombre_sistema ?? '',
          telefono_emergencias: data.telefono_emergencias ?? '',
          direccion: data.direccion ?? '',
          ciudad: data.ciudad ?? '',
          tiempo_sesion_minutos: data.tiempo_sesion_minutos?.toString() ?? '480',
          exigir_habilitacion_vigente: Boolean(data.exigir_habilitacion_vigente),
        });
      })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  }, []);

  const guardar = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setGuardando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) { setError('Error al guardar'); return; }
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch {
      setError('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Configuración</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Ajustes generales del sistema</p>
      </div>

      {guardado && (
        <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#15803d' }}>
          ✅ Configuración guardada correctamente
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#dc2626' }}>
          ⚠️ {error}
        </div>
      )}

      {cargando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando configuración...</div>
      ) : (
        <>
          {/* General */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '24px', border: '0.5px solid #e5e7eb', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>⚙️ General</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Nombre del sistema</label>
                <input value={form.nombre_sistema} onChange={e => setForm({ ...form, nombre_sistema: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono de emergencias</label>
                <input value={form.telefono_emergencias} onChange={e => setForm({ ...form, telefono_emergencias: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dirección institucional</label>
                <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ciudad</label>
                <input value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tiempo de sesión (minutos)</label>
                <input type="number" value={form.tiempo_sesion_minutos} onChange={e => setForm({ ...form, tiempo_sesion_minutos: e.target.value })} style={inputStyle} />
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  Actualmente: {Math.floor(parseInt(form.tiempo_sesion_minutos) / 60)}h {parseInt(form.tiempo_sesion_minutos) % 60}min
                </div>
              </div>
            </div>
          </div>

          {/* Rol de guardia */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '24px', border: '0.5px solid #e5e7eb', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>🚑 Rol de guardia</h2>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.exigir_habilitacion_vigente}
                onChange={e => setForm({ ...form, exigir_habilitacion_vigente: e.target.checked })}
                style={{ width: '18px', height: '18px', marginTop: '1px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540' }}>
                  Exigir habilitación vigente para armar tripulaciones
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', lineHeight: 1.5 }}>
                  Con esta opción activa, un funcionario con el registro profesional o la licencia
                  <strong> vencidos o sin cargar</strong> no puede asignarse a un móvil de guardia.
                  Dejala desactivada mientras se trabaja con datos de prueba.
                </div>
                <div style={{
                  display: 'inline-block', marginTop: '8px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500',
                  background: form.exigir_habilitacion_vigente ? '#f0fdf4' : '#fff7ed',
                  color: form.exigir_habilitacion_vigente ? '#15803d' : '#c2410c'
                }}>
                  {form.exigir_habilitacion_vigente ? 'Activo — se validan las habilitaciones' : 'Inactivo — no se bloquea a nadie'}
                </div>
              </div>
            </label>
          </div>

          {/* Base de datos */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '24px', border: '0.5px solid #e5e7eb', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>🗄️ Base de datos</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
              <button style={{ background: '#f8f9fb', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                📥 Exportar backup
              </button>
              <button style={{ background: '#f8f9fb', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                📤 Importar backup
              </button>
            </div>
          </div>

          {/* Información del sistema */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '24px', border: '0.5px solid #e5e7eb', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>ℹ️ Información del sistema</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Versión', value: '1.0.0' },
                { label: 'Universidad', value: 'Universidad Columbia del Paraguay - 2026' },
                { label: 'Autor', value: 'Lic. Emilio Ramón Insfrán Gamarra' },
                { label: 'Backend', value: 'Node.js + Express' },
                { label: 'Frontend', value: 'Next.js 16' },
                { label: 'Base de datos', value: 'MySQL + Prisma' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '130px' }}>{item.label}:</span>
                  <span style={{ fontSize: '13px', color: '#0a2540', fontWeight: '500' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={guardar} disabled={guardando} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '10px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            {guardando ? 'Guardando...' : '💾 Guardar cambios'}
          </button>
        </>
      )}
    </div>
  );
}