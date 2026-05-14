'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../locales/en.json';

type Locale = 'en';
type Dictionary = typeof en;

interface I18nContextType {
  locale: Locale;
  t: (key: string) => string;
}

const dictionaries: Record<Locale, Dictionary> = { en };

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale] = useState<Locale>('en');

  useEffect(() => {
    // Force LTR and English lang attribute since we are removing multi-language UI
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }, []);

  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = dictionaries[locale];
    
    for (const k of keys) {
      if (result[k] === undefined) {
        // Fallback to English if key missing
        let fallback: any = dictionaries['en'];
        for (const fk of keys) {
           if (fallback[fk] === undefined) return key;
           fallback = fallback[fk];
        }
        return fallback;
      }
      result = result[k];
    }
    
    return result || key;
  };

  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
