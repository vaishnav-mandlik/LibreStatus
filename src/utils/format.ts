import * as RNLocalize from 'react-native-localize';
import type { TranslationKey, TransParams } from '../i18n';
import type { StatusFile, StatusSection } from '../types';

/** The dictionary lookup as `useLanguage()` hands it out. */
export type Translate = (key: TranslationKey, params?: TransParams) => string;

const DAY_MS = 86400000;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** `new Date(ts)` with every way a timestamp can be junk folded into null. */
const validDate = (timestamp: number): Date | null => {
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Bytes → "2.1 MB". Guards non-finite and non-positive input. */
export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  // Clamped at both ends: a value below one byte gave a negative exponent,
  // which indexed past the start of the table and printed "512 undefined".
  const exponent = Math.max(
    0,
    Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1),
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent <= 1 ? 0 : 1)} ${units[exponent]}`;
};

/** Bytes → "2.1" (no unit), for the storage meter which labels its own unit. */
export const megabytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0.0';
  }
  return (bytes / (1024 * 1024)).toFixed(1);
};

/**
 * Bytes → "8.4 MB". Megabytes with one decimal, as the prototype writes every
 * size, so the viewer's metadata row and the Library meta line line up.
 *
 * Below 0.05 MB that rounds to "0.0 MB", which reads as a broken file rather
 * than a small one, so anything under 100 KB switches to whole kilobytes. The
 * prototype's own data never went that small, so nothing it draws changes.
 */
export const formatBytesMB = (bytes: number): string => {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safe > 0 && safe < 100 * 1024) {
    return `${Math.max(1, Math.round(safe / 1024))} KB`;
  }
  return `${megabytes(safe)} MB`;
};

/**
 * Formats sizes that sit side by side, so they share one unit. On its own
 * `formatBytesMB` would print "Photos 59 KB" next to "Videos 0.0 MB", which
 * reads as two different measurements rather than two halves of one bar.
 */
export const formatBytesUniform = (values: number[]): string[] => {
  const largest = values.reduce(
    (max, v) => (Number.isFinite(v) && v > max ? v : max),
    0,
  );
  if (largest > 0 && largest < 100 * 1024) {
    return values.map(v => {
      const safe = Number.isFinite(v) && v > 0 ? v : 0;
      // Floored at 1 KB exactly as `formatBytesMB` floors it. Without that, a
      // couple of hundred bytes of photos read "0 KB" in the legend under a
      // heading that said 1 KB was in use: two halves that did not add up to
      // the whole above them. A genuine zero still reads zero.
      return `${safe > 0 ? Math.max(1, Math.round(safe / 1024)) : 0} KB`;
    });
  }
  return values.map(v => `${megabytes(Number.isFinite(v) && v > 0 ? v : 0)} MB`);
};

/**
 * Seconds → "0:14" / "1:07"; "1:02:03" once there is an hour to show.
 * Empty for an absent or invalid length so a tile can hide its pill.
 */
export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '';
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
};

let cached24h: boolean | null = null;

/**
 * Honours the device's 12/24-hour setting instead of hardcoding am/pm.
 * `RNLocalize.uses24HourClock` is a synchronous native constant, so we read it
 * once and reuse it.
 */
export const uses24HourClock = (): boolean => {
  if (cached24h === null) {
    try {
      cached24h = RNLocalize.uses24HourClock();
    } catch {
      cached24h = true;
    }
  }
  return cached24h;
};

/**
 * Epoch ms → "12:38". Always 24-hour and zero-padded: the prototype's tile
 * stamps and captured times are fixed-width so they line up in the grid.
 */
export const formatStamp = (timestamp: number): string => {
  const d = validDate(timestamp);
  return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
};

/** Epoch ms → "12:38" or "12:38 pm", matching the device clock preference. */
export const formatClock = (timestamp: number): string => {
  const d = validDate(timestamp);
  if (!d) {
    return '';
  }
  const minutes = pad2(d.getMinutes());
  if (uses24HourClock()) {
    return `${pad2(d.getHours())}:${minutes}`;
  }
  const h = d.getHours();
  return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'pm' : 'am'}`;
};

/**
 * Epoch ms → a full "Mon 3, 12:38"-style stamp in the app's chosen language.
 * Falls back to the clock alone if Intl is unavailable.
 */
export const formatWhen = (timestamp: number, locale: string): string => {
  const d = validDate(timestamp);
  if (!d) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: !uses24HourClock(),
    }).format(d);
  } catch {
    return formatClock(timestamp);
  }
};

/** Midnight of the day containing `ts`, in local time. */
const startOfDay = (ts: number): number => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * "3 Sep" in the given locale (the device's when omitted). The prototype
 * writes the day first whatever the locale prefers, so the parts are picked
 * out and reassembled rather than taking Intl's own order.
 */
const formatDayMonth = (d: Date, locale?: string): string => {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
    }).formatToParts(d);
    const day = parts.find(p => p.type === 'day')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    if (day && month) {
      return `${day} ${month}`;
    }
  } catch {
    // No Intl on this runtime: the numeric form below still reads.
  }
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

/**
 * The viewer's "captured" value: "Today, 12:36" / "Yesterday, 09:58" through
 * the dictionary, else "3 Sep, 09:58". `now` is injectable for tests.
 */
export const formatCaptured = (
  timestamp: number,
  t: Translate,
  opts: { locale?: string; now?: number } = {},
): string => {
  const d = validDate(timestamp);
  if (!d) {
    return '';
  }
  const time = formatStamp(timestamp);
  const todayStart = startOfDay(opts.now ?? Date.now());
  if (timestamp >= todayStart) {
    return t('viewer.today', { time });
  }
  if (timestamp >= todayStart - DAY_MS) {
    return t('viewer.yesterday', { time });
  }
  return `${formatDayMonth(d, opts.locale)}, ${time}`;
};

export interface GroupLabels {
  today: string;
  yesterday: string;
  earlier: string;
}

/**
 * Buckets a sorted list into Today / Yesterday / Earlier runs.
 *
 * The list is assumed to already be in the caller's chosen order; grouping
 * preserves that order and only inserts boundaries, so "largest file first"
 * still reads correctly inside each day.
 */
export const groupByDay = (
  items: StatusFile[],
  labels: GroupLabels,
  now: number,
): StatusSection[] => {
  if (items.length === 0) {
    return [];
  }
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - DAY_MS;

  const bucketOf = (ts: number): keyof GroupLabels => {
    if (ts >= todayStart) {
      return 'today';
    }
    if (ts >= yesterdayStart) {
      return 'yesterday';
    }
    return 'earlier';
  };

  const sections: StatusSection[] = [];
  for (const item of items) {
    const key = bucketOf(item.timestamp);
    const last = sections[sections.length - 1];
    if (last && last.key === key) {
      last.data.push(item);
    } else {
      sections.push({ key, title: labels[key], data: [item] });
    }
  }
  return sections;
};

/** Applies the user's sort order. Returns a new array; never mutates input. */
export const sortStatuses = (
  items: StatusFile[],
  order: 'new' | 'old' | 'big' | 'type',
): StatusFile[] => {
  const out = items.slice();
  switch (order) {
    case 'old':
      return out.sort((a, b) => a.timestamp - b.timestamp);
    case 'big':
      return out.sort((a, b) => b.size - a.size);
    case 'type':
      return out.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'image' ? -1 : 1;
        }
        return b.timestamp - a.timestamp;
      });
    case 'new':
    default:
      return out.sort((a, b) => b.timestamp - a.timestamp);
  }
};

