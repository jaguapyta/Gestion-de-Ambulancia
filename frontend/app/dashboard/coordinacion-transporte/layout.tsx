'use client';

import ProtectedRoute from '../../components/ProtectedRoute';
import SidebarColapsable from '../../components/SidebarColapsable';
import { ACCESO } from '../../../lib/permisos';

const subMenu = [
  { href: '/dashboard/coordinacion-transporte/conductores', label: 'Conductores', icon: '🚗' },
  { href: '/dashboard/coordinacion-transporte/moviles', label: 'Móviles', icon: '🚐' },
  { href: '/dashboard/coordinacion-transporte/ordenes', label: 'Órdenes de trabajo', icon: '📋' },
];

export default function CoordinacionTransporteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute rolesPermitidos={[...ACCESO['coordinacion-transporte']]}>
      <div style={{ display: 'flex', gap: '24px', minHeight: 'calc(100vh - 112px)' }}>
        <SidebarColapsable titulo="Coordinación Transporte" items={subMenu} />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </ProtectedRoute>
  );
}