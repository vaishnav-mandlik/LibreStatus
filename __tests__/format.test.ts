/**
 * @format
 */

import {
  formatBytes,
  formatBytesMB,
  formatBytesUniform,
  formatCaptured,
  formatClock,
  formatDuration,
  formatStamp,
  groupByDay,
  megabytes,
  sortStatuses,
} from '../src/utils/format';
import type { Translate } from '../src/utils/format';
import type { StatusFile } from '../src/types';

const file = (over: Partial<StatusFile> = {}): StatusFile => ({
  id: over.filename ?? 'a.jpg',
  uri: 'file:///a.jpg',
  filename: 'a.jpg',
  type: 'image',
  timestamp: 0,
  size: 1000,
  ...over,
});

const LABELS = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' };

const MB = 1024 * 1024;

describe('formatBytes', () => {
  it('formats each magnitude', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * MB)).toBe('5.0 MB');
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.0 GB');
  });

  it('clamps beyond the largest unit instead of printing undefined', () => {
    // The old implementation indexed past the units array here.
    expect(formatBytes(5 * 1024 ** 5)).toMatch(/GB$/);
    expect(formatBytes(5 * 1024 ** 5)).not.toContain('undefined');
  });

  it('clamps below the smallest unit too', () => {
    // A fractional byte count gave a negative exponent, which indexed off the
    // front of the units array and printed "512 undefined".
    expect(formatBytes(0.5)).toMatch(/^[\d.]+ B$/);
    expect(formatBytes(0.001)).not.toContain('undefined');
  });

  it('guards junk input', () => {
    expect(formatBytes(0)).toBe('0 MB');
    expect(formatBytes(-1)).toBe('0 MB');
    expect(formatBytes(NaN)).toBe('0 MB');
    expect(formatBytes(Infinity)).toBe('0 MB');
  });
});

describe('megabytes', () => {
  it('renders one decimal place without a unit', () => {
    expect(megabytes(MB)).toBe('1.0');
    expect(megabytes(0)).toBe('0.0');
    expect(megabytes(NaN)).toBe('0.0');
  });
});

describe('formatBytesMB', () => {
  it('says MB with one decimal, as the prototype does', () => {
    expect(formatBytesMB(8.4 * MB)).toBe('8.4 MB');
    expect(formatBytesMB(0.3 * MB)).toBe('0.3 MB');
    expect(formatBytesMB(2.5 * 1024 ** 3)).toBe('2560.0 MB');
  });

  it('drops to whole KB under 100 KB, where MB would read as 0.0', () => {
    // A 4.8 KB sticker showed "0.0 MB" in the viewer, which reads as a broken
    // file. Everything the prototype itself draws is far above this threshold.
    expect(formatBytesMB(4792)).toBe('5 KB');
    expect(formatBytesMB(50 * 1024)).toBe('50 KB');
    expect(formatBytesMB(99 * 1024)).toBe('99 KB');
    expect(formatBytesMB(100 * 1024)).toBe('0.1 MB');
    // Never "0 KB": a file that exists has a size worth showing.
    expect(formatBytesMB(120)).toBe('1 KB');
  });

  it('guards junk input', () => {
    expect(formatBytesMB(0)).toBe('0.0 MB');
    expect(formatBytesMB(-1)).toBe('0.0 MB');
    expect(formatBytesMB(NaN)).toBe('0.0 MB');
  });
});

describe('formatBytesUniform', () => {
  it('gives a legend one unit, chosen by the largest value', () => {
    expect(formatBytesUniform([59 * 1024, 0])).toEqual(['59 KB', '0 KB']);
    expect(formatBytesUniform([8.4 * MB, 59 * 1024])).toEqual(['8.4 MB', '0.1 MB']);
    expect(formatBytesUniform([0, 0])).toEqual(['0.0 MB', '0.0 MB']);
  });

  it('never rounds a share that exists down to nothing', () => {
    /*
     * The legend sits under a figure produced by `formatBytesMB`, which floors
     * anything non-empty at 1 KB for exactly this reason. The legend did not,
     * so a few hundred bytes of photos read "Photos 0 KB · Videos 0 KB" under
     * a heading that said 1 KB was in use — two halves that did not add up to
     * the whole above them. A genuine zero still reads zero.
     */
    expect(formatBytesUniform([200, 0])).toEqual(['1 KB', '0 KB']);
    expect(formatBytesUniform([200, 300])[1]).toBe('1 KB');
  });
});

