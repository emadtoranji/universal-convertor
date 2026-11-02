import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { t } from '../utils/i18n';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
}): React.ReactElement => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.innerHTML = '';
    const anchor = document.createElement('a');
    anchor.className = 'github-button';
    anchor.href = 'https://github.com/emadtoranji/universal-convertor';
    anchor.setAttribute('data-icon', 'octicon-star');
    anchor.setAttribute('data-size', 'large');
    anchor.setAttribute('data-show-count', 'true');
    anchor.setAttribute(
      'data-color-scheme',
      isDark
        ? 'no-preference: dark; light: dark; dark: dark;'
        : 'no-preference: light; light: light; dark: light;'
    );
    anchor.setAttribute(
      'aria-label',
      'Star emadtoranji/universal-convertor on GitHub'
    );
    anchor.textContent = 'Star';
    container.appendChild(anchor);

    const oldScript = document.getElementById('github-buttons-script');
    if (oldScript) {
      oldScript.remove();
    }
    const script = document.createElement('script');
    script.id = 'github-buttons-script';
    script.src = 'https://buttons.github.io/buttons.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, [isDark]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent truncate">
                {t.header.brand.name}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 hidden xs:block truncate">
              {t.header.brand.tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">{t.header.brand.badge}</span>
          </div>

          <div
            ref={containerRef}
            className="flex items-center min-h-[28px] min-w-[90px] sm:min-w-[150px] justify-center transition-all duration-200"
          >
            <a
              className="github-button inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
              href="https://github.com/emadtoranji/universal-convertor"
              data-icon="octicon-star"
              data-size="large"
              data-show-count="true"
              data-color-scheme={
                isDark
                  ? 'no-preference: dark; light: dark; dark: dark;'
                  : 'no-preference: light; light: light; dark: light;'
              }
              aria-label="Star emadtoranji/universal-convertor on GitHub"
            >
              Star
            </a>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            aria-label={t.header.themeToggle.ariaLabel}
            title={isDark ? t.header.themeToggle.lightTitle : t.header.themeToggle.darkTitle}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export const Header = React.memo(HeaderComponent);
