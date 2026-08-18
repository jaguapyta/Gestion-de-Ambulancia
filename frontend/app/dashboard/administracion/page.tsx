'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdministracionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/administracion/usuarios');
  }, []);

  return null;
}