describe('formatDuration', () => {
  it('formats m:ss and pads seconds', () => {
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(14)).toBe('0:14');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('adds an hours field only once it is needed', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('truncates fractional seconds instead of rounding up', () => {
    expect(formatDuration(14.9)).toBe('0:14');
  });

  it('returns empty for absent or invalid durations', () => {
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(NaN)).toBe('');
    expect(formatDuration(-5)).toBe('');
  });
});

describe('formatStamp', () => {
  it('is always 24-hour and zero-padded, whatever the device prefers', () => {
    // jest.setup mocks uses24HourClock() to false; the stamp ignores it.
    expect(formatStamp(new Date(2026, 0, 2, 12, 38).getTime())).toBe('12:38');
    expect(formatStamp(new Date(2026, 0, 2, 9, 58).getTime())).toBe('09:58');
    expect(formatStamp(new Date(2026, 0, 2, 0, 7).getTime())).toBe('00:07');
    expect(formatStamp(new Date(2026, 0, 2, 23, 5).getTime())).toBe('23:05');
  });

  it('guards invalid timestamps', () => {
    expect(formatStamp(NaN)).toBe('');
    expect(formatStamp(Infinity)).toBe('');
  });
});

describe('formatClock', () => {
  it('renders a 12-hour clock when the device asks for one', () => {
    // jest.setup mocks uses24HourClock() to false.
    const noon = new Date(2026, 0, 2, 12, 5).getTime();
    const morning = new Date(2026, 0, 2, 9, 30).getTime();
    const midnight = new Date(2026, 0, 2, 0, 7).getTime();
    expect(formatClock(noon)).toBe('12:05 pm');
    expect(formatClock(morning)).toBe('9:30 am');
    expect(formatClock(midnight)).toBe('12:07 am');
  });

  it('guards invalid timestamps', () => {
    expect(formatClock(NaN)).toBe('');
  });
});

describe('formatCaptured', () => {
  // Echoes key and time so the assertion shows which branch fired.
  const t: Translate = (key, params) => `${key}|${String(params?.time ?? '')}`;
  const now = new Date(2026, 8, 15, 12, 0).getTime();

  it('goes through the dictionary for today and yesterday', () => {
    const today = new Date(2026, 8, 15, 12, 36).getTime();
    const earlyToday = new Date(2026, 8, 15, 0, 1).getTime();
    const yesterday = new Date(2026, 8, 14, 23, 30).getTime();
    const yesterdayStart = new Date(2026, 8, 14, 0, 0).getTime();

    expect(formatCaptured(today, t, { now })).toBe('viewer.today|12:36');
    expect(formatCaptured(earlyToday, t, { now })).toBe('viewer.today|00:01');
    expect(formatCaptured(yesterday, t, { now })).toBe('viewer.yesterday|23:30');
    expect(formatCaptured(yesterdayStart, t, { now })).toBe(
      'viewer.yesterday|00:00',
    );
  });

  it('writes day, short month and a 24-hour time for anything older', () => {
    const older = new Date(2026, 8, 3, 9, 58).getTime();
    expect(formatCaptured(older, t, { now, locale: 'en' })).toBe(
      '3 Sep, 09:58',
    );
    // Two days back is already "older": the prototype has no "2 days ago".
    const twoDays = new Date(2026, 8, 13, 8, 0).getTime();
    expect(formatCaptured(twoDays, t, { now, locale: 'en' })).toBe(
      '13 Sep, 08:00',
    );
  });

  it('keeps the day first even in a locale that puts the month first', () => {
    const older = new Date(2026, 8, 3, 9, 58).getTime();
    expect(formatCaptured(older, t, { now, locale: 'en-US' })).toBe(
      '3 Sep, 09:58',
    );
  });

  it('uses the locale for the month name and never the dictionary', () => {
    const older = new Date(2026, 8, 3, 9, 58).getTime();
    const out = formatCaptured(older, t, { now, locale: 'fr' });
    expect(out.startsWith('3 ')).toBe(true);
    expect(out.endsWith(', 09:58')).toBe(true);
    expect(out).not.toContain('viewer.');
  });

  it('defaults to the current moment when no reference is given', () => {
    expect(formatCaptured(Date.now(), t)).toMatch(/^viewer\.today\|\d\d:\d\d$/);
  });

  it('guards invalid timestamps', () => {
    expect(formatCaptured(NaN, t, { now })).toBe('');
  });
});

describe('sortStatuses', () => {
  const a = file({ filename: 'a', timestamp: 300, size: 10, type: 'video' });
  const b = file({ filename: 'b', timestamp: 100, size: 90, type: 'image' });
  const c = file({ filename: 'c', timestamp: 200, size: 50, type: 'image' });
  const input = [a, b, c];

  it('never mutates its input', () => {
    const copy = input.slice();
    sortStatuses(input, 'old');
    expect(input).toEqual(copy);
  });

  it('orders newest first by default', () => {
    expect(sortStatuses(input, 'new').map(f => f.filename)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('orders oldest first', () => {
    expect(sortStatuses(input, 'old').map(f => f.filename)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('orders by size descending', () => {
    expect(sortStatuses(input, 'big').map(f => f.filename)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('groups images before videos, newest first inside each group', () => {
    expect(sortStatuses(input, 'type').map(f => f.filename)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });
});

describe('groupByDay', () => {
  const now = new Date(2026, 5, 15, 12, 0).getTime();
  const today = new Date(2026, 5, 15, 9, 0).getTime();
  const alsoToday = new Date(2026, 5, 15, 1, 0).getTime();
  const yesterday = new Date(2026, 5, 14, 23, 0).getTime();
  const older = new Date(2026, 5, 1, 12, 0).getTime();

  it('buckets into today, yesterday and earlier', () => {
    const sections = groupByDay(
      [
        file({ filename: '1', timestamp: today }),
        file({ filename: '2', timestamp: alsoToday }),
        file({ filename: '3', timestamp: yesterday }),
        file({ filename: '4', timestamp: older }),
      ],
      LABELS,
      now,
    );
    expect(sections.map(s => s.title)).toEqual([
      'Today',
      'Yesterday',
      'Earlier',
    ]);
    expect(sections[0].data).toHaveLength(2);
    expect(sections[1].data).toHaveLength(1);
    expect(sections[2].data).toHaveLength(1);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByDay([], LABELS, now)).toEqual([]);
  });

  it('preserves the incoming order and starts a new run when the day changes back', () => {
    // A "largest file" sort can interleave days; grouping must not reorder.
    const sections = groupByDay(
      [
        file({ filename: '1', timestamp: today }),
        file({ filename: '2', timestamp: older }),
        file({ filename: '3', timestamp: today }),
      ],
      LABELS,
      now,
    );
    expect(sections.map(s => s.title)).toEqual(['Today', 'Earlier', 'Today']);
    expect(sections.map(s => s.data.map(f => f.filename))).toEqual([
      ['1'],
      ['2'],
      ['3'],
    ]);
  });
});


