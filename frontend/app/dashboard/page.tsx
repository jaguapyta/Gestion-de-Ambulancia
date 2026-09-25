'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const modulosPorRol: Record<string, { label: string; desc: string; href: string; color: string; icon: string }[]> = {
  ADMINISTRADOR: [
    { label: 'Administración', desc: 'Usuarios, móviles, bases y configuración', href: '/dashboard/administracion', color: '#0a2540', icon: '⚙️' },
    { label: 'Centro de regulación', desc: 'Recepción, despacho y regulación médica', href: '/dashboard/sala-operaciones', color: '#1d4ed8', icon: '🚨' },
    { label: 'Coordinación operativa', desc: 'Guardias y tripulación', href: '/dashboard/coordinacion-operativa', color: '#0f6e56', icon: '🎯' },
    { label: 'Coordinación de transporte', desc: 'Órdenes de trabajo y traslados', href: '/dashboard/coordinacion-transporte', color: '#854f0b', icon: '🚐' },
    { label: 'Servicios', desc: 'Panel de tripulación en servicio', href: '/dashboard/servicios', color: '#7c3aed', icon: '👨‍⚕️' },
    { label: 'Estadísticas', desc: 'Reportes e indicadores del sistema', href: '/dashboard/estadisticas', color: '#0f766e', icon: '📊' },
  ],
  SUPERVISOR_GUARDIA: [
    { label: 'Centro de regulación', desc: 'Supervisión de operaciones activas', href: '/dashboard/sala-operaciones', color: '#1d4ed8', icon: '🚨' },
    { label: 'Coordinación operativa', desc: 'Coordinación del turno de guardia', href: '/dashboard/coordinacion-operativa', color: '#0f6e56', icon: '🎯' },
  ],
  ARM: [
    { label: 'Centro de regulación', desc: 'Recepción y regulación médica', href: '/dashboard/sala-operaciones', color: '#1d4ed8', icon: '🚨' },
  ],
  MEDICO_REGULADOR: [
    { label: 'Centro de regulación', desc: 'Regulación médica de solicitudes', href: '/dashboard/sala-operaciones', color: '#1d4ed8', icon: '🚨' },
  ],
  PARAMEDICO: [
    { label: 'Servicios', desc: 'Panel de tripulación y atención', href: '/dashboard/servicios', color: '#7c3aed', icon: '👨‍⚕️' },
  ],
  CONDUCTOR: [
    { label: 'Servicios', desc: 'Panel de conducción y servicios', href: '/dashboard/servicios', color: '#7c3aed', icon: '🚑' },
  ],
  COORDINADOR_OPERATIVO: [
    { label: 'Centro de regulación', desc: 'Monitoreo de solicitudes activas', href: '/dashboard/sala-operaciones', color: '#1d4ed8', icon: '🚨' },
    { label: 'Coordinación operativa', desc: 'Guardias y tripulación', href: '/dashboard/coordinacion-operativa', color: '#0f6e56', icon: '🎯' },
  ],
  COORDINADOR_TRANSPORTE: [
    { label: 'Coordinación de transporte', desc: 'Gestión de órdenes de trabajo', href: '/dashboard/coordinacion-transporte', color: '#854f0b', icon: '🚐' },
  ],
  ASISTENTE_TRANSPORTE: [
    { label: 'Coordinación de transporte', desc: 'Emisión de órdenes de trabajo', href: '/dashboard/coordinacion-transporte', color: '#854f0b', icon: '🚐' },
  ],
  COORDINADOR_REGULACION: [
    { label: 'Centro de regulación', desc: 'Jefatura del centro de regulación', href: '/dashboard/sala-operaciones', color: '#1d4ed8', icon: '🚨' },
    { label: 'Servicios', desc: 'Panel de tripulación en servicio', href: '/dashboard/servicios', color: '#7c3aed', icon: '👨‍⚕️' },
    { label: 'Estadísticas', desc: 'Reportes e indicadores del área', href: '/dashboard/estadisticas', color: '#0f766e', icon: '📊' },
  ],
  DIRECCION: [
    { label: 'Centro de regulación', desc: 'Supervisión de recepción, despacho y regulación', href: '/dashboard/sala-operaciones', color: '#1d4ed8', icon: '🚨' },
    { label: 'Coordinación operativa', desc: 'Supervisión de guardias y tripulación', href: '/dashboard/coordinacion-operativa', color: '#0f6e56', icon: '🎯' },
    { label: 'Coordinación de transporte', desc: 'Supervisión de órdenes de trabajo', href: '/dashboard/coordinacion-transporte', color: '#854f0b', icon: '🚐' },
    { label: 'Servicios', desc: 'Panel de tripulación en servicio', href: '/dashboard/servicios', color: '#7c3aed', icon: '👨‍⚕️' },
    { label: 'Estadísticas', desc: 'Reportes e indicadores del sistema', href: '/dashboard/estadisticas', color: '#0f766e', icon: '📊' },
  ],
};

export default function DashboardPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [modulos, setModulos] = useState<any[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem('usuario');
    if (!userData) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userData);
    setUsuario(user);
    setModulos(modulosPorRol[user.rol] ?? []);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#0a2540', margin: 0 }}>
          Bienvenido, {usuario?.nombre?.split(' ')[0] ?? 'Usuario'}
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
          {new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '500', color: '#0a2540', margin: '0 0 14px' }}>
          Módulos disponibles
        </h2>

        {modulos.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '10px', padding: '40px',
            border: '0.5px solid #e5e7eb', textAlign: 'center', color: '#6b7280'
          }}>
            No tenés módulos asignados. Contactá al administrador.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {modulos.map(a => (
              <div
                key={a.label}
                onClick={() => router.push(a.href)}
                style={{
                  background: 'white', borderRadius: '10px', padding: '24px',
                  border: '0.5px solid #e5e7eb', cursor: 'pointer',
                  borderLeft: `4px solid ${a.color}`,
                  transition: 'box-shadow 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{a.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: '500', color: '#0a2540', marginBottom: '6px' }}>
                  {a.label}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{a.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}