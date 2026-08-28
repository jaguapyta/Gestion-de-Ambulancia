'use client';

import ProtectedRoute from '../../components/ProtectedRoute';
import SidebarColapsable from '../../components/SidebarColapsable';
import { ACCESO } from '../../../lib/permisos';

const subMenu = [
  { href: '/dashboard/coordinacion-operativa/paramedicos', label: 'Paramédicos', icon: '👨‍⚕️' },
  { href: '/dashboard/coordinacion-operativa/guardias', label: 'Guardias', icon: '📋' },
  { href: '/dashboard/coordinacion-operativa/tablero', label: 'Tablero operativo', icon: '🖥️' },
];

export default function CoordinacionOperativaLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute rolesPermitidos={[...ACCESO['coordinacion-operativa']]}>
      <div style={{ display: 'flex', gap: '24px', minHeight: 'calc(100vh - 112px)' }}>
        <SidebarColapsable titulo="Coordinación Operativa" items={subMenu} />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </ProtectedRoute>
  );
}