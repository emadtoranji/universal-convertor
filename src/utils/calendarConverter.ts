export interface CalendarDate {
    year: number;
    month: number;
    day: number;
}

export interface CalendarInfo {
    jalali: CalendarDate;
    gregorian: CalendarDate;
    hijri: CalendarDate;
    dayOfWeek: number;
    unixTimestamp: number;
    isJalaliLeap: boolean;
    isGregorianLeap: boolean;
    isHijriLeap: boolean;
    formatted: {
        jalaliFull: string;
        gregorianFull: string;
        hijriFull: string;
        jalaliIso: string;
        gregorianIso: string;
        hijriIso: string;
        weekdayEn: string;
    };
}

const HIJRI_INTL_FORMATTER = new Intl.DateTimeFormat(
    'en-u-ca-islamic-umalqura-nu-latn',
    {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    },
);

export const JALALI_MONTH_NAMES_EN = [
    'Farvardin',
    'Ordibehesht',
    'Khordad',
    'Tir',
    'Mordad',
    'Shahrivar',
    'Mehr',
    'Aban',
    'Azar',
    'Dey',
    'Bahman',
    'Esfand',
] as const;

export const GREGORIAN_MONTH_NAMES_EN = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
] as const;

export const HIJRI_MONTH_NAMES_EN = [
    'Muharram',
    'Safar',
    'Rabi al-Awwal',
    'Rabi al-Thani',
    'Jumada al-Awwal',
    'Jumada al-Thani',
    'Rajab',
    'Shaban',
    'Ramadan',
    'Shawwal',
    'Dhu al-Qadah',
    'Dhu al-Hijjah',
] as const;

export const WEEKDAY_NAMES_EN = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const;

export function isGregorianLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInGregorianMonth(year: number, month: number): number {
    if (month === 2) {
        return isGregorianLeapYear(year) ? 29 : 28;
    }
    if (month === 4 || month === 6 || month === 9 || month === 11) {
        return 30;
    }
    return 31;
}

const JALALI_BREAKS = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2090,
    2120, 2289, 2350, 2449, 2479, 2509, 2539, 2776, 2806, 2836, 2866, 3000,
] as const;

export function isJalaliLeapYear(year: number): boolean {
    let jp: number = JALALI_BREAKS[0];
    let jump = 0;
    for (let j = 1; j < JALALI_BREAKS.length; j += 1) {
        const jm = JALALI_BREAKS[j];
        if (jm === undefined) break;
        jump = jm - jp;
        if (year < jm) break;
        jp = jm;
    }
    let n = year - jp;
    if (jump - n < 6) {
        n = n - jump + Math.floor((jump + 4) / 33) * 33;
    }
    let leap = (((n + 1) % 33) - 1) % 4;
    if (leap === -1) {
        leap = 4;
    }
    return leap === 0;
}

export function getDaysInJalaliMonth(year: number, month: number): number {
    if (month >= 1 && month <= 6) {
        return 31;
    }
    if (month >= 7 && month <= 11) {
        return 30;
    }
    return isJalaliLeapYear(year) ? 30 : 29;
}

export function gregorianToJdn(year: number, month: number, day: number): number {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return (
        day +
        Math.floor((153 * m + 2) / 5) +
        365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) -
        32045
    );
}

export function jdnToGregorian(jdn: number): CalendarDate {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = 100 * b + d - 4800 + Math.floor(m / 10);
    return { year, month, day };
}

export function jalaliToJdn(year: number, month: number, day: number): number {
    const epbase = year - (year >= 0 ? 474 : 473);
    const epyear = 474 + (epbase % 2820);
    const mdays = month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6;
    return (
        day +
        mdays +
        Math.floor((epyear * 682 - 110) / 2816) +
        (epyear - 1) * 365 +
        Math.floor(epbase / 2820) * 1029983 +
        1948320
    );
}

export function jdnToJalali(jdn: number): CalendarDate {
    const depoch = jdn - jalaliToJdn(475, 1, 1);
    const cycle = Math.floor(depoch / 1029983);
    const cday = depoch % 1029983;
    let ycycle = 2820;
    if (cday !== 1029982) {
        const a1 = Math.floor(cday / 366);
        const a2 = cday % 366;
        ycycle = Math.floor((2134 * a1 + 2816 * a2 + 2815) / 1028522) + a1 + 1;
    }
    let year = 2820 * cycle + ycycle + 474;
    if (year <= 0) {
        year -= 1;
    }
    const yday = jdn - jalaliToJdn(year, 1, 1) + 1;
    let month = 1;
    let day = 1;
    if (yday <= 186) {
        month = Math.ceil(yday / 31);
        day = yday - (month - 1) * 31;
    } else {
        month = Math.ceil((yday - 6) / 30);
        day = yday - ((month - 1) * 30 + 6);
    }
    return { year, month, day };
}

export function jdnToUtcDate(jdn: number): Date {
    const g = jdnToGregorian(jdn);
    return new Date(Date.UTC(g.year, g.month - 1, g.day, 12, 0, 0));
}

export function utcDateToJdn(date: Date): number {
    return gregorianToJdn(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
    );
}

export function utcDateToHijri(date: Date): CalendarDate {
    const parts = HIJRI_INTL_FORMATTER.formatToParts(date);
    let year = 1;
    let month = 1;
    let day = 1;
    for (const part of parts) {
        if (part.type === 'year') {
            year = parseInt(part.value, 10);
        } else if (part.type === 'month') {
            month = parseInt(part.value, 10);
        } else if (part.type === 'day') {
            day = parseInt(part.value, 10);
        }
    }
    return { year, month, day };
}

