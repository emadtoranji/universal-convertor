export type ThemeMode = 'dark' | 'light';

export const THEME_COOKIE_NAME = 'theme';
export const THEME_COOKIE_MAX_AGE = 31536000;

export function parseThemeFromCookieString(cookieStr: string): ThemeMode | null {
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  const value = decodeURIComponent(match[1]).trim().toLowerCase();
  if (value === 'dark' || value === 'light') return value;
  return null;
}

export function getThemeCookie(): ThemeMode | null {
  if (typeof document === 'undefined') return null;
  return parseThemeFromCookieString(document.cookie);
}

export function setThemeCookie(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(theme)}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
  try {
    localStorage.setItem('omni_theme', theme);
  } catch {}
}

export function getSystemTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function getOrInitEffectiveTheme(): ThemeMode {
  const existing = getThemeCookie();
  if (existing) {
    return existing;
  }
  const system = getSystemTheme();
  setThemeCookie(system);
  return system;
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
