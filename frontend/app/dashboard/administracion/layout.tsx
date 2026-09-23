'use client';

import ProtectedRoute from '../../components/ProtectedRoute';
import SidebarColapsable from '../../components/SidebarColapsable';
import { ACCESO } from '../../../lib/permisos';

const subMenu = [
  { href: '/dashboard/administracion/usuarios', label: 'Usuarios', icon: '👥' },
  { href: '/dashboard/administracion/moviles', label: 'Móviles', icon: '🚐' },
  { href: '/dashboard/administracion/bases', label: 'Bases', icon: '🏥' },
  { href: '/dashboard/administracion/roles', label: 'Roles', icon: '🔐' },
  { href: '/dashboard/administracion/configuracion', label: 'Configuración', icon: '⚙️' },
  { href: '/dashboard/administracion/plantillas', label: 'Documentos', icon: '📄' },  
  { href: '/dashboard/administracion/auditoria', label: 'Auditoría', icon: '🕵️' },
];

export default function AdministracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute rolesPermitidos={[...ACCESO.administracion]}>
      <div style={{ display: 'flex', gap: '24px', minHeight: 'calc(100vh - 112px)' }}>
        <SidebarColapsable titulo="Administración" items={subMenu} />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </ProtectedRoute>
  );
}