export function hijriToUtcDate(
    year: number,
    month: number,
    day: number,
): Date {
    const approxGYear = Math.round((year - 1) * 0.970224 + 622);
    let estTime = Date.UTC(approxGYear, month - 1, day, 12, 0, 0);
    for (let iter = 0; iter < 20; iter += 1) {
        const cur = utcDateToHijri(new Date(estTime));
        if (cur.year === year && cur.month === month && cur.day === day) {
            return new Date(estTime);
        }
        const dayDiff =
            (cur.year - year) * 354 +
            (cur.month - month) * 29.5 +
            (cur.day - day);
        const step =
            Math.sign(dayDiff) * Math.max(1, Math.round(Math.abs(dayDiff)));
        estTime -= step * 86400000;
    }
    return new Date(estTime);
}

export function getDaysInHijriMonth(year: number, month: number): number {
    const d1 = hijriToUtcDate(year, month, 1);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const d2 = hijriToUtcDate(nextYear, nextMonth, 1);
    return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export function isHijriLeapYear(year: number): boolean {
    const d1 = hijriToUtcDate(year, 1, 1);
    const d2 = hijriToUtcDate(year + 1, 1, 1);
    const days = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    return days === 355;
}

function padTwo(num: number): string {
    return num.toString().padStart(2, '0');
}

export function calculateCalendarInfoFromJdn(jdn: number): CalendarInfo {
    const gregorian = jdnToGregorian(jdn);
    const jalali = jdnToJalali(jdn);
    const utcDate = jdnToUtcDate(jdn);
    const hijri = utcDateToHijri(utcDate);

    const dayOfWeek = (jdn + 1) % 7;
    const unixTimestamp = Math.floor(
        Date.UTC(gregorian.year, gregorian.month - 1, gregorian.day, 0, 0, 0) /
            1000,
    );

    const isJalaliLeap = isJalaliLeapYear(jalali.year);
    const isGregorianLeap = isGregorianLeapYear(gregorian.year);
    const isHijriLeap = isHijriLeapYear(hijri.year);

    const jalaliMonthNameEn =
        JALALI_MONTH_NAMES_EN[jalali.month - 1] ?? '';
    const gregorianMonthNameEn =
        GREGORIAN_MONTH_NAMES_EN[gregorian.month - 1] ?? '';
    const hijriMonthNameEn = HIJRI_MONTH_NAMES_EN[hijri.month - 1] ?? '';

    const weekdayEn = WEEKDAY_NAMES_EN[dayOfWeek] ?? '';

    const jalaliFull = `${weekdayEn}, ${jalali.day} ${jalaliMonthNameEn} ${jalali.year}`;
    const gregorianFull = `${weekdayEn}, ${gregorianMonthNameEn} ${gregorian.day}, ${gregorian.year}`;
    const hijriFull = `${weekdayEn}, ${hijri.day} ${hijriMonthNameEn} ${hijri.year}`;

    const jalaliIso = `${jalali.year}-${padTwo(jalali.month)}-${padTwo(jalali.day)}`;
    const gregorianIso = `${gregorian.year}-${padTwo(gregorian.month)}-${padTwo(gregorian.day)}`;
    const hijriIso = `${hijri.year}-${padTwo(hijri.month)}-${padTwo(hijri.day)}`;

    return {
        jalali,
        gregorian,
        hijri,
        dayOfWeek,
        unixTimestamp,
        isJalaliLeap,
        isGregorianLeap,
        isHijriLeap,
        formatted: {
            jalaliFull,
            gregorianFull,
            hijriFull,
            jalaliIso,
            gregorianIso,
            hijriIso,
            weekdayEn,
        },
    };
}

export function fromGregorian(
    year: number,
    month: number,
    day: number,
): CalendarInfo {
    const validYear = Math.max(1, Math.min(3000, Math.floor(year)));
    const validMonth = Math.max(1, Math.min(12, Math.floor(month)));
    const maxDays = getDaysInGregorianMonth(validYear, validMonth);
    const validDay = Math.max(1, Math.min(maxDays, Math.floor(day)));
    const jdn = gregorianToJdn(validYear, validMonth, validDay);
    return calculateCalendarInfoFromJdn(jdn);
}

export function fromJalali(
    year: number,
    month: number,
    day: number,
): CalendarInfo {
    const validYear = Math.max(1, Math.min(3000, Math.floor(year)));
    const validMonth = Math.max(1, Math.min(12, Math.floor(month)));
    const maxDays = getDaysInJalaliMonth(validYear, validMonth);
    const validDay = Math.max(1, Math.min(maxDays, Math.floor(day)));
    const jdn = jalaliToJdn(validYear, validMonth, validDay);
    return calculateCalendarInfoFromJdn(jdn);
}

export function fromHijri(
    year: number,
    month: number,
    day: number,
): CalendarInfo {
    const validYear = Math.max(1, Math.min(2500, Math.floor(year)));
    const validMonth = Math.max(1, Math.min(12, Math.floor(month)));
    const maxDays = getDaysInHijriMonth(validYear, validMonth);
    const validDay = Math.max(1, Math.min(maxDays, Math.floor(day)));
    const utcDate = hijriToUtcDate(validYear, validMonth, validDay);
    const jdn = utcDateToJdn(utcDate);
    return calculateCalendarInfoFromJdn(jdn);
}

export function getTodayCalendarInfo(): CalendarInfo {
    const now = new Date();
    const gYear = now.getFullYear();
    const gMonth = now.getMonth() + 1;
    const gDay = now.getDate();
    return fromGregorian(gYear, gMonth, gDay);
}
