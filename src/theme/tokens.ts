/**
 * Design tokens, lifted literally from the "Status Saver Pro" prototype
 * (the 390×844 design frame).
 *
 * Every colour the prototype paints is a named field here so no component
 * ever carries a literal. The dark palette IS the prototype; the light
 * palette keeps each token's role and inverts its lightness so both themes
 * read as one system.
 *
 * Tokens whose comment says "on media" are drawn over photos and videos and
 * are identical in both themes, because the media underneath is not themed.
 */

export interface Palette {
  // ── Grounds ──────────────────────────────────────────────────────────────
  /** Screen ground (#0C0C0E in the prototype frame). */
  bg: string;
  /** Raised ground: cards, chips, inputs, sheets, round header buttons, nav tray. */
  well: string;
  /** Hairlines, disabled buttons, meter and progress tracks. */
  surface: string;
  /** Alias of surface: 1px separators between rows and options. */
  hairline: string;
  /** Inactive collection-chip border. */
  border: string;
  /** Auto-mode chip border, toggle-off track, sheet grabber, clear-search disc, dial divider. */
  borderHi: string;
  /** Track behind the thin refresh progress line. */
  track: string;

  // ── Accent ───────────────────────────────────────────────────────────────
  /** Brand green: CTAs, active tab, checkmarks, live counts. */
  accent: string;
  /** Brighter green: Repost label and glyph. */
  accentBright: string;
  /** Very dark green used for text ON a solid accent fill. */
  onAccent: string;
  /** rgba(accent,.12): header "Auto" chip. */
  accentChip: string;
  /** rgba(accent,.14): active collection chip and auto-mode chip fill. */
  accentFill: string;
  /** rgba(accent,.40): active collection chip border. */
  accentEdge: string;
  /** rgba(accent,.42): active auto-mode chip border. */
  accentFillEdge: string;
  /** rgba(accent,.16): toast Undo button fill. */
  accentUndo: string;
  /** rgba(accent,.18): toast icon disc and Repost button fill. */
  accentWash: string;
  /** rgba(accent,.50): Repost button border. */
  accentWashEdge: string;
  /** rgba(accent,.20): selected-tile overlay (on media). */
  accentSelection: string;
  /** rgba(accent,.28): zoom button when zoomed (on media). */
  accentGlass: string;
  /** rgba(accent,.90): "new" badge on a tile (on media). */
  accentBadge: string;
  /** rgba(accent,.92): double-tap save burst disc (on media). */
  accentBurst: string;
  /**
   * The Feed's top bar in the light theme: a solid green behind the brand,
   * its buttons and the All / Photos / Videos tabs. A darker shade of accent,
   * because white on accent itself is only 3.4:1; this is 5.3:1. The dark
   * theme keeps an untinted bar, so its values there repeat bg and friends.
   */
  topBar: string;
  /** Text, icons and the active tab's underline on topBar. */
  onTopBar: string;
  /**
   * Inactive tabs, counts and the Select link on topBar. 0.88 white on the
   * green is 4.5:1, the floor for small text; 0.74 read well but measured 3.65.
   * Counts on the bar are drawn in this at full alpha rather than under the
   * 0.6 count opacity the plain bar uses, which would take them to 2.3:1.
   */
  onTopBarMuted: string;
  /** The round buttons' well on topBar. */
  topBarWell: string;

  // ── Text ─────────────────────────────────────────────────────────────────
  /** Primary text: screen titles, row titles, big numbers (#FAFAFA). */
  text: string;
  /** Secondary bright text: brand line, body, input text, toast, X glyphs (#EDEDEF). */
  textSoft: string;
  /** Muted text and glyphs: subtitles, inactive tabs, header glyphs (#8C8C95). */
  textMuted: string;
  /** Faint text: eyebrows, counts, chevrons, disabled button labels (#6B6B74). */
  textFaint: string;
  /** Dimmer still: onboarding numerals, lock note (#5C5C65). */
  textDim: string;
  /** Input placeholder. */
  placeholder: string;
  /** Settings footer second line. */
  textFooter: string;
  /** Empty-state illustration stroke. */
  illustration: string;

  // ── States ───────────────────────────────────────────────────────────────
  /** Folder-missing dot and warning toast disc. */
  warning: string;
  warningSoft: string;
  /** Favourite heart fill. */
  danger: string;
  /** Delete button label and glyph. */
  dangerText: string;
  /** rgba(danger,.16): delete button and favourite button fill. */
  dangerSoft: string;
  /** rgba(danger,.50): delete button and favourite button border. */
  dangerEdge: string;

