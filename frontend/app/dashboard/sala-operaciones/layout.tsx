'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { RRHH_REGULACION } from '../../../lib/permisos';

// Por ahora el Centro de Regulación arranca con Recursos Humanos. Cuando se
// sumen Recepción de solicitudes / Despacho, se agregan como grupos nuevos.
const grupos = [
  {
    titulo: 'Recursos Humanos',
    items: [
      { href: '/dashboard/sala-operaciones/recursos-humanos/medicos', label: 'Médicos reguladores', icon: '🩺' },
      { href: '/dashboard/sala-operaciones/recursos-humanos/arm', label: 'ARM', icon: '📻' },
    ],
  },
];

export default function SalaOperacionesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute rolesPermitidos={[...RRHH_REGULACION]}>
      <div style={{ display: 'flex', gap: '24px', minHeight: 'calc(100vh - 112px)' }}>
        <aside style={{
          width: '200px', flexShrink: 0,
          background: 'white', borderRadius: '10px',
          border: '0.5px solid #e5e7eb', padding: '8px',
          alignSelf: 'flex-start', position: 'sticky', top: '80px'
        }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', padding: '8px 10px 4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Centro de Regulación
          </div>
          {grupos.map(g => (
            <div key={g.titulo} style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', color: '#c0c4cc', padding: '4px 10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {g.titulo}
              </div>
              {g.items.map(item => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 10px', borderRadius: '7px', textDecoration: 'none',
                    fontSize: '13px', fontWeight: active ? '500' : '400',
                    color: active ? '#0a2540' : '#6b7280',
                    background: active ? '#f0f4f8' : 'transparent',
                    borderLeft: active ? '3px solid #3b9eff' : '3px solid transparent',
                    transition: 'all 0.15s'
                  }}>
                    <span style={{ fontSize: '15px' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </aside>

        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}