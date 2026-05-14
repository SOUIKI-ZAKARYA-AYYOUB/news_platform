'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ReactNode } from 'react';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@/context/I18nContext';

export function RootLayoutClient({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <I18nProvider>
        <AuthProvider>
          {children}
          <ScrollToTopButton />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