  // ── Scrims and translucent grounds ───────────────────────────────────────
  /** Behind bottom sheets. */
  scrim: string;
  /** Behind the batch progress card. */
  scrimHeavy: string;
  /** Bottom navigation ground. */
  navBg: string;
  /** Toast ground. */
  toastBg: string;
  /** Toast drop shadow. */
  shadow: string;
  /** Home-indicator bar under the nav and sheets (drawn only where Android has none). */
  homeBar: string;

  // ── Viewer (all on media) ────────────────────────────────────────────────
  viewerBg: string;
  viewerTopShade: string;
  viewerSheet: string;
  viewerSheetEdge: string;
  viewerRule: string;
  /** Round viewer buttons (close, zoom, favourite off). */
  mediaBtn: string;
  mediaBtnEdge: string;
  /** Play button and the "Saved" state of the save button. */
  mediaBtnSoft: string;
  mediaBtnSoftEdge: string;
  /** Share button border in the viewer action row. */
  mediaBtnOutline: string;
  white: string;
  /** Ink on the white save button. */
  onWhite: string;
  railOn: string;
  railOff: string;
  stripRing: string;
  progressTrack: string;
  homeBarOnMedia: string;
  /** Tile stamp, metadata values. */
  onMedia: string;
  /** Duration label on hero tiles. */
  onMediaBright: string;
  /** Play glyph on small tiles. */
  onMediaPlay: string;
  /** Stamp on small tiles. */
  onMediaDim: string;
  /** Counter. */
  onMediaMuted: string;
  /** Elapsed / total time. */
  onMediaTime: string;
  /** Metadata eyebrows and the double-tap hint. */
  onMediaFaint: string;

  // ── Tiles (on media) ─────────────────────────────────────────────────────
  /** Play glass disc on hero tiles. */
  glassSoft: string;
  glassEdgeSoft: string;
  /** Duration pill ground. */
  pillOnMedia: string;
  /** Unselected selection box fill. */
  boxOnMedia: string;
  /** Unselected selection box ring. */
  boxEdge: string;
  /** Bottom gradient end over a tile. */
  tileShade: string;
  /** Text shadow under the stamp. */
  textShadow: string;
}

