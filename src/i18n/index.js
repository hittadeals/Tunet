export { default as en } from './en.json';
export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  LEGACY_NN_MIGRATION_FLAG,
  normalizeLanguage,
  getLocaleForLanguage,
} from './languageUtils';
import { DEFAULT_LANGUAGE, normalizeLanguage } from './languageUtils';

// Only English ships in the initial bundle. Other languages are loaded on
// demand so the PWA does not download and parse every translation on startup.
const LANGUAGE_LOADERS = {
  nb: () => import('./nb.json'),
  nn: () => import('./nn.json'),
  sv: () => import('./sv.json'),
  de: () => import('./de.json'),
  zh: () => import('./zh.json'),
  fr: () => import('./fr.json'),
  es: () => import('./es.json'),
};

const languageCache = new Map();

export function loadLanguagePack(language) {
  const code = normalizeLanguage(language);
  if (code === DEFAULT_LANGUAGE) return Promise.resolve(null);
  if (languageCache.has(code)) return languageCache.get(code);

  const loader = LANGUAGE_LOADERS[code];
  if (!loader) return Promise.resolve(null);

  const promise = loader()
    .then((module) => module.default)
    .catch(() => null);
  languageCache.set(code, promise);
  return promise;
}
