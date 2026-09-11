'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';

interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  _count?: { usuario: number };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCargando(true);
    fetch(`${API_URL}/api/roles`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRoles(data); })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  }, []);

  const colores = [
    '#0a2540', '#1d4ed8', '#15803d', '#dc2626',
    '#d97706', '#7c3aed', '#0f766e', '#c2410c',
    '#854d0e'
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Roles</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Roles y permisos del sistema SEME</p>
      </div>

      {cargando ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando roles...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {roles.map((rol, i) => (
            <div key={rol.id} style={{
              background: 'white', borderRadius: '10px', padding: '20px',
              border: '0.5px solid #e5e7eb',
              borderLeft: `4px solid ${colores[i % colores.length]}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a2540', marginBottom: '6px' }}>
                    {rol.nombre}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {rol.descripcion ?? 'Sin descripción'}
                  </div>
                </div>
                <span style={{
                  background: '#f0f4f8', color: '#0a2540',
                  padding: '4px 10px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap'
                }}>
                  ID: {rol.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '24px', background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#c2410c', marginBottom: '6px' }}>
          ⚠️ Los roles no pueden ser modificados desde esta interfaz
        </div>
        <div style={{ fontSize: '12px', color: '#9a3412' }}>
          Los roles del sistema están predefinidos y su modificación requiere acceso directo a la base de datos. Contactá al administrador técnico del sistema.
        </div>
      </div>
    </div>
  );
}