const dark: Palette = {
  bg: '#0C0C0E',
  well: '#151517',
  surface: '#1D1D20',
  hairline: '#1D1D20',
  border: '#26262A',
  borderHi: '#2B2B30',
  track: '#101E25',

  accent: '#00C795',
  accentBright: '#5FEFC4',
  onAccent: '#04231B',
  accentChip: 'rgba(0, 199, 149, 0.12)',
  accentFill: 'rgba(0, 199, 149, 0.14)',
  accentEdge: 'rgba(0, 199, 149, 0.40)',
  accentFillEdge: 'rgba(0, 199, 149, 0.42)',
  accentUndo: 'rgba(0, 199, 149, 0.16)',
  accentWash: 'rgba(0, 199, 149, 0.18)',
  accentWashEdge: 'rgba(0, 199, 149, 0.50)',
  accentSelection: 'rgba(0, 199, 149, 0.20)',
  accentGlass: 'rgba(0, 199, 149, 0.28)',
  accentBadge: 'rgba(0, 199, 149, 0.90)',
  accentBurst: 'rgba(0, 199, 149, 0.92)',
  topBar: '#0C0C0E',
  onTopBar: '#EDEDEF',
  onTopBarMuted: '#8C8C95',
  topBarWell: '#151517',

  text: '#FAFAFA',
  textSoft: '#EDEDEF',
  textMuted: '#8C8C95',
  textFaint: '#6B6B74',
  textDim: '#5C5C65',
  placeholder: '#5C5C65',
  textFooter: '#4D4D55',
  illustration: '#35353B',

  warning: '#E0A02C',
  warningSoft: 'rgba(224, 160, 44, 0.18)',
  danger: '#FF5C7A',
  dangerText: '#FF8095',
  dangerSoft: 'rgba(255, 92, 122, 0.16)',
  dangerEdge: 'rgba(255, 92, 122, 0.50)',

  scrim: 'rgba(4, 7, 9, 0.64)',
  scrimHeavy: 'rgba(4, 8, 10, 0.78)',
  navBg: 'rgba(12, 12, 13, 0.90)',
  toastBg: 'rgba(28, 28, 32, 0.94)',
  shadow: 'rgba(0, 0, 0, 0.72)',
  homeBar: 'rgba(233, 237, 239, 0.26)',

  viewerBg: '#060607',
  viewerTopShade: 'rgba(0, 0, 0, 0.64)',
  viewerSheet: 'rgba(10, 10, 12, 0.74)',
  viewerSheetEdge: 'rgba(255, 255, 255, 0.08)',
  viewerRule: 'rgba(255, 255, 255, 0.09)',
  mediaBtn: 'rgba(255, 255, 255, 0.14)',
  mediaBtnEdge: 'rgba(255, 255, 255, 0.20)',
  mediaBtnSoft: 'rgba(255, 255, 255, 0.12)',
  mediaBtnSoftEdge: 'rgba(255, 255, 255, 0.16)',
  mediaBtnOutline: 'rgba(255, 255, 255, 0.18)',
  white: '#FFFFFF',
  onWhite: '#0B0B0C',
  railOn: 'rgba(255, 255, 255, 0.92)',
  railOff: 'rgba(255, 255, 255, 0.26)',
  stripRing: 'rgba(255, 255, 255, 0.12)',
  progressTrack: 'rgba(255, 255, 255, 0.22)',
  homeBarOnMedia: 'rgba(255, 255, 255, 0.30)',
  onMedia: 'rgba(255, 255, 255, 0.90)',
  onMediaBright: 'rgba(255, 255, 255, 0.92)',
  onMediaPlay: 'rgba(255, 255, 255, 0.88)',
  onMediaDim: 'rgba(255, 255, 255, 0.85)',
  onMediaMuted: 'rgba(255, 255, 255, 0.72)',
  onMediaTime: 'rgba(255, 255, 255, 0.70)',
  onMediaFaint: 'rgba(255, 255, 255, 0.42)',

  glassSoft: 'rgba(4, 10, 13, 0.40)',
  glassEdgeSoft: 'rgba(255, 255, 255, 0.17)',
  pillOnMedia: 'rgba(0, 0, 0, 0.50)',
  boxOnMedia: 'rgba(0, 0, 0, 0.20)',
  boxEdge: 'rgba(255, 255, 255, 0.72)',
  tileShade: 'rgba(0, 0, 0, 0.44)',
  textShadow: 'rgba(0, 0, 0, 0.40)',
};

