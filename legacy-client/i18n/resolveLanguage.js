/** UI language from a profile value. Only English when explicitly set; otherwise Spanish. */
export function resolvePreferredLanguage(value) {
  return value === 'en' ? 'en' : 'es';
}
