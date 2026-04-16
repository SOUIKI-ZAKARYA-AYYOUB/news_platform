'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ReactNode } from 'react';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';

export function RootLayoutClient({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ScrollToTopButton />
    </AuthProvider>
  );
}