const light: Palette = {
  bg: '#FAFAFA',
  well: '#F0F0F2',
  surface: '#E4E4E8',
  hairline: '#E4E4E8',
  border: '#D9D9DE',
  borderHi: '#CFCFD5',
  track: '#E6EBEE',

  accent: '#009E77',
  accentBright: '#00C795',
  onAccent: '#FFFFFF',
  accentChip: 'rgba(0, 158, 119, 0.10)',
  accentFill: 'rgba(0, 158, 119, 0.12)',
  accentEdge: 'rgba(0, 158, 119, 0.34)',
  accentFillEdge: 'rgba(0, 158, 119, 0.36)',
  accentUndo: 'rgba(0, 158, 119, 0.14)',
  accentWash: 'rgba(0, 158, 119, 0.16)',
  accentWashEdge: 'rgba(0, 158, 119, 0.44)',
  accentSelection: 'rgba(0, 199, 149, 0.20)',
  accentGlass: 'rgba(0, 199, 149, 0.28)',
  accentBadge: 'rgba(0, 199, 149, 0.90)',
  accentBurst: 'rgba(0, 199, 149, 0.92)',
  topBar: '#007A5C',
  onTopBar: '#FFFFFF',
  onTopBarMuted: 'rgba(255, 255, 255, 0.88)',
  topBarWell: 'rgba(255, 255, 255, 0.16)',

  text: '#111114',
  textSoft: '#1E1E23',
  textMuted: '#62626B',
  textFaint: '#8A8A93',
  textDim: '#9A9AA3',
  placeholder: '#9A9AA3',
  textFooter: '#ADADB5',
  illustration: '#CBCBD2',

  warning: '#B4780A',
  warningSoft: 'rgba(180, 120, 10, 0.14)',
  danger: '#D6335A',
  dangerText: '#B7284A',
  dangerSoft: 'rgba(214, 51, 90, 0.10)',
  dangerEdge: 'rgba(214, 51, 90, 0.38)',

  scrim: 'rgba(20, 20, 24, 0.40)',
  scrimHeavy: 'rgba(20, 20, 24, 0.56)',
  navBg: 'rgba(250, 250, 250, 0.92)',
  toastBg: 'rgba(255, 255, 255, 0.96)',
  shadow: 'rgba(20, 20, 24, 0.28)',
  homeBar: 'rgba(20, 20, 24, 0.22)',

  viewerBg: '#060607',
  viewerTopShade: 'rgba(0, 0, 0, 0.64)',
  viewerSheet: 'rgba(10, 10, 12, 0.74)',
  viewerSheetEdge: 'rgba(255, 255, 255, 0.08)',
  viewerRule: 'rgba(255, 255, 255, 0.09)',
  mediaBtn: 'rgba(255, 255, 255, 0.14)',
  mediaBtnEdge: 'rgba(255, 255, 255, 0.20)',
  mediaBtnSoft: 'rgba(255, 255, 255, 0.12)',
  mediaBtnSoftEdge: 'rgba(255, 255, 255, 0.16)',
  mediaBtnOutline: 'rgba(255, 255, 255, 0.18)',
  white: '#FFFFFF',
  onWhite: '#0B0B0C',
  railOn: 'rgba(255, 255, 255, 0.92)',
  railOff: 'rgba(255, 255, 255, 0.26)',
  stripRing: 'rgba(255, 255, 255, 0.12)',
  progressTrack: 'rgba(255, 255, 255, 0.22)',
  homeBarOnMedia: 'rgba(255, 255, 255, 0.30)',
  onMedia: 'rgba(255, 255, 255, 0.90)',
  onMediaBright: 'rgba(255, 255, 255, 0.92)',
  onMediaPlay: 'rgba(255, 255, 255, 0.88)',
  onMediaDim: 'rgba(255, 255, 255, 0.85)',
  onMediaMuted: 'rgba(255, 255, 255, 0.72)',
  onMediaTime: 'rgba(255, 255, 255, 0.70)',
  onMediaFaint: 'rgba(255, 255, 255, 0.42)',

  glassSoft: 'rgba(4, 10, 13, 0.40)',
  glassEdgeSoft: 'rgba(255, 255, 255, 0.17)',
  pillOnMedia: 'rgba(0, 0, 0, 0.50)',
  boxOnMedia: 'rgba(0, 0, 0, 0.20)',
  boxEdge: 'rgba(255, 255, 255, 0.72)',
  tileShade: 'rgba(0, 0, 0, 0.44)',
  textShadow: 'rgba(0, 0, 0, 0.40)',
};

export const palettes = { dark, light };

/**
 * The prototype's two faces, bundled as static TTFs in `assets/fonts`
 * (copied into the Android assets by react-native.config.js).
 *
 * On Android a font is addressed by its FILE name, and asking for a
 * `fontWeight` on top of a named-weight file makes the platform synthesise a
 * fake bold over it. So weight is chosen by picking the family, and NO style
 * in the app may set `fontWeight` (an architecture test enforces this).
 */
export const fonts = {
  sans: 'InstrumentSans-Regular',
  sansMedium: 'InstrumentSans-Medium',
  sansSemi: 'InstrumentSans-SemiBold',
  sansBold: 'InstrumentSans-Bold',
  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
} as const;

type SansWeight = 400 | 500 | 600 | 700;
type MonoWeight = 400 | 500;

const SANS: Record<SansWeight, string> = {
  400: fonts.sans,
  500: fonts.sansMedium,
  600: fonts.sansSemi,
  700: fonts.sansBold,
};
const MONO: Record<MonoWeight, string> = {
  400: fonts.mono,
  500: fonts.monoMedium,
};

/** Resolves a CSS `em` tracking value to the pixel letterSpacing RN wants. */
const em = (size: number, value: number) => Math.round(size * value * 100) / 100;

interface TextSpec {
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  lineHeight?: number;
  textTransform?: 'uppercase';
}

