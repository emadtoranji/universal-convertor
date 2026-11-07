import React from 'react';
import Scale from 'lucide-react/icons/scale';
import FileCode from 'lucide-react/icons/file-code';
import AlertTriangle from 'lucide-react/icons/triangle-alert';
import ShieldCheck from 'lucide-react/icons/shield-check';
import { t } from '../../utils/i18n';

export interface TermsItem {
    id: string;
    title: string;
    description: string;
}

export interface TermsSectionProps {
    items?: TermsItem[];
    title?: string;
    subtitle?: string;
    badge?: string;
}

const TermsSectionComponent: React.FC<TermsSectionProps> = ({
    items,
    title,
    subtitle,
    badge,
}): React.ReactElement => {
    const effectiveTitle = title ?? t.terms.title;
    const effectiveSubtitle = subtitle ?? t.terms.subtitle;
    const effectiveBadge = badge ?? t.terms.badge;
    const allItems: TermsItem[] = items ?? t.terms.items;

    return (
        <section
            aria-label='Terms of Service & Disclaimer'
            className='space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:rounded-3xl sm:p-7 dark:border-zinc-800/90 dark:bg-zinc-900/40'
        >
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2.5'>
                    <div className='rounded-lg bg-emerald-100 p-1.5 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400'>
                        <Scale className='h-4 w-4' />
                    </div>
                    <h2 className='text-base font-bold text-zinc-900 sm:text-lg dark:text-zinc-100'>
                        {effectiveTitle}
                    </h2>
                </div>
                {effectiveBadge && (
                    <div className='inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-nowrap text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'>
                        <FileCode className='h-3 w-3 text-cyan-500' />
                        <span>{effectiveBadge}</span>
                    </div>
                )}
            </div>

            {effectiveSubtitle && (
                <p className='text-xs leading-relaxed text-zinc-500 dark:text-zinc-400'>
                    {effectiveSubtitle}
                </p>
            )}

            <div className='grid grid-cols-1 gap-3.5 text-xs md:grid-cols-2'>
                {allItems.map((item) => (
                    <div
                        key={item.id}
                        className='space-y-1.5 rounded-xl border border-zinc-200/80 bg-zinc-50 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-950/60'
                    >
                        <div className='flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-200'>
                            {item.id === 'warranty' ||
                            item.id === 'liability' ? (
                                <AlertTriangle className='h-3.5 w-3.5 flex-shrink-0 text-amber-500' />
                            ) : item.id === 'privacy' ? (
                                <ShieldCheck className='h-3.5 w-3.5 flex-shrink-0 text-emerald-500' />
                            ) : (
                                <FileCode className='h-3.5 w-3.5 flex-shrink-0 text-cyan-500' />
                            )}
                            <span>{item.title}</span>
                        </div>
                        <p className='text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400'>
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export const TermsSection = React.memo(TermsSectionComponent);
