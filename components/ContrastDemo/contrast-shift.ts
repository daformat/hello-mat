/*
 * contrast-shift - move a colour to a contrasting version of itself.
 *
 * Keeps hue and, where the gamut allows, chroma, moving only OKLCh lightness,
 * and only as far as the target requires. Scores against WCAG 2.1 or APCA Lc.
 *
 * There is nothing React in here on purpose: it is a handful of pure functions
 * over arrays of three numbers, which is what makes it testable, runnable in
 * Node, and cheap enough to call a few hundred times per frame while you drag
 * a colour picker around.
 */

export type Rgb = [number, number, number];
export type Oklch = [L: number, C: number, H: number];
export type MetricId = "wcag" | "apca";

/* ---------- sRGB transfer ---------- */

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

const toGamma = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ---------- hex <-> rgb (0..1) ---------- */

export const hexToRgb = (hex: string): Rgb | null => {
  let h = String(hex).replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    return null;
  }
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as Rgb;
};

/** Same, for the places that have already validated the string. */
export const rgb = (hex: string): Rgb => hexToRgb(hex) ?? [0, 0, 0];

export const rgbToHex = (color: Rgb) =>
  "#" +
  color
    .map((v) =>
      Math.round(clamp01(v) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("");

/* ---------- sRGB <-> OKLab (Björn Ottosson) ---------- */

const rgbToOklab = ([r, g, b]: Rgb): Rgb => {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
};

const oklabToRgb = ([L, a, b]: Rgb): Rgb => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(toGamma) as Rgb;
};

export const rgbToOklch = (color: Rgb): Oklch => {
  const [L, a, b] = rgbToOklab(color);
  return [L, Math.hypot(a, b), Math.atan2(b, a)];
};

const oklchToRgb = ([L, C, H]: Oklch): Rgb =>
  oklabToRgb([L, C * Math.cos(H), C * Math.sin(H)]);

/* ---------- gamut ---------- */

const EPS = 1e-6;
const inGamut = (color: Rgb) => color.every((v) => v >= -EPS && v <= 1 + EPS);

/** Largest chroma <= C that stays inside sRGB at this L and H. */
export const fitChroma = (L: number, C: number, H: number): Rgb => {
  const direct = oklchToRgb([L, C, H]);
  if (inGamut(direct)) {
    return direct.map(clamp01) as Rgb;
  }
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb([L, mid, H]))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return oklchToRgb([L, lo, H]).map(clamp01) as Rgb;
};

/* ---------- metric 1: WCAG 2.1 ---------- */

export const luminance = ([r, g, b]: Rgb) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

export const contrastRatio = (a: Rgb, b: Rgb) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/* ---------- metric 2: APCA (SA98G, apca-w3 0.1.9 constants) ----------
   APCA uses a plain 2.4 exponent, not sRGB's piecewise transfer. Lc is signed:
   positive is dark text on a light background, negative is light on dark. */

const APCA = {
  trc: 2.4,
  rco: 0.2126729,
  gco: 0.7151522,
  bco: 0.072175,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scale: 1.14,
  offset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1,
};

const apcaY = ([r, g, b]: Rgb) =>
  APCA.rco * Math.pow(r, APCA.trc) +
  APCA.gco * Math.pow(g, APCA.trc) +
  APCA.bco * Math.pow(b, APCA.trc);

export const apcaLc = (txtRgb: Rgb, bgRgb: Rgb) => {
  let t = apcaY(txtRgb);
  let b = apcaY(bgRgb);

  // soft clamp near black
  t = t > APCA.blkThrs ? t : t + Math.pow(APCA.blkThrs - t, APCA.blkClmp);
  b = b > APCA.blkThrs ? b : b + Math.pow(APCA.blkThrs - b, APCA.blkClmp);

  if (Math.abs(b - t) < APCA.deltaYmin) {
    return 0;
  }

  let sapc: number;
  let out: number;
  if (b > t) {
    // normal polarity: dark text on a light background
    sapc = (Math.pow(b, APCA.normBG) - Math.pow(t, APCA.normTXT)) * APCA.scale;
    out = sapc < APCA.loClip ? 0 : sapc - APCA.offset;
  } else {
    // reverse polarity: light text on a dark background
    sapc = (Math.pow(b, APCA.revBG) - Math.pow(t, APCA.revTXT)) * APCA.scale;
    out = sapc > -APCA.loClip ? 0 : sapc + APCA.offset;
  }
  return out * 100;
};

/* ---------- one interface for both metrics ---------- */

export type Metric = {
  id: MetricId;
  label: string;
  score: (fg: Rgb, bg: Rgb) => number;
  fmt: (value: number) => string;
  targets: [value: number, label: string][];
  def: number;
};

export const METRICS: Record<MetricId, Metric> = {
  wcag: {
    id: "wcag",
    label: "WCAG 2.1",
    score: (fg, bg) => contrastRatio(fg, bg),
    fmt: (v) => v.toFixed(2) + ":1",
    targets: [
      [3, "3:1 large text"],
      [4.5, "4.5:1 body text"],
      [7, "7:1 AAA"],
    ],
    def: 4.5,
  },
  apca: {
    id: "apca",
    label: "APCA",
    score: (fg, bg) => Math.abs(apcaLc(fg, bg)),
    fmt: (v) => "Lc " + v.toFixed(1),
    targets: [
      [45, "Lc 45 large or bold"],
      [60, "Lc 60 fluent text"],
      [75, "Lc 75 body minimum"],
      [90, "Lc 90 body preferred"],
    ],
    def: 75,
  },
};

