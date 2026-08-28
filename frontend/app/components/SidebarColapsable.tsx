'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

type Item = { href: string; label: string; icon: string; roles?: string[] };
type Grupo = { titulo?: string; items: Item[] };

export default function SidebarColapsable({ titulo, grupos, items }: { titulo: string; grupos?: Grupo[]; items?: Item[] }) {
  const pathname = usePathname();
  const [rol, setRol] = useState('');
  const [col, setCol] = useState(false);

  useEffect(() => {
    try { setRol(JSON.parse(localStorage.getItem('usuario') ?? '{}').rol ?? ''); } catch { }
    setCol(localStorage.getItem('sidebar_colapsado') === '1');
  }, []);

  const toggle = () => { const n = !col; setCol(n); localStorage.setItem('sidebar_colapsado', n ? '1' : '0'); };

  const gs: Grupo[] = grupos ?? [{ items: items ?? [] }];

  return (
    <aside style={{
      width: col ? '56px' : '210px', flexShrink: 0, background: 'white', borderRadius: '10px',
      border: '0.5px solid #e5e7eb', padding: '8px', alignSelf: 'flex-start',
      position: 'sticky', top: '80px', transition: 'width 0.18s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: col ? 'center' : 'space-between', padding: '4px 6px 4px 10px', gap: '6px' }}>
        {!col && <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo}</span>}
        <button onClick={toggle} title={col ? 'Expandir menú' : 'Colapsar menú'} aria-label={col ? 'Expandir menú' : 'Colapsar menú'} style={{
          background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af',
          fontSize: '16px', lineHeight: 1, padding: '4px', borderRadius: '6px', flexShrink: 0,
        }}>{col ? '»' : '«'}</button>
      </div>

      {gs.map((g, gi) => {
        const its = g.items.filter(it => !it.roles || it.roles.includes(rol));
        if (its.length === 0) return null;
        return (
          <div key={g.titulo ?? gi} style={{ marginTop: '6px' }}>
            {!col && g.titulo && <div style={{ fontSize: '10px', color: '#c0c4cc', padding: '4px 10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g.titulo}</div>}
            {its.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} title={col ? item.label : undefined} style={{
                  display: 'flex', alignItems: 'center', gap: col ? 0 : '10px',
                  justifyContent: col ? 'center' : 'flex-start',
                  padding: col ? '9px 0' : '9px 10px', borderRadius: '7px', textDecoration: 'none',
                  fontSize: '13px', fontWeight: active ? 500 : 400,
                  color: active ? '#0a2540' : '#6b7280',
                  background: active ? '#f0f4f8' : 'transparent',
                  borderLeft: active && !col ? '3px solid #3b9eff' : '3px solid transparent',
                  transition: 'all 0.15s', whiteSpace: 'nowrap', overflow: 'hidden',
                }}>
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  {!col && item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}