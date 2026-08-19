'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalaOperacionesPage() {
  const router = useRouter();
  useEffect(() => {
    let rol = '';
    try { rol = JSON.parse(localStorage.getItem('usuario') ?? '{}').rol ?? ''; } catch { }
    const destino = (rol === 'ARM' || rol === 'MEDICO_REGULADOR')
      ? '/dashboard/sala-operaciones/recepcion'
      : '/dashboard/sala-operaciones/recursos-humanos/medicos';
    router.replace(destino);
  }, []);
  return null;
}