export const polarity = (fg: Rgb, bg: Rgb) =>
  apcaLc(fg, bg) >= 0 ? "dark on light" : "light on dark";

/* ---------- the shift ---------- */

export type ShiftOptions = {
  /** 4.5 for WCAG, 75 for APCA. */
  target?: number;
  /** false lets the colour desaturate to reach the target. */
  preserveChroma?: boolean;
  metric?: MetricId;
};

export type ShiftResult = {
  rgb: Rgb;
  hex: string;
  score: number;
  /** The lightness landed on, and the one started from. */
  L: number;
  L0: number;
  C0: number;
  H: number;
  direction: "none" | "lighter" | "darker";
  /** false means nothing at this hue clears the target: this is a best effort. */
  reached: boolean;
  metric: MetricId;
};

export const contrastShift = (
  colorHex: string,
  bgHex: string,
  { target = 4.5, preserveChroma = true, metric = "wcag" }: ShiftOptions = {}
): ShiftResult => {
  const M = METRICS[metric];
  const bgRgb = rgb(bgHex);
  const srcRgb = rgb(colorHex);
  const [L0, C0, H] = rgbToOklch(srcRgb);

  if (M.score(srcRgb, bgRgb) >= target) {
    return {
      rgb: srcRgb,
      hex: rgbToHex(srcRgb),
      score: M.score(srcRgb, bgRgb),
      L: L0,
      L0,
      C0,
      H,
      direction: "none",
      reached: true,
      metric,
    };
  }

  const chromaAt = (L: number) =>
    preserveChroma ? C0 : C0 * (1 - Math.abs(L - L0) * 0.5);
  const render = (L: number) => fitChroma(L, chromaAt(L), H);

  // The score is monotonic in L on either side of the background, so each
  // direction can be bisected. That is the whole algorithm: no heuristics, no
  // step sizes to tune, and the answer is the smallest move that clears the bar.
  const seek = (end: number) => {
    const endRgb = render(end);
    if (M.score(endRgb, bgRgb) < target) {
      return { L: end, rgb: endRgb, score: M.score(endRgb, bgRgb), ok: false };
    }
    let lo = L0;
    let hi = end;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      if (M.score(render(mid), bgRgb) >= target) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return {
      L: hi,
      rgb: render(hi),
      score: M.score(render(hi), bgRgb),
      ok: true,
    };
  };

  const up = seek(1);
  const down = seek(0);

  let pick: ReturnType<typeof seek>;
  if (up.ok && down.ok) {
    pick = Math.abs(up.L - L0) <= Math.abs(down.L - L0) ? up : down;
  } else if (up.ok) {
    pick = up;
  } else if (down.ok) {
    pick = down;
  } else {
    // unreachable at this hue: return the best available and say so
    pick = up.score >= down.score ? up : down;
  }

  return {
    rgb: pick.rgb,
    hex: rgbToHex(pick.rgb),
    score: pick.score,
    L: pick.L,
    L0,
    C0,
    H,
    direction: pick.L > L0 ? "lighter" : "darker",
    reached: pick.ok,
    metric,
  };
};

/* ---------- the black-or-white question, for comparison ---------- */

/** NTSC luma on gamma-encoded values. Wrong on three counts, kept for reference. */
export const yiqLuma = (color: Rgb) =>
  (color[0] * 255 * 299 + color[1] * 255 * 587 + color[2] * 255 * 114) / 1000;

export const yiqInk = (color: Rgb) =>
  yiqLuma(color) >= 128 ? "#000000" : "#ffffff";

/**
 * The luminance where black and white contrast equally under WCAG:
 *   (1 + .05)/(Y + .05) = (Y + .05)/.05  ->  Y = sqrt(0.0525) - 0.05
 * Use the exact value rather than 0.179: the rounded form disagrees with the
 * greater-of-black-or-white rule on about 0.03% of sRGB colours. This is what
 * contrast-color() returns, bit for bit.
 */
export const INK_CROSSOVER = Math.sqrt(0.0525) - 0.05; // 0.1791287847...

export const readableInk = (color: Rgb) =>
  luminance(color) > INK_CROSSOVER ? "#000000" : "#ffffff";

/* ---------- JS mirrors of the CSS expressions ----------
   Only used when a browser cannot compute the relative-colour syntax itself.
   Everywhere else the panes read what the engine actually painted, because a
   simulation of a CSS bug is not evidence that the bug exists. */

export const cssYiqFallback = (bgRgb: Rgb, steep: number): Rgb => {
  const v = Math.min(255, Math.max(0, (yiqLuma(bgRgb) - 128) * -steep));
  return [v / 255, v / 255, v / 255];
};

export const cssLumFallback = (bgRgb: Rgb): Rgb => {
  const Y =
    0.2126 * Math.pow(bgRgb[0], 2.2) +
    0.7152 * Math.pow(bgRgb[1], 2.2) +
    0.0722 * Math.pow(bgRgb[2], 2.2);
  const v = Math.min(255, Math.max(0, (Y - 0.1791288) * -100000));
  return [v / 255, v / 255, v / 255];
};

/** Both numbers, whichever metric is showing: the other one is never far away. */
export const dualScore = (color: Rgb, bgRgb: Rgb) =>
  `${contrastRatio(color, bgRgb).toFixed(2)}:1 · Lc ${apcaLc(
    color,
    bgRgb
  ).toFixed(1)}`;
