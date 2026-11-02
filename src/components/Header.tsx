import React from 'react';
import {  Moon, Sun } from 'lucide-react';
import { t } from '../utils/i18n';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
}): React.ReactElement => {
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
          

          <a
            href="https://github.com/emadtoranji"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors inline-flex items-center justify-center cursor-pointer"
            aria-label={t.header.github.ariaLabel}
            title={t.header.github.title}
          >
            <svg
              className="w-4 h-4 fill-current text-zinc-800 dark:text-zinc-200"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </a>

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
