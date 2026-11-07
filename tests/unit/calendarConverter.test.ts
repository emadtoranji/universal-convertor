import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    fromGregorian,
    fromJalali,
    fromHijri,
    isGregorianLeapYear,
    isJalaliLeapYear,
    getDaysInGregorianMonth,
    getDaysInJalaliMonth,
    gregorianToJdn,
    jdnToGregorian,
    jalaliToJdn,
    jdnToJalali,
} from '../../src/utils/calendarConverter.ts';

describe('calendarConverter - Multi-Calendar Test Suite', () => {
    it('accurately converts known Gregorian dates to Jalali and Hijri', () => {
        const info = fromGregorian(2026, 11, 7);
        assert.equal(info.jalali.year, 1405);
        assert.equal(info.jalali.month, 8);
        assert.equal(info.jalali.day, 16);
        assert.equal(info.hijri.year, 1448);
        assert.equal(info.hijri.month, 5);
        assert.equal(info.hijri.day, 27);
        assert.equal(info.dayOfWeek, 6);
    });

    it('accurately converts Jalali to Gregorian in round-trip conversion', () => {
        const info = fromJalali(1405, 8, 16);
        assert.equal(info.gregorian.year, 2026);
        assert.equal(info.gregorian.month, 11);
        assert.equal(info.gregorian.day, 7);
        assert.equal(info.hijri.year, 1448);
        assert.equal(info.hijri.month, 5);
        assert.equal(info.hijri.day, 27);
    });

    it('accurately converts Hijri to Gregorian and Jalali', () => {
        const info = fromHijri(1448, 5, 27);
        assert.equal(info.gregorian.year, 2026);
        assert.equal(info.gregorian.month, 11);
        assert.equal(info.gregorian.day, 7);
        assert.equal(info.jalali.year, 1405);
        assert.equal(info.jalali.month, 8);
        assert.equal(info.jalali.day, 16);
    });

    it('correctly validates Gregorian leap years', () => {
        assert.equal(isGregorianLeapYear(2024), true);
        assert.equal(isGregorianLeapYear(2026), false);
        assert.equal(isGregorianLeapYear(2000), true);
        assert.equal(isGregorianLeapYear(1900), false);
        assert.equal(getDaysInGregorianMonth(2024, 2), 29);
        assert.equal(getDaysInGregorianMonth(2026, 2), 28);
    });

    it('correctly validates Jalali leap years', () => {
        assert.equal(isJalaliLeapYear(1399), true);
        assert.equal(isJalaliLeapYear(1400), false);
        assert.equal(isJalaliLeapYear(1403), true);
        assert.equal(isJalaliLeapYear(1405), false);
        assert.equal(getDaysInJalaliMonth(1403, 12), 30);
        assert.equal(getDaysInJalaliMonth(1405, 12), 29);
    });

    it('clamps out-of-boundary dates securely without throwing', () => {
        const overflowDay = fromGregorian(2026, 2, 35);
        assert.equal(overflowDay.gregorian.day, 28);

        const negativeMonth = fromJalali(1405, -5, 10);
        assert.equal(negativeMonth.jalali.month, 1);

        const overflowJalali = fromJalali(1405, 12, 31);
        assert.equal(overflowJalali.jalali.day, 29);
    });

    it('maintains bi-directional JDN consistency', () => {
        const jdn1 = gregorianToJdn(2026, 11, 7);
        const g = jdnToGregorian(jdn1);
        assert.deepEqual(g, { year: 2026, month: 11, day: 7 });

        const jdn2 = jalaliToJdn(1405, 8, 16);
        const j = jdnToJalali(jdn2);
        assert.deepEqual(j, { year: 1405, month: 8, day: 16 });
        assert.equal(jdn1, jdn2);
    });
});
