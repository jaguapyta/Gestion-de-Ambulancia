'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CoordinacionTransportePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/coordinacion-transporte/conductores');
  }, []);

  return null;
}