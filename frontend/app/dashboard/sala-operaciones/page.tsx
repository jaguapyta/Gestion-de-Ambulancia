'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalaOperacionesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/sala-operaciones/recursos-humanos/medicos');
  }, []);
  return null;
}