'use client';

import { useEffect, useState } from 'react';

interface Tripulante {
  id: number;
  funcion: string;
  usuario: {
    persona: {
      primer_nombre: string;
      primer_apellido: string;
    }
  };
}

interface MovilGuardia {
  id: number;
  estado: string;
  movil: { id: number; cod_movil: string; tipo: string };
  base: { id: number; nombre: string };
  tipo_soporte: { id: number; nombre: string };
  tripulacion: Tripulante[];
}

interface Guardia {
  id: number;
  codigo: string;
  tipo: string;
  nombre: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  usuario: { persona: { primer_nombre: string; primer_apellido: string } };
  rol_guardia_movil: MovilGuardia[];
}

const coloresEstado: Record<string, { bg: string; color: string; label: string }> = {
  DISPONIBLE: { bg: '#f0fdf4', color: '#15803d', label: 'Disponible' },
  ASIGNADO: { bg: '#eff6ff', color: '#1d4ed8', label: 'Asignado' },
  EN_CAMINO: { bg: '#fefce8', color: '#a16207', label: 'En camino' },
  EN_LUGAR: { bg: '#fff7ed', color: '#c2410c', label: 'En lugar' },
  PACIENTE_ABORDO: { bg: '#f5f3ff', color: '#7c3aed', label: 'Paciente abordo' },
  EN_DESTINO: { bg: '#fdf4ff', color: '#a21caf', label: 'En destino' },
  RETORNA: { bg: '#f0fdf4', color: '#0f766e', label: 'Retorna' },
  FUERA_DE_SERVICIO: { bg: '#fef2f2', color: '#dc2626', label: 'Fuera de servicio' },
};

export default function TableroPage() {
  const [guardia, setGuardia] = useState<Guardia | null>(null);
  const [cargando, setCargando] = useState(true);

  const token = () => localStorage.getItem('token') ?? '';

  const cargarGuardiaActiva = () => {
    fetch('http://localhost:3001/api/guardias/activa', {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(data => setGuardia(data))
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarGuardiaActiva();
    const interval = setInterval(cargarGuardiaActiva, 30000);
    return () => clearInterval(interval);
  }, []);

  const getNombre = (persona: any) => `${persona.primer_nombre} ${persona.primer_apellido}`;

  const conductor = (tripulacion: Tripulante[]) =>
    tripulacion.find(t => t.funcion === 'CONDUCTOR');

  const paramedicos = (tripulacion: Tripulante[]) =>
    tripulacion.filter(t => t.funcion === 'PARAMÉDICO');

  if (cargando) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
      Cargando tablero operativo...
    </div>
  );

  if (!guardia) return (
    <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', border: '0.5px solid #e5e7eb' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔴</div>
      <div style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', marginBottom: '8px' }}>No hay guardia activa</div>
      <div style={{ fontSize: '13px', color: '#6b7280' }}>Activá una guardia desde el módulo de Guardias para ver el tablero operativo.</div>
    </div>
  );

  const stats = {
    total: guardia.rol_guardia_movil.length,
    disponibles: guardia.rol_guardia_movil.filter(m => m.estado === 'DISPONIBLE').length,
    enServicio: guardia.rol_guardia_movil.filter(m => ['ASIGNADO', 'EN_CAMINO', 'EN_LUGAR', 'PACIENTE_ABORDO', 'EN_DESTINO', 'RETORNA'].includes(m.estado)).length,
    fueraServicio: guardia.rol_guardia_movil.filter(m => m.estado === 'FUERA_DE_SERVICIO').length,
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>
              Tablero operativo
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              {guardia.codigo} — {guardia.nombre ?? 'Turno regular'} |
              📅 {new Date(guardia.fecha_inicio).toLocaleString('es-PY')} → {new Date(guardia.fecha_fin).toLocaleString('es-PY')}
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
              ℹ️ Solo visualización — los cambios de estado son gestionados por Centro de Regulación
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803d' }}></div>
            <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '500' }}>GUARDIA ACTIVA</span>
            <button onClick={cargarGuardiaActiva} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total móviles', value: stats.total, color: '#0a2540' },
          { label: 'Disponibles', value: stats.disponibles, color: '#15803d' },
          { label: 'En servicio', value: stats.enServicio, color: '#c2410c' },
          { label: 'Fuera de servicio', value: stats.fueraServicio, color: '#dc2626' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: '22px', fontWeight: '500', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {guardia.rol_guardia_movil.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9ca3af', border: '0.5px solid #e5e7eb' }}>
          No hay móviles asignados a esta guardia
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {guardia.rol_guardia_movil.map(m => (
            <div key={m.id} style={{
              background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb',
              overflow: 'hidden',
              borderTop: `4px solid ${coloresEstado[m.estado]?.color ?? '#9ca3af'}`
            }}>
              {/* Header del móvil */}
              <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#0a2540' }}>🚑 {m.movil.cod_movil}</span>
                  <span style={{
                    background: coloresEstado[m.estado]?.bg ?? '#f9fafb',
                    color: coloresEstado[m.estado]?.color ?? '#6b7280',
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600'
                  }}>
                    {coloresEstado[m.estado]?.label ?? m.estado}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  📍 {m.base.nombre} | {m.tipo_soporte.nombre}
                </div>
              </div>

              {/* Tripulación */}
              <div style={{ padding: '12px 16px' }}>
                {conductor(m.tripulacion) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', background: '#fff7ed', color: '#c2410c', padding: '2px 8px', borderRadius: '20px', fontWeight: '500' }}>CONDUCTOR</span>
                    <span style={{ fontSize: '13px', color: '#0a2540' }}>{getNombre(conductor(m.tripulacion)!.usuario.persona)}</span>
                  </div>
                )}
                {paramedicos(m.tripulacion).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '20px', fontWeight: '500' }}>PARAMÉDICO</span>
                    <span style={{ fontSize: '13px', color: '#0a2540' }}>{getNombre(p.usuario.persona)}</span>
                  </div>
                ))}
                {m.tripulacion.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>Sin tripulación asignada</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 