import React from 'react';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import { t } from '../utils/i18n';

interface HeaderProps {
    isDark: boolean;
    onToggleTheme: () => void;
}

interface HeaderActionsProps {
    isDark: boolean;
    onToggleTheme: () => void;
    t: {
        header: {
            brand: {
                badge: string;
            };
            themeToggle: {
                ariaLabel: string;
                lightTitle: string;
                darkTitle: string;
            };
        };
    };
}

const HeaderComponent: React.FC<HeaderProps> = ({
    isDark,
    onToggleTheme,
}): React.ReactElement => {
    return (
        <header className='sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-xl transition-colors duration-200 dark:border-zinc-800/80 dark:bg-zinc-950/80'>
            <div className='mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6 lg:px-8'>
                <div className='flex min-w-0 items-center gap-2.5 sm:gap-3'>
                    <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                            <span className='truncate bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-sm font-bold tracking-tight text-transparent sm:text-lg dark:from-white dark:via-zinc-200 dark:to-zinc-400'>
                                {t.header.brand.name}
                            </span>
                        </div>
                        <p className='xs:block hidden truncate text-[10px] text-zinc-600 sm:text-xs dark:text-zinc-400'>
                            {t.header.brand.tagline}
                        </p>
                    </div>
                </div>

                <div className='flex h-9 w-fit flex-shrink-0 items-center gap-2 sm:gap-3'>
                    <a
                        href='https://github.com/emadtoranji/universal-convertor'
                        target='_blank'
                        rel='noopener noreferrer'
                        aria-label='Star emadtoranji/universal-convertor on GitHub'
                        className='group inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 px-3 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800'
                    >
                        <svg
                            viewBox='0 0 24 24'
                            aria-hidden='true'
                            className='h-4 w-4 fill-current text-zinc-700 dark:text-zinc-300'
                        >
                            <path
                                fillRule='evenodd'
                                clipRule='evenodd'
                                d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
                            />
                        </svg>

                        <span className='hidden font-medium sm:inline'>
                            GitHub
                        </span>

                    </a>

                    <button
                        type='button'
                        onClick={onToggleTheme}
                        className='inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        aria-label={t.header.themeToggle.ariaLabel}
                        title={
                            isDark
                                ? t.header.themeToggle.lightTitle
                                : t.header.themeToggle.darkTitle
                        }
                    >
                        {isDark ? (
                            <Sun className='h-4 w-4 text-amber-500 dark:text-amber-400' />
                        ) : (
                            <Moon className='h-4 w-4 text-indigo-600' />
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};

export const Header = React.memo(HeaderComponent);
