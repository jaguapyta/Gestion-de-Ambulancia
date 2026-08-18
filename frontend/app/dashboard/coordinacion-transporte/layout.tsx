'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { ACCESO } from '../../../lib/permisos';

const subMenu = [
  { href: '/dashboard/coordinacion-transporte/conductores', label: 'Conductores', icon: '🚗' },
  { href: '/dashboard/coordinacion-transporte/moviles', label: 'Móviles', icon: '🚐' },
  { href: '/dashboard/coordinacion-transporte/ordenes', label: 'Órdenes de trabajo', icon: '📋' },
];

export default function CoordinacionTransporteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute rolesPermitidos={[...ACCESO['coordinacion-transporte']]}>
      <div style={{ display: 'flex', gap: '24px', minHeight: 'calc(100vh - 112px)' }}>
        <aside style={{
          width: '200px', flexShrink: 0,
          background: 'white', borderRadius: '10px',
          border: '0.5px solid #e5e7eb', padding: '8px',
          alignSelf: 'flex-start', position: 'sticky', top: '80px'
        }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', padding: '8px 10px 4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Coordinación Transporte
          </div>
          {subMenu.map(item => {
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
        </aside>

        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}