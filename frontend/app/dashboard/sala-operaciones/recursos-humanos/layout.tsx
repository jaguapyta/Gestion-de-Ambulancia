'use client';

import ProtectedRoute from '../../../components/ProtectedRoute';
import { RRHH_REGULACION } from '../../../../lib/permisos';

export default function RecursosHumanosLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute rolesPermitidos={[...RRHH_REGULACION]}>{children}</ProtectedRoute>;
}