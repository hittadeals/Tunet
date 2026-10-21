import { getLocaleForLanguage } from '../i18n/languageUtils';

/**
 * The locale the user picked in the app. Date, time and number formatting
 * outside React components (charts, history graphs, modals) used to follow the
 * browser locale instead, which left the UI in the operating system language
 * when German or Norwegian was selected.
 */
let appLocale = getLocaleForLanguage('en');

export function setAppLocale(language) {
  appLocale = getLocaleForLanguage(language);
}

export function getAppLocale() {
  return appLocale;
}

/**
 * Format a number with the app locale.
 */
export function formatNumber(value, options) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return Number(value).toLocaleString(appLocale, options);
}

/**
 * Format a date with the app locale.
 */
export function formatDate(value, options) {
  if (!value) return '--';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString(appLocale, options);
}

/**
 * Format a time with the app locale.
 */
export function formatTime(value, options) {
  if (!value) return '--';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString(appLocale, options);
}
