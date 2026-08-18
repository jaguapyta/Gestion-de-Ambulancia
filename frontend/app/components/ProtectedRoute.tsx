'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  children: React.ReactNode;
  rolesPermitidos?: string[];
}

export default function ProtectedRoute({ children, rolesPermitidos }: Props) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');

    // Sin sesión: al login
    if (!token || !usuarioStr) {
      router.replace('/login');
      return;
    }

    // Con sesión pero sin permiso: de vuelta al selector de módulos.
    // Mandarlo al login sería confuso, porque su sesión sigue siendo válida.
    if (rolesPermitidos && rolesPermitidos.length > 0) {
      const usuario = JSON.parse(usuarioStr);
      if (!rolesPermitidos.includes(usuario.rol)) {
        router.replace('/dashboard');
        return;
      }
    }

    setAutorizado(true);
  }, []);

  if (!autorizado) {
    return (
      <div style={{
        minHeight: '50vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '14px', color: '#9ca3af' }}>Verificando acceso...</div>
      </div>
    );
  }

  return <>{children}</>;
}