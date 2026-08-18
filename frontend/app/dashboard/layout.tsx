'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { puedeVer, type Seccion } from '../../lib/permisos';

const menuItems: { href: string; label: string; seccion: Seccion }[] = [
  { href: '/dashboard/administracion', label: 'Administración', seccion: 'administracion' },
  { href: '/dashboard/sala-operaciones', label: 'Centro de regulación', seccion: 'sala-operaciones' },
  { href: '/dashboard/coordinacion-operativa', label: 'Coordinación operativa', seccion: 'coordinacion-operativa' },
  { href: '/dashboard/coordinacion-transporte', label: 'Coordinación de transporte', seccion: 'coordinacion-transporte' },
  { href: '/dashboard/servicios', label: 'Servicios', seccion: 'servicios' },
  { href: '/dashboard/estadisticas', label: 'Estadísticas', seccion: 'estadisticas' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<any>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

    useEffect(() => {
      const token = localStorage.getItem('token');
      if (!token) { router.replace('/login'); return; }

      fetch('http://localhost:3001/api/auth/verificar', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => {
          if (!r.ok) throw new Error('sesion invalida');
          return r.json();
        })
        .then(u => {
          // El rol viene del token firmado, no de lo que diga el localStorage
          setUsuario(u);
          localStorage.setItem('usuario', JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          router.replace('/login');
        });
    }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    router.push('/login');
  };

  const iniciales = usuario?.nombre
    ? usuario.nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
    : 'US';

  // Solo las secciones habilitadas para el rol del usuario
  const menuVisible = menuItems.filter(item => puedeVer(item.seccion, usuario?.rol));

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: 'sans-serif' }}>
      <header style={{
        background: '#0a2540',
        color: 'white',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: '56px',
        gap: '8px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
      }}>
        <Link href="/dashboard" style={{
          textDecoration: 'none',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
          marginRight: '16px',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🚑 SEME
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, overflowX: 'auto' }}>
          {menuVisible.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                textDecoration: 'none',
                color: active ? 'white' : 'rgba(255,255,255,0.65)',
                fontSize: '13px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: active ? 'rgba(59,158,255,0.25)' : 'transparent',
                borderBottom: active ? '2px solid #3b9eff' : '2px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                fontWeight: active ? '500' : '400',
              }}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ position: 'relative', marginLeft: '16px' }}>
          <div
            onClick={() => setMenuAbierto(!menuAbierto)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              background: menuAbierto ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#3b9eff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'white',
              flexShrink: 0
            }}>
              {iniciales}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'white', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                {usuario?.nombre ?? 'Cargando...'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>
                {usuario?.rol ?? ''}
              </div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>▼</span>
          </div>

          {menuAbierto && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '44px',
              background: 'white',
              borderRadius: '8px',
              minWidth: '200px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              border: '0.5px solid #e5e7eb',
              zIndex: 200
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #e5e7eb' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540' }}>
                  {usuario?.nombre}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{usuario?.rol}</div>
              </div>
              <button
                onClick={cerrarSesion}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🚪 Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main style={{ padding: '28px 32px' }}>
        {children}
      </main>
    </div>
  );
}