/** `font: <weight> <size>/<line> 'Instrument Sans'` from the prototype. */
/*
 * The shortest line box each face can be drawn in without losing anything.
 *
 * Android sizes a line by the font's winAscent + winDescent and clips whatever
 * falls outside, unlike CSS, which lets a glyph overflow a tight line box and
 * still paints it. The prototype sets `line-height: 1` on its single-line
 * labels, and carrying that number over cut the tail off every g, y, p and q
 * in the app: "English" in the language list, "Open messaging app" on the
 * Feed, every nav label. Measured from the shipped files:
 * InstrumentSans needs 1.336em, JetBrainsMono 1.320em.
 */
const MIN_LINE_SANS = 1.34;
const MIN_LINE_MONO = 1.32;

export const sans = (
  size: number,
  weight: SansWeight = 400,
  opts: { tracking?: number; line?: number; uppercase?: boolean } = {},
): TextSpec => ({
  fontFamily: SANS[weight],
  fontSize: size,
  letterSpacing: opts.tracking ? em(size, opts.tracking) : 0,
  ...(opts.line
    ? {
        lineHeight:
          Math.round(size * Math.max(opts.line, MIN_LINE_SANS) * 10) / 10,
      }
    : {}),
  ...(opts.uppercase ? { textTransform: 'uppercase' as const } : {}),
});

/** `.mono` spans from the prototype (JetBrains Mono, tabular numerals). */
export const mono = (
  size: number,
  weight: MonoWeight = 400,
  opts: { tracking?: number; uppercase?: boolean; line?: number } = {},
): TextSpec => ({
  fontFamily: MONO[weight],
  fontSize: size,
  letterSpacing: opts.tracking ? em(size, opts.tracking) : 0,
  ...(opts.line
    ? {
        lineHeight:
          Math.round(size * Math.max(opts.line, MIN_LINE_MONO) * 10) / 10,
      }
    : {}),
  ...(opts.uppercase ? { textTransform: 'uppercase' as const } : {}),
});

/**
 * Height of a line box in a block that sets no font-size: the prototype's body
 * is 16px Instrument Sans, and the face asks for `normal` leading of
 * (970 ascent + 250 descent) / 1000 upem = 1.22em → 19.5px. An inline span
 * inside such a block is laid out against this strut whatever its own size, so
 * a 9.5px eyebrow still occupies 19.5px of column.
 */
const BLOCK_STRUT = 19.5;

/**
 * Type ramp, one entry per distinct `font:` shorthand in the prototype.
 * Colours are applied at the call site from the palette.
 */
