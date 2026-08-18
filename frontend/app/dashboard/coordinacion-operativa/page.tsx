'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CoordinacionOperativaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/coordinacion-operativa/guardias');
  }, []);

  return null;
}