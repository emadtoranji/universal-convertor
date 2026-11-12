import React, { useState, useMemo, useCallback } from 'react';
import HelpCircle from 'lucide-react/icons/circle-question-mark';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Search from 'lucide-react/icons/search';
import X from 'lucide-react/icons/x';
import { t } from '../../utils/i18n';

export interface FaqItem {
    id: string;
    question: string;
    answer: string;
}

export interface FaqSectionProps {
    items?: FaqItem[];
    title?: string;
    subtitle?: string;
    badge?: string;
}

const FaqSectionComponent: React.FC<FaqSectionProps> = ({
    items,
    title,
    subtitle,
    badge,
}): React.ReactElement => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const effectiveTitle = title ?? t.faq.title;
    const effectiveSubtitle = subtitle ?? t.faq.subtitle;
    const effectiveBadge = badge ?? t.faq.badge;
    const allItems: FaqItem[] = useMemo(() => {
        return items ?? t.faq.items;
    }, [items]);

    const sanitizedQuery = useMemo(() => {
        return searchQuery.trim().toLowerCase();
    }, [searchQuery]);

    const filteredItems = useMemo(() => {
        if (!sanitizedQuery) {
            return allItems;
        }
        return allItems.filter((item) => {
            const matchQ = item.question.toLowerCase().includes(sanitizedQuery);
            const matchA = item.answer.toLowerCase().includes(sanitizedQuery);
            return matchQ || matchA;
        });
    }, [allItems, sanitizedQuery]);

    const handleToggle = useCallback((idx: number) => {
        setOpenIndex((prev) => (prev === idx ? null : idx));
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setOpenIndex(null);
    }, []);

    return (
        <section
            aria-label='Frequently Asked Questions'
            className='space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:rounded-3xl sm:p-7 dark:border-zinc-800/90 dark:bg-zinc-900/40'
        >
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-center gap-2.5'>
                    <div className='rounded-lg bg-indigo-100 p-1.5 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-400'>
                        <HelpCircle className='h-4 w-4' />
                    </div>
                    <div>
                        <h2 className='text-base font-bold text-zinc-900 sm:text-lg dark:text-zinc-100'>
                            {effectiveTitle}
                        </h2>
                        {effectiveSubtitle && (
                            <p className='text-xs text-zinc-500 dark:text-zinc-400'>
                                {effectiveSubtitle}
                            </p>
                        )}
                    </div>
                </div>

                <div className='flex items-center gap-2'>
                    {effectiveBadge && (
                        <div className='hidden items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-nowrap text-indigo-700 sm:inline-flex dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300'>
                            {effectiveBadge}
                        </div>
                    )}
                </div>
            </div>

            <div className='relative'>
                <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-600 dark:text-zinc-400'>
                    <Search className='h-4 w-4' />
                </div>
                <input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.faq.searchPlaceholder}
                    aria-label={t.faq.searchPlaceholder}
                    className='w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pr-9 pl-9 text-xs text-zinc-900 transition-colors placeholder:text-zinc-400 focus:border-cyan-500 focus:bg-white focus:ring-1 focus:ring-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-cyan-500 dark:focus:bg-zinc-900'
                />
                {searchQuery.length > 0 && (
                    <button
                        type='button'
                        onClick={handleClearSearch}
                        aria-label={t.faq.clearSearch}
                        className='absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    >
                        <X className='h-3.5 w-3.5' />
                    </button>
                )}
            </div>

            <div className='space-y-2.5 transition-all duration-200'>
                {filteredItems.length === 0 ? (
                    <div className='rounded-xl border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
                        {t('faq.empty', { query: searchQuery })}
                    </div>
                ) : (
                    filteredItems.map((faqItem, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <div
                                key={faqItem.id}
                                className='overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50 transition-colors duration-150 dark:border-zinc-800/80 dark:bg-zinc-950/50'
                            >
                                <button
                                    type='button'
                                    onClick={() => handleToggle(idx)}
                                    aria-expanded={isOpen}
                                    aria-controls={`faq-panel-${faqItem.id}`}
                                    className='flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-xs font-semibold text-zinc-900 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none sm:text-sm dark:text-zinc-100'
                                >
                                    <span>{faqItem.question}</span>
                                    <ChevronDown
                                        className={`h-4 w-4 flex-shrink-0 text-zinc-600 transition-transform duration-300 ease-out dark:text-zinc-400 ${
                                            isOpen
                                                ? 'rotate-180 text-cyan-500'
                                                : ''
                                        }`}
                                    />
                                </button>
                                <div
                                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                                        isOpen
                                            ? 'grid-rows-[1fr] opacity-100'
                                            : 'grid-rows-[0fr] opacity-0'
                                    }`}
                                >
                                    <div
                                        id={`faq-panel-${faqItem.id}`}
                                        role='region'
                                        className='overflow-hidden'
                                    >
                                        <div className='border-t border-zinc-200/50 px-4 pt-2 pb-3.5 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400'>
                                            {faqItem.answer}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
};

export const FaqSection = React.memo(FaqSectionComponent);