export const type = {
  /** 12.5/600, .15em, uppercase — "STATUS SAVER" brand line (feed header, onboarding). */
  brand: sans(12.5, 600, { tracking: 0.15, uppercase: true, line: 1 }),
  /** 17/600, -.022em — screen titles: Library, Tools, Settings. */
  screenTitle: sans(17, 600, { tracking: -0.022, line: 1 }),
  /** 33/500, -.032em, 1.12 — onboarding headline. */
  display: sans(33, 500, { tracking: -0.032, line: 1.12 }),
  /** 22/500, -.025em, 1.2 — full-screen prompt title. */
  promptTitle: sans(22, 500, { tracking: -0.025, line: 1.2 }),
  /** 20/500, -.02em — selection count. */
  heading: sans(20, 500, { tracking: -0.02, line: 1 }),
  /** 19/500, -.015em, 1.3 — empty-state title. */
  emptyTitle: sans(19, 500, { tracking: -0.015, line: 1.3 }),
  /** 18/500, -.02em — batch card title. */
  cardTitle: sans(18, 500, { tracking: -0.02, line: 1 }),
  /** 14.5/500, 1.2 — row titles, card titles. */
  rowTitle: sans(14.5, 500, { line: 1.2 }),
  /** 14.5/500 — sheet options. */
  option: sans(14.5, 500),
  /** 14.5/600 — onboarding CTA label. */
  cta: sans(14.5, 600, { line: 1 }),
  /** 14/600 — selection actions, viewer Save/Repost, Open chat. */
  action: sans(14, 600),
  /** 14/500 — filter tab labels (inactive). */
  label: sans(14, 500),
  /** 14/600 — filter tab labels (active). */
  labelActive: sans(14, 600),
  /** 13.5/600 — Unlock/Open WhatsApp buttons. */
  button: sans(13.5, 600, { line: 1 }),
  /** 13.5/500, 1.2 — sub-row label inside a card ("Send straight to Vault"). */
  subRow: sans(13.5, 500, { line: 1.2 }),
  /** 13.5/400, 1.55 — empty-state body. */
  bodyLg: sans(13.5, 400, { line: 1.55 }),
  /** 13.5/400, 1.62 — onboarding lede. */
  lede: sans(13.5, 400, { line: 1.62 }),
  /** 13.5/400 — search input text. */
  input: sans(13.5, 400),
  /** 13/500, 1.35 — toast message. */
  toast: sans(13, 500, { line: 1.35 }),
  /** 13/500 — row value on the right, "Not now", "Cancel". */
  value: sans(13, 500, { line: 1 }),
  /** 13/600, .02em — brand line inside the Settings card. */
  brandCard: sans(13, 600, { tracking: 0.02, line: 1 }),
  /** 13/400, 1.5 — onboarding steps. */
  step: sans(13, 400, { line: 1.5 }),
  /** 12.5/500 — chips, segment labels, metadata values (inactive). */
  chip: sans(12.5, 500),
  /** 12.5/600 — chips and segments when active, "Select all", "Change". */
  chipActive: sans(12.5, 600, { line: 1 }),
  /** 12.5/400, 1.5 — PIN hint / secondary prompt copy. */
  hint: sans(12.5, 400, { line: 1.5 }),
  /** 12.5/400, 1.55 — Tools "Message a number" paragraph. */
  paragraph: sans(12.5, 400, { line: 1.55 }),
  /** 12/600 — "Select" header link. */
  link: sans(12, 600, { line: 1 }),
  /** 12/400, 1.55 — Settings card body. */
  body: sans(12, 400, { line: 1.55 }),
  /** 12/400, 1.35 — row subtitles that wrap ("Hide from recents", "Keep originals"). */
  rowSub: sans(12, 400, { line: 1.35 }),
  /** 12/400, 1.2 — the single-line row subtitles ("Status folder", "Language"). */
  rowSubTight: sans(12, 400, { line: 1.2 }),
  /** 12/400, 1.5 — batch card body. */
  bodySm: sans(12, 400, { line: 1.5 }),
  /** 11.5/400, 1.4 — card subtitles, footnotes. */
  small: sans(11.5, 400, { line: 1.4 }),
  /** 11.5/600, .02em — toast Undo. */
  smallStrong: sans(11.5, 600, { tracking: 0.02, line: 1 }),
  /** 11/500 — bottom nav labels (inactive). */
  navLabel: sans(11, 500),
  /** 11/600 — bottom nav labels (active), header "Auto" chip. */
  navLabelActive: sans(11, 600, { line: 1 }),
  /** 11/400, 1.4 — settings footer and viewer hint. */
  footer: sans(11, 400, { line: 1.4 }),

  /**
   * Mono 9.5/500, .13em, uppercase — the grid's section headers (template
   * 162/203), where the span is a flex item and so sizes to its own box.
   */
  eyebrow: mono(9.5, 500, { tracking: 0.13, uppercase: true }),
  /**
   * The same face in the block eyebrows (Tools/Settings/Help/About section
   * labels and sheet titles, template 304–350/385–417/607/623).
   *
   * Those spans are *inline* inside a plain block `div`, so the line box is
   * the block's own strut — the inherited 16px Instrument Sans — and not the
   * 9.5px span. RN has no strut, so the height is spelled out here.
   */
  eyebrowBlock: {
    ...mono(9.5, 500, { tracking: 0.13, uppercase: true }),
    lineHeight: BLOCK_STRUT,
  },
  /** Mono 9.5/400, .1em, uppercase — Library meta line. */
  metaLine: mono(9.5, 400, { tracking: 0.1, uppercase: true }),
  /** Mono 9.5/400, .12em, uppercase — Tools "automation & storage". */
  metaLineWide: mono(9.5, 400, { tracking: 0.12, uppercase: true }),
  /** Mono 9/400, .12em, uppercase — "What to keep". */
  eyebrowSm: mono(9, 400, { tracking: 0.12, uppercase: true }),
  /** Mono 9/400, .1em, uppercase — viewer metadata labels. */
  eyebrowMedia: mono(9, 400, { tracking: 0.1, uppercase: true }),
  /** Mono 10/400, .08em, uppercase — toast meta. */
  monoMeta: mono(10, 400, { tracking: 0.08, uppercase: true }),
  /** Mono 10/400 — viewer elapsed / total. */
  monoTime: mono(10, 400),
  /** Mono 8.5/500, .1em, uppercase — "new" badge. */
  badge: mono(8.5, 500, { tracking: 0.1, uppercase: true }),
  /** Mono 8.5/500 — duration pill on small tiles. */
  monoXs: mono(8.5, 500),
  /** Mono 9.5/500 — hero-tile duration pill, small-tile stamp. */
  monoSmStrong: mono(9.5, 500),
  /** Mono 9.5/400 — chip and section counts. */
  monoSm: mono(9.5, 400),
  /** Mono 10.5/500 — hero-tile stamp, filter-tab counts. */
  mono: mono(10.5, 500),
  /** Mono 10.5/400 — onboarding numerals, settings version line. */
  monoLight: mono(10.5, 400),
  /** Mono 10.5/400, .06em — viewer counter. */
  monoCounter: mono(10.5, 400, { tracking: 0.06 }),
  /** Mono 11/400 — selection size, save-folder path. */
  monoMd: mono(11, 400),
  /** Mono 12/400 — batch "3 / 12". */
  monoLg: mono(12, 400),
  /** Mono 14/400 — dial code and phone inputs. */
  monoInput: mono(14, 400),
} as const;

