import fs from 'fs';
import path from 'path';

function settingsPath(projectRoot) {
  return path.join(projectRoot, 'data', 'vault-source-settings.json');
}

function emptySettings() {
  return { es: { disabled: [] }, en: { disabled: [] } };
}

export function loadVaultSourceSettings(projectRoot) {
  const file = settingsPath(projectRoot);
  try {
    if (!fs.existsSync(file)) return emptySettings();
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      es: { disabled: Array.isArray(parsed?.es?.disabled) ? parsed.es.disabled : [] },
      en: { disabled: Array.isArray(parsed?.en?.disabled) ? parsed.en.disabled : [] }
    };
  } catch {
    return emptySettings();
  }
}

export function saveVaultSourceSettings(projectRoot, next) {
  const file = settingsPath(projectRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const merged = {
    ...emptySettings(),
    ...next,
    es: { disabled: Array.isArray(next?.es?.disabled) ? next.es.disabled : [] },
    en: { disabled: Array.isArray(next?.en?.disabled) ? next.en.disabled : [] }
  };
  fs.writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return merged;
}

export function setSourceEnabled(projectRoot, language, sourceId, enabled) {
  const settings = loadVaultSourceSettings(projectRoot);
  const lang = language === 'en' ? 'en' : 'es';
  const disabled = new Set(settings[lang].disabled);
  if (enabled) disabled.delete(sourceId);
  else disabled.add(sourceId);
  settings[lang].disabled = [...disabled];
  return saveVaultSourceSettings(projectRoot, settings);
}

export function noteIsEnabled(note, disabledIds) {
  const disabled = new Set(disabledIds || []);
  const ids = (note.sources || []).map((source) => source.id).filter(Boolean);
  if (!ids.length) return true;
  return ids.some((id) => !disabled.has(id));
}
