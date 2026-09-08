'use client';

import ProtectedRoute from '../../components/ProtectedRoute';
import SidebarColapsable from '../../components/SidebarColapsable';
import { OPERACION_REGULACION } from '../../../lib/permisos';

const RRHH = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA'];
const OPER = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'ARM', 'MEDICO_REGULADOR'];

const grupos = [
  {
    titulo: 'Operación',
    items: [
      { href: '/dashboard/sala-operaciones/recepcion', label: 'Recepción de solicitudes', icon: '📞', roles: OPER },
      { href: '/dashboard/sala-operaciones/despacho', label: 'Despacho', icon: '🚨', roles: OPER },
      { href: '/dashboard/sala-operaciones/regulacion', label: 'Regulación médica', icon: '🩺', roles: OPER },
      { href: '/dashboard/sala-operaciones/pacientes-dializados', label: 'Pacientes dializados', icon: '🩸', roles: ['ADMINISTRADOR', 'COORDINADOR_REGULACION'] },
      { href: '/dashboard/sala-operaciones/protocolo', label: 'Protocolo emergencias', icon: '🚨', roles: ['ADMINISTRADOR', 'COORDINADOR_REGULACION'] },
      { href: '/dashboard/sala-operaciones/sinonimos', label: 'Sinónimos', icon: '🔤', roles: ['ADMINISTRADOR', 'COORDINADOR_REGULACION'] },
    ],
  },
  {
    titulo: 'Recursos Humanos',
    items: [
      { href: '/dashboard/sala-operaciones/recursos-humanos/medicos', label: 'Médicos reguladores', icon: '🩺', roles: RRHH },
      { href: '/dashboard/sala-operaciones/recursos-humanos/arm', label: 'ARM', icon: '📻', roles: RRHH },
      { href: '/dashboard/sala-operaciones/recursos-humanos/supervisores', label: 'Supervisores', icon: '🎖️', roles: ['ADMINISTRADOR', 'COORDINADOR_REGULACION'] },
    ],
  },
];

export default function SalaOperacionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute rolesPermitidos={[...OPERACION_REGULACION]}>
      <div style={{ display: 'flex', gap: '24px', minHeight: 'calc(100vh - 112px)' }}>
        <SidebarColapsable titulo="Centro de Regulación" grupos={grupos} />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </ProtectedRoute>
  );
}