/** Spacing steps that recur across the prototype. */
export const space = {
  xxs: 4,
  xs: 6,
  /** Header cluster gap, chip gap. */
  tight: 7,
  sm: 8,
  /** Action-row gap, section-header gap. */
  gap: 10,
  md: 12,
  /** Tray padding, sheet inner padding. */
  row: 14,
  lg: 16,
  /** Nav, tray and toast side inset. */
  bar: 18,
  /** Header side inset (feed/library/tools/settings title rows, grids). */
  screen: 20,
  /** Eyebrow, card and list side inset. */
  xl: 22,
  /** Onboarding side inset. */
  xxl: 26,
  /** Sheet bottom spacer. */
  huge: 34,
} as const;

export const radius = {
  /** Duration pill on small tiles. */
  xxs: 5,
  /** Hero duration pill, thumbnail strip. */
  xs: 6,
  /** "new" badge. */
  badge: 7,
  /** Toast Undo button. */
  undo: 9,
  /** Theme segment buttons. */
  sm: 10,
  /** Collection and auto-mode chips. */
  chip: 11,
  md: 12,
  /** Library search field. */
  search: 13,
  /** Selection actions, empty-state CTA, segment wells, dial/phone field, Open chat. */
  lg: 14,
  /** Viewer action buttons, toast. */
  toast: 15,
  /** Cards, onboarding CTA, header "Auto" chip and 32px round buttons. */
  xl: 16,
  /** Media tiles. */
  tile: 18,
  /** Batch progress card. */
  batch: 22,
  /** Bottom sheets. */
  sheet: 24,
  /** Viewer bottom sheet. */
  viewerSheet: 26,
  pill: 999,
} as const;

/**
 * Grid metrics for the media tiles: 8px gutters, 20px screen inset, rounded
 * 18px tiles at 1:1.18. The first four items sit in two columns under the
 * first section header; the rest in three columns under the second.
 */
export const grid = {
  gutter: 8,
  edge: 20,
  /** Tile aspect ratio (height / width). */
  ratio: 1.18,
  heroCount: 4,
  heroCols: 2,
  restCols: 3,
} as const;

/** Fixed control sizes from the prototype. */
export const size = {
  /** Round header buttons and the "Auto" chip. */
  headerBtn: 32,
  /** Selection tray buttons. */
  trayBtn: 48,
  /** Viewer action buttons, dial/phone field, Open chat. */
  viewerBtn: 50,
  /** Viewer round buttons. */
  mediaBtn: 40,
  /** Play/pause disc, theme segment height, auto-mode chips. */
  control: 38,
  /** Standard button height (Unlock, Open WhatsApp, Not now). */
  button: 46,
  /** Onboarding CTA height. */
  cta: 54,
  /** Search field height. */
  search: 42,
  /** Toggle track. */
  toggleW: 44,
  toggleH: 26,
  toggleThumb: 20,
  /** Smaller toggle inside a card. */
  toggleSmW: 40,
  toggleSmH: 24,
  toggleSmThumb: 18,
  /** Home indicator bar. */
  homeBarW: 134,
  homeBarH: 5,
  /** Sheet grabber. */
  grabberW: 38,
  grabberH: 4,
} as const;
