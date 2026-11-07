import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Calendar from 'lucide-react/icons/calendar';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import Copy from 'lucide-react/icons/copy';
import Check from 'lucide-react/icons/check';
import Clock from 'lucide-react/icons/clock';
import Sparkles from 'lucide-react/icons/sparkles';
import ArrowRightLeft from 'lucide-react/icons/arrow-right-left';
import ChevronUp from 'lucide-react/icons/chevron-up';
import ChevronDown from 'lucide-react/icons/chevron-down';
import { Header } from '../components/layout/Header';
import { FaqSection } from '../components/shared/FaqSection';
import { TermsSection } from '../components/shared/TermsSection';
import {
    fromGregorian,
    fromJalali,
    fromHijri,
    getTodayCalendarInfo,
    getDaysInJalaliMonth,
    getDaysInGregorianMonth,
    getDaysInHijriMonth,
    JALALI_MONTH_NAMES_EN,
    GREGORIAN_MONTH_NAMES_EN,
    HIJRI_MONTH_NAMES_EN,
    type CalendarInfo,
} from '../utils/calendarConverter';
import {
    getOrInitEffectiveTheme,
    setThemeCookie,
    applyThemeToDocument,
    ThemeMode,
} from '../utils/theme';

export function DatePage(): React.ReactElement {
    const [isDark, setIsDark] = useState<boolean>(
        () => getOrInitEffectiveTheme() === 'dark',
    );
    const [calendarInfo, setCalendarInfo] = useState<CalendarInfo>(() =>
        getTodayCalendarInfo(),
    );
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    useEffect(() => {
        const theme: ThemeMode = isDark ? 'dark' : 'light';
        applyThemeToDocument(theme);
        setThemeCookie(theme);
    }, [isDark]);

    const handleToggleTheme = useCallback(() => {
        setIsDark((prev) => !prev);
    }, []);

    const handleResetToday = useCallback(() => {
        setCalendarInfo(getTodayCalendarInfo());
    }, []);

    const handleJalaliChange = useCallback(
        (year: number, month: number, day: number) => {
            setCalendarInfo(fromJalali(year, month, day));
        },
        [],
    );

    const handleGregorianChange = useCallback(
        (year: number, month: number, day: number) => {
            setCalendarInfo(fromGregorian(year, month, day));
        },
        [],
    );

    const handleHijriChange = useCallback(
        (year: number, month: number, day: number) => {
            setCalendarInfo(fromHijri(year, month, day));
        },
        [],
    );

    const handleCopy = useCallback((text: string, key: string) => {
        if (!navigator.clipboard) {
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            setCopiedKey(key);
            setTimeout(() => {
                setCopiedKey((curr) => (curr === key ? null : curr));
            }, 1800);
        });
    }, []);

    const jalaliDaysCount = useMemo(
        () =>
            getDaysInJalaliMonth(
                calendarInfo.jalali.year,
                calendarInfo.jalali.month,
            ),
        [calendarInfo.jalali.year, calendarInfo.jalali.month],
    );

    const gregorianDaysCount = useMemo(
        () =>
            getDaysInGregorianMonth(
                calendarInfo.gregorian.year,
                calendarInfo.gregorian.month,
            ),
        [calendarInfo.gregorian.year, calendarInfo.gregorian.month],
    );

    const hijriDaysCount = useMemo(
        () =>
            getDaysInHijriMonth(
                calendarInfo.hijri.year,
                calendarInfo.hijri.month,
            ),
        [calendarInfo.hijri.year, calendarInfo.hijri.month],
    );

    const dateFaqItems = useMemo(
        () => [
            {
                id: 'date-privacy',
                question:
                    'Is the date conversion performed entirely in my browser?',
                answer: 'Yes, 100%. The date converter uses deterministic astronomical algorithms and standard client-side browser Intl APIs. Zero date queries, location metrics, or timestamps are ever transmitted to any remote server or external API.',
            },
            {
                id: 'date-accuracy',
                question:
                    'How accurate are the Solar Hijri (Jalali) and Lunar Hijri conversions?',
                answer: 'The Jalali calendar engine implements the official astronomical 33-year leap cycle algorithm with 100% precision for historical, present, and future dates. The Lunar Hijri calendar adheres to the Umm al-Qura standard via high-precision client-side astronomical calculation.',
            },
            {
                id: 'date-leap-detection',
                question:
                    'How does the converter calculate and display leap years?',
                answer: 'Leap years are dynamically calculated in real time across all three calendars simultaneously. When an active year is a leap year (kabiseh in Jalali / leap in Gregorian / kabisa in Hijri), a dedicated badge appears instantly on the respective card and in the detailed metrics section.',
            },
            {
                id: 'date-shortcuts',
                question:
                    'Can I step dates forwards and backwards with one click?',
                answer: 'Yes. Each calendar panel includes stepper controls for incrementing and decrementing days, quick-select dropdown menus for months and days, direct numeric year editing, and a universal "Today" reset button.',
            },
        ],
        [],
    );

    return (
        <div className='min-h-screen bg-zinc-50 font-sans text-zinc-900 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100'>
            <Header
                isDark={isDark}
                onToggleTheme={handleToggleTheme}
                currentPath='/date'
            />

            <main className='mx-auto max-w-7xl space-y-6 px-3 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8'>
                <section
                    aria-label='Date Conversion Workspace'
                    className='space-y-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:rounded-3xl sm:p-7 dark:border-zinc-800/90 dark:bg-zinc-900/40'
                >
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='space-y-1'>
                            <div className='flex items-center gap-2.5'>
                                <div className='rounded-xl bg-cyan-100 p-2 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-400'>
                                    <Calendar className='h-5 w-5' />
                                </div>
                                <h1 className='text-lg font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100'>
                                    Universal Date & Calendar Converter
                                </h1>
                            </div>
                            <p className='text-xs leading-relaxed text-zinc-600 sm:text-sm dark:text-zinc-400'>
                                Instant three-way synchronization across Solar
                                Hijri, Gregorian, and Lunar Hijri calendars.
                            </p>
                        </div>

                        <div className='flex items-center gap-2'>
                            <button
                                type='button'
                                onClick={handleResetToday}
                                className='inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-800'
                            >
                                <RotateCcw className='h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400' />
                                <span>Today</span>
                            </button>
                        </div>
                    </div>

                    <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                        <div className='flex flex-col justify-between rounded-2xl border border-cyan-200/80 bg-gradient-to-b from-cyan-50/50 to-white p-4 shadow-xs dark:border-cyan-900/40 dark:from-cyan-950/20 dark:to-zinc-900/60 sm:p-5'>
                            <div className='space-y-4'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <span className='h-2.5 w-2.5 rounded-full bg-cyan-500' />
                                        <h2 className='text-sm font-bold text-zinc-900 sm:text-base dark:text-zinc-100'>
                                            Solar Hijri (Jalali)
                                        </h2>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            calendarInfo.isJalaliLeap
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                        }`}
                                    >
                                        {calendarInfo.isJalaliLeap
                                            ? 'Leap Year'
                                            : 'Standard Year'}
                                    </span>
                                </div>

                                <div className='rounded-xl border border-zinc-200/70 bg-white/80 p-3 text-center dark:border-zinc-800/80 dark:bg-zinc-950/70'>
                                    <div className='text-base font-extrabold text-cyan-700 sm:text-lg dark:text-cyan-400'>
                                        {calendarInfo.formatted.jalaliFull}
                                    </div>
                                    <div className='mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400'>
                                        {calendarInfo.formatted.jalaliIso}
                                    </div>
                                </div>

                                <div className='space-y-3 pt-1'>
                                    <div className='grid grid-cols-3 gap-2 text-xs'>
                                        <div className='space-y-1.5'>
                                            <div className='flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400'>
                                                <span>Year</span>
                                            </div>
                                            <div className='relative flex items-center rounded-xl border border-zinc-200 bg-white shadow-xs transition-colors focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900'>
                                                <input
                                                    type='number'
                                                    min={1}
                                                    max={3000}
                                                    value={calendarInfo.jalali.year}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val > 0) {
                                                            handleJalaliChange(
                                                                val,
                                                                calendarInfo.jalali.month,
                                                                calendarInfo.jalali.day,
                                                            );
                                                        }
                                                    }}
                                                    aria-label='Jalali Year'
                                                    className='w-full bg-transparent py-2 pl-2 pr-6 text-center font-mono text-xs font-semibold text-zinc-900 focus:outline-none dark:text-zinc-100'
                                                />
                                                <div className='absolute right-1 flex flex-col'>
                                                    <button
                                                        type='button'
                                                        aria-label='Increase Jalali year'
                                                        onClick={() =>
                                                            handleJalaliChange(
                                                                calendarInfo.jalali.year + 1,
                                                                calendarInfo.jalali.month,
                                                                calendarInfo.jalali.day,
                                                            )
                                                        }
                                                        className='cursor-pointer text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400'
                                                    >
                                                        <ChevronUp className='h-3 w-3' />
                                                    </button>
                                                    <button
                                                        type='button'
                                                        aria-label='Decrease Jalali year'
                                                        onClick={() =>
                                                            handleJalaliChange(
                                                                Math.max(1, calendarInfo.jalali.year - 1),
                                                                calendarInfo.jalali.month,
                                                                calendarInfo.jalali.day,
                                                            )
                                                        }
                                                        className='cursor-pointer text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400'
                                                    >
                                                        <ChevronDown className='h-3 w-3' />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='space-y-1.5'>
                                            <div className='flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400'>
                                                <span>Month</span>
                                            </div>
                                            <div className='relative'>
                                                <select
                                                    value={calendarInfo.jalali.month}
                                                    onChange={(e) =>
                                                        handleJalaliChange(
                                                            calendarInfo.jalali.year,
                                                            Number(e.target.value),
                                                            calendarInfo.jalali.day,
                                                        )
                                                    }
                                                    aria-label='Jalali Month'
                                                    className='w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2 pr-6 pl-2 text-center text-xs font-semibold text-zinc-900 shadow-xs transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'
                                                >
                                                    {JALALI_MONTH_NAMES_EN.map((name, idx) => (
                                                        <option
                                                            key={name}
                                                            value={idx + 1}
                                                            className='bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100'
                                                        >
                                                            {idx + 1} - {name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className='pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400' />
                                            </div>
                                        </div>

                                        <div className='space-y-1.5'>
                                            <div className='flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400'>
                                                <span>Day</span>
                                            </div>
                                            <div className='relative flex items-center rounded-xl border border-zinc-200 bg-white shadow-xs transition-colors focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 dark:border-zinc-800 dark:bg-zinc-900'>
                                                <select
                                                    value={calendarInfo.jalali.day}
                                                    onChange={(e) =>
                                                        handleJalaliChange(
                                                            calendarInfo.jalali.year,
                                                            calendarInfo.jalali.month,
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                    aria-label='Jalali Day'
                                                    className='w-full appearance-none bg-transparent py-2 pl-2 pr-6 text-center font-mono text-xs font-semibold text-zinc-900 focus:outline-none dark:text-zinc-100'
                                                >
                                                    {Array.from(
                                                        { length: jalaliDaysCount },
                                                        (_, i) => i + 1,
                                                    ).map((d) => (
                                                        <option
                                                            key={d}
                                                            value={d}
                                                            className='bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100'
                                                        >
                                                            {d}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className='pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400' />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between'>
                                <span className='text-[11px] text-zinc-500 dark:text-zinc-400'>
                                    {jalaliDaysCount} days in this month
                                </span>
                                <button
                                    type='button'
                                    onClick={() =>
                                        handleCopy(
                                            calendarInfo.formatted.jalaliFull,
                                            'jalali',
                                        )
                                    }
                                    className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
                                >
                                    {copiedKey === 'jalali' ? (
                                        <>
                                            <Check className='h-3 w-3 text-emerald-600' />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className='h-3 w-3' />
                                            <span>Copy Text</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className='flex flex-col justify-between rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-white p-4 shadow-xs dark:border-indigo-900/40 dark:from-indigo-950/20 dark:to-zinc-900/60 sm:p-5'>
                            <div className='space-y-4'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <span className='h-2.5 w-2.5 rounded-full bg-indigo-500' />
                                        <h2 className='text-sm font-bold text-zinc-900 sm:text-base dark:text-zinc-100'>
                                            Gregorian
                                        </h2>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            calendarInfo.isGregorianLeap
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                        }`}
                                    >
                                        {calendarInfo.isGregorianLeap
                                            ? 'Leap Year'
                                            : 'Standard Year'}
                                    </span>
                                </div>

                                <div className='rounded-xl border border-zinc-200/70 bg-white/80 p-3 text-center dark:border-zinc-800/80 dark:bg-zinc-950/70'>
                                    <div className='text-base font-extrabold text-indigo-700 sm:text-lg dark:text-indigo-400'>
                                        {calendarInfo.formatted.gregorianFull}
                                    </div>
                                    <div className='mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400'>
                                        {calendarInfo.formatted.gregorianIso}
                                    </div>
                                </div>

                                <div className='space-y-3 pt-1'>
                                    <div className='grid grid-cols-3 gap-2 text-xs'>
                                        <div className='space-y-1.5'>
                                            <div className='flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400'>
                                                <span>Year</span>
                                            </div>
                                            <div className='relative flex items-center rounded-xl border border-zinc-200 bg-white shadow-xs transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900'>
                                                <input
                                                    type='number'
                                                    min={1}
                                                    max={3000}
                                                    value={calendarInfo.gregorian.year}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val > 0) {
                                                            handleGregorianChange(
                                                                val,
                                                                calendarInfo.gregorian.month,
                                                                calendarInfo.gregorian.day,
                                                            );
                                                        }
                                                    }}
                                                    aria-label='Gregorian Year'
                                                    className='w-full bg-transparent py-2 pl-2 pr-6 text-center font-mono text-xs font-semibold text-zinc-900 focus:outline-none dark:text-zinc-100'
                                                />
                                                <div className='absolute right-1 flex flex-col'>
                                                    <button
                                                        type='button'
                                                        aria-label='Increase Gregorian year'
                                                        onClick={() =>
                                                            handleGregorianChange(
                                                                calendarInfo.gregorian.year + 1,
                                                                calendarInfo.gregorian.month,
                                                                calendarInfo.gregorian.day,
                                                            )
                                                        }
                                                        className='cursor-pointer text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                                    >
                                                        <ChevronUp className='h-3 w-3' />
                                                    </button>
                                                    <button
                                                        type='button'
                                                        aria-label='Decrease Gregorian year'
                                                        onClick={() =>
                                                            handleGregorianChange(
                                                                Math.max(1, calendarInfo.gregorian.year - 1),
                                                                calendarInfo.gregorian.month,
                                                                calendarInfo.gregorian.day,
                                                            )
                                                        }
                                                        className='cursor-pointer text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                                    >
                                                        <ChevronDown className='h-3 w-3' />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='space-y-1.5'>
                                            <div className='flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400'>
                                                <span>Month</span>
                                            </div>
                                            <div className='relative'>
                                                <select
                                                    value={calendarInfo.gregorian.month}
                                                    onChange={(e) =>
                                                        handleGregorianChange(
                                                            calendarInfo.gregorian.year,
                                                            Number(e.target.value),
                                                            calendarInfo.gregorian.day,
                                                        )
                                                    }
                                                    aria-label='Gregorian Month'
                                                    className='w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2 pr-6 pl-2 text-center text-xs font-semibold text-zinc-900 shadow-xs transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'
                                                >
                                                    {GREGORIAN_MONTH_NAMES_EN.map((name, idx) => (
                                                        <option
                                                            key={name}
                                                            value={idx + 1}
                                                            className='bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100'
                                                        >
                                                            {idx + 1} - {name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className='pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400' />
                                            </div>
                                        </div>

                                        <div className='space-y-1.5'>
                                            <div className='flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400'>
                                                <span>Day</span>
                                            </div>
                                            <div className='relative flex items-center rounded-xl border border-zinc-200 bg-white shadow-xs transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900'>
                                                <select
                                                    value={calendarInfo.gregorian.day}
                                                    onChange={(e) =>
                                                        handleGregorianChange(
                                                            calendarInfo.gregorian.year,
                                                            calendarInfo.gregorian.month,
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                    aria-label='Gregorian Day'
                                                    className='w-full appearance-none bg-transparent py-2 pl-2 pr-6 text-center font-mono text-xs font-semibold text-zinc-900 focus:outline-none dark:text-zinc-100'
                                                >
                                                    {Array.from(
                                                        { length: gregorianDaysCount },
                                                        (_, i) => i + 1,
                                                    ).map((d) => (
                                                        <option
                                                            key={d}
                                                            value={d}
                                                            className='bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100'
                                                        >
                                                            {d}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className='pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400' />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between'>
                                <span className='text-[11px] text-zinc-500 dark:text-zinc-400'>
                                    {gregorianDaysCount} days in this month
                                </span>
                                <button
                                    type='button'
                                    onClick={() =>
                                        handleCopy(
                                            calendarInfo.formatted.gregorianFull,
                                            'gregorian',
                                        )
                                    }
                                    className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
                                >
                                    {copiedKey === 'gregorian' ? (
                                        <>
                                            <Check className='h-3 w-3 text-emerald-600' />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className='h-3 w-3' />
                                            <span>Copy Text</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className='flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/50 to-white p-4 shadow-xs dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-zinc-900/60 sm:p-5'>
                            <div className='space-y-4'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <span className='h-2.5 w-2.5 rounded-full bg-emerald-500' />
                                        <h2 className='text-sm font-bold text-zinc-900 sm:text-base dark:text-zinc-100'>
                                            Lunar Hijri
                                        </h2>
                                    </div>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            calendarInfo.isHijriLeap
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                        }`}
                                    >
                                        {calendarInfo.isHijriLeap
                                            ? 'Leap Year'
                                            : 'Standard Year'}
                                    </span>
                                </div>

                                <div className='rounded-xl border border-zinc-200/70 bg-white/80 p-3 text-center dark:border-zinc-800/80 dark:bg-zinc-950/70'>
                                    <div className='text-base font-extrabold text-emerald-700 sm:text-lg dark:text-emerald-400'>
                                        {calendarInfo.formatted.hijriFull}
                                    </div>
                                    <div className='mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400'>
                                        {calendarInfo.formatted.hijriIso}
                                    </div>
                                </div>

                                <div className='space-y-3 pt-1'>
                                    <div className='grid grid-cols-3 gap-2 text-xs'>
                                        <div className='space-y-1.5'>
                                            <div className='flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400'>
                                                <span>Year</span>
                                            </div>
                                            <div className='relative flex items-center rounded-xl border border-zinc-200 bg-white shadow-xs transition-colors focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900'>
                                                <input
                                                    type='number'
                                                    min={1}
                                                    max={2500}
                                                    value={calendarInfo.hijri.year}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val > 0) {
                                                            handleHijriChange(
                                                                val,
                                                                calendarInfo.hijri.month,
                                                                calendarInfo.hijri.day,
                                                            );
                                                        }
                                                    }}
                                                    aria-label='Hijri Year'
                                                    className='w-full bg-transparent py-2 pl-2 pr-6 text-center font-mono text-xs font-semibold text-zinc-900 focus:outline-none dark:text-zinc-100'
                                                />
                                                <div className='absolute right-1 flex flex-col'>
                                                    <button
                                                        type='button'
                                                        aria-label='Increase Hijri year'
                                                        onClick={() =>
                                                            handleHijriChange(
                                                                calendarInfo.hijri.year + 1,
                                                                calendarInfo.hijri.month,
                                                                calendarInfo.hijri.day,
                                                            )
                                                        }
                                                        className='cursor-pointer text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                                                    >
                                                        <ChevronUp className='h-3 w-3' />
                                                    </button>
                                                    <button
                                                        type='button'
                                                        aria-label='Decrease Hijri year'
                                                        onClick={() =>
                                                            handleHijriChange(
                                                                Math.max(1, calendarInfo.hijri.year - 1),
                                                                calendarInfo.hijri.month,
                                                                calendarInfo.hijri.day,
                                                            )
                                                        }
                                                        className='cursor-pointer text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                                                    >
                                                        <ChevronDown className='h-3 w-3' />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='space-y-1.5'>
                                            <div className='flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400'>
                                                <span>Month</span>
                                            </div>
                                            <div className='relative'>
                                                <select
                                                    value={calendarInfo.hijri.month}
                                                    onChange={(e) =>
                                                        handleHijriChange(
                                                            calendarInfo.hijri.year,
                                                            Number(e.target.value),
                                                            calendarInfo.hijri.day,
                                                        )
                                                    }
                                                    aria-label='Hijri Month'
                                                    className='w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2 pr-6 pl-2 text-center text-xs font-semibold text-zinc-900 shadow-xs transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'
                                                >
                                                    {HIJRI_MONTH_NAMES_EN.map((name, idx) => (
                                                        <option
                                                            key={name}
                                                            value={idx + 1}
                                                            className='bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100'
                                                        >
                                                            {idx + 1} - {name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className='pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400' />
                                            </div>
                                        </div>

                                        <div className='space-y-1.5'>
                                            <div className='flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400'>
                                                <span>Day</span>
                                            </div>
                                            <div className='relative flex items-center rounded-xl border border-zinc-200 bg-white shadow-xs transition-colors focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900'>
                                                <select
                                                    value={calendarInfo.hijri.day}
                                                    onChange={(e) =>
                                                        handleHijriChange(
                                                            calendarInfo.hijri.year,
                                                            calendarInfo.hijri.month,
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                    aria-label='Hijri Day'
                                                    className='w-full appearance-none bg-transparent py-2 pl-2 pr-6 text-center font-mono text-xs font-semibold text-zinc-900 focus:outline-none dark:text-zinc-100'
                                                >
                                                    {Array.from(
                                                        { length: hijriDaysCount },
                                                        (_, i) => i + 1,
                                                    ).map((d) => (
                                                        <option
                                                            key={d}
                                                            value={d}
                                                            className='bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100'
                                                        >
                                                            {d}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className='pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400' />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between'>
                                <span className='text-[11px] text-zinc-500 dark:text-zinc-400'>
                                    {hijriDaysCount} days in this month
                                </span>
                                <button
                                    type='button'
                                    onClick={() =>
                                        handleCopy(
                                            calendarInfo.formatted.hijriFull,
                                            'hijri',
                                        )
                                    }
                                    className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
                                >
                                    {copiedKey === 'hijri' ? (
                                        <>
                                            <Check className='h-3 w-3 text-emerald-600' />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className='h-3 w-3' />
                                            <span>Copy Text</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className='rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 sm:p-5 dark:border-zinc-800/80 dark:bg-zinc-950/40'>
                        <div className='mb-3 flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-200'>
                            <Sparkles className='h-4 w-4 text-cyan-500' />
                            <span>Rich Date Formats & System Metrics</span>
                        </div>

                        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs'>
                            <div className='space-y-1 rounded-xl border border-zinc-200/60 bg-white p-3 dark:border-zinc-800/60 dark:bg-zinc-900/60'>
                                <div className='flex items-center justify-between text-zinc-500 dark:text-zinc-400'>
                                    <span className='font-medium'>Weekday</span>
                                    <ArrowRightLeft className='h-3.5 w-3.5 text-cyan-500' />
                                </div>
                                <div className='font-bold text-zinc-900 dark:text-zinc-100'>
                                    {calendarInfo.formatted.weekdayEn}
                                </div>
                                <div className='text-[11px] text-zinc-500 dark:text-zinc-400'>
                                    Current Day of the Week
                                </div>
                            </div>

                            <div className='space-y-1 rounded-xl border border-zinc-200/60 bg-white p-3 dark:border-zinc-800/60 dark:bg-zinc-900/60'>
                                <div className='flex items-center justify-between text-zinc-500 dark:text-zinc-400'>
                                    <span className='font-medium'>ISO 8601 (Gregorian)</span>
                                    <button
                                        type='button'
                                        onClick={() =>
                                            handleCopy(
                                                calendarInfo.formatted.gregorianIso,
                                                'isoG',
                                            )
                                        }
                                        className='cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                        aria-label='Copy Gregorian ISO date'
                                    >
                                        {copiedKey === 'isoG' ? (
                                            <Check className='h-3.5 w-3.5 text-emerald-600' />
                                        ) : (
                                            <Copy className='h-3.5 w-3.5' />
                                        )}
                                    </button>
                                </div>
                                <div className='font-mono font-bold text-zinc-900 dark:text-zinc-100'>
                                    {calendarInfo.formatted.gregorianIso}
                                </div>
                                <div className='text-[11px] text-zinc-500 dark:text-zinc-400'>
                                    Standard Date String
                                </div>
                            </div>

                            <div className='space-y-1 rounded-xl border border-zinc-200/60 bg-white p-3 dark:border-zinc-800/60 dark:bg-zinc-900/60'>
                                <div className='flex items-center justify-between text-zinc-500 dark:text-zinc-400'>
                                    <span className='font-medium'>Jalali ISO String</span>
                                    <button
                                        type='button'
                                        onClick={() =>
                                            handleCopy(
                                                calendarInfo.formatted.jalaliIso,
                                                'isoJ',
                                            )
                                        }
                                        className='cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                        aria-label='Copy Jalali ISO date'
                                    >
                                        {copiedKey === 'isoJ' ? (
                                            <Check className='h-3.5 w-3.5 text-emerald-600' />
                                        ) : (
                                            <Copy className='h-3.5 w-3.5' />
                                        )}
                                    </button>
                                </div>
                                <div className='font-mono font-bold text-zinc-900 dark:text-zinc-100'>
                                    {calendarInfo.formatted.jalaliIso}
                                </div>
                                <div className='text-[11px] text-zinc-500 dark:text-zinc-400'>
                                    YYYY-MM-DD (Solar Hijri)
                                </div>
                            </div>

                            <div className='space-y-1 rounded-xl border border-zinc-200/60 bg-white p-3 dark:border-zinc-800/60 dark:bg-zinc-900/60'>
                                <div className='flex items-center justify-between text-zinc-500 dark:text-zinc-400'>
                                    <span className='font-medium'>Unix Epoch Timestamp</span>
                                    <button
                                        type='button'
                                        onClick={() =>
                                            handleCopy(
                                                String(calendarInfo.unixTimestamp),
                                                'unix',
                                            )
                                        }
                                        className='cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                        aria-label='Copy Unix timestamp'
                                    >
                                        {copiedKey === 'unix' ? (
                                            <Check className='h-3.5 w-3.5 text-emerald-600' />
                                        ) : (
                                            <Copy className='h-3.5 w-3.5' />
                                        )}
                                    </button>
                                </div>
                                <div className='flex items-center gap-1 font-mono font-bold text-zinc-900 dark:text-zinc-100'>
                                    <Clock className='h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400' />
                                    <span>{calendarInfo.unixTimestamp}</span>
                                </div>
                                <div className='text-[11px] text-zinc-500 dark:text-zinc-400'>
                                    Seconds since 1970-01-01 UTC
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <FaqSection
                    items={dateFaqItems}
                    title='Calendar Converter FAQ'
                    subtitle='Direct, factual answers regarding astronomical algorithms, client-side date synchronization, and multi-calendar standards.'
                    badge='Instant Answers'
                />

                <TermsSection />

                <footer className='pt-4 pb-6 text-center text-xs text-zinc-600 dark:text-zinc-400'>
                    <p>
                        © {new Date().getFullYear()} Universal Convertor • 100%
                        Free Client-Side Multi-Calendar & File Converter
                    </p>
                </footer>
            </main>
        </div>
    );
}

export default DatePage;
