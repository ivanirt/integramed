import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('integramed_lang');
      if (saved === 'es' || saved === 'en') return saved;
      // Auto-detect browser language
      if (typeof navigator !== 'undefined' && navigator.language?.startsWith('es')) {
        return 'es';
      }
    } catch {
      // ignore storage error
    }
    return 'en';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('integramed_lang', lang);
    } catch {
      // ignore
    }
  };

  const t = (key, params = {}) => {
    const dict = translations[language] || translations.en;
    let text = dict[key] || translations.en[key] || key;

    // Replace {placeholder} params
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]));
    });

    return text;
  };

  const locale = language === 'es' ? 'es-ES' : 'en-US';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
