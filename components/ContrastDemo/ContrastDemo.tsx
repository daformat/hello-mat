import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  apcaLc,
  contrastRatio,
  contrastShift,
  cssLumFallback,
  cssYiqFallback,
  dualScore,
  fitChroma,
  hexToRgb,
  MetricId,
  METRICS,
  polarity,
  readableInk,
  Rgb,
  rgb,
  rgbToHex,
  rgbToOklch,
  yiqInk,
  yiqLuma,
} from "./contrast-shift";
import styles from "./ContrastDemo.module.scss";

/**
 * The contrast playground.
 *
 * Two questions are being asked here, and they are not the same one. The first
 * is "given this background, should the text be black or white", which the
 * browser now answers itself. The second is "I picked this colour and it isn't
 * readable, give me the nearest version of it that is", which it does not.
 *
 * The parts are separate components sharing one provider, so the page can put
 * prose between them and still have a single metric and a single target running
 * through the lot.
 *
 * Everything that claims a browser behaviour is read back off the browser rather
 * than simulated: the panes that demonstrate the CSS expressions carry the real
 * declarations, and what they report is what the engine painted. A JS mirror of
 * the same maths only steps in where a browser cannot compute the expression at
 * all, and the demo says so when it does.
 */

const cx = (...names: (string | undefined | false)[]) =>
  names.filter(Boolean).join(" ");

const SCHEMES = {
  auto: "light dark",
  light: "light",
  dark: "dark",
} as const;

type SchemeId = keyof typeof SCHEMES;

type ContrastContextValue = {
  metric: MetricId;
  setMetric: (next: MetricId) => void;
  target: number;
  setTarget: (next: number) => void;
  scheme: SchemeId;
  setScheme: (next: SchemeId) => void;
};

const ContrastContext = createContext<ContrastContextValue | null>(null);

const useContrast = () => {
  const value = useContext(ContrastContext);
  if (!value) {
    throw new Error(
      "ContrastDemo parts need a ContrastDemo.Provider above them"
    );
  }
  return value;
};

const Provider = ({ children }: { children: ReactNode }) => {
  const [metric, setMetricState] = useState<MetricId>("wcag");
  const [target, setTarget] = useState(METRICS.wcag.def);
  const [scheme, setScheme] = useState<SchemeId>("auto");

  // Switching metric switches units, so the target has to come along with it:
  // 4.5 means body text under WCAG and nothing at all under APCA.
  const setMetric = useCallback((next: MetricId) => {
    setMetricState(next);
    setTarget(METRICS[next].def);
  }, []);

  const value = useMemo(
    () => ({ metric, setMetric, target, setTarget, scheme, setScheme }),
    [metric, setMetric, target, scheme]
  );

  return (
    <ContrastContext.Provider value={value}>
      {children}
    </ContrastContext.Provider>
  );
};

/* ---------- reading a colour the browser computed ---------- */

/**
 * The whole point of the CSS panes is that they are not a simulation, so the
 * numbers next to them have to come from the same place the colour did. Both
 * spellings are handled because engines are free to serialise either one.
 */
const readComputedInk = (element: Element): Rgb | null => {
  const color = getComputedStyle(element).color;
  const legacy = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (legacy) {
    return legacy.slice(1, 4).map((v) => Number(v) / 255) as Rgb;
  }
  const modern = color.match(
    /color\(\s*srgb\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/i
  );
  if (modern) {
    return modern
      .slice(1, 4)
      .map((v) => Math.min(1, Math.max(0, Number(v)))) as Rgb;
  }
  return null;
};

/* ---------- the shared toolbar ---------- */

const Toolbar = () => {
  const { metric, setMetric, target, setTarget, scheme, setScheme } =
    useContrast();
  const targetId = useId();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  // A sentinel rather than the bar itself: a sticky element is always
  // intersecting, so it cannot observe its own arrival at the top.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !("IntersectionObserver" in window)) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setStuck(entries[0]?.intersectionRatio === 0),
      { threshold: [0] }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className={styles.sentinel} ref={sentinelRef} />
      <div className={cx(styles.toolbar_wrap, stuck && styles.is_stuck)}>
        <div className={styles.toolbar}>
          <p className={cx(styles.chip_label, styles.grow)}>Scoring metric</p>

          <div className={styles.segmented} role="group" aria-label="Metric">
            {(["wcag", "apca"] as const).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={metric === id}
                onClick={() => setMetric(id)}
              >
                {METRICS[id].label}
              </button>
            ))}
          </div>

          <label className={styles.chip_label} htmlFor={targetId}>
            Target
          </label>
          <select
            id={targetId}
            value={target}
            onChange={(event) => setTarget(parseFloat(event.target.value))}
          >
            {METRICS[metric].targets.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div
            className={styles.segmented}
            role="group"
            aria-label="Demo theme"
          >
            {(Object.keys(SCHEMES) as SchemeId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={scheme === id}
                onClick={() => setScheme(id)}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Wraps a toolbar and everything it drives. The bar is sticky, and sticky is
 * bounded by its own parent, so this is also what stops it following you into
 * the rest of the page once the last thing it controls has gone by.
 *
 * The toolbar is not rendered here: the page places it, because where it goes
 * relative to the section heading is a question about the page rather than
 * about the demo.
 */
const Bench = ({ children }: { children: ReactNode }) => {
  const { scheme } = useContrast();
  return (
    <div className={styles.bench} style={{ colorScheme: SCHEMES[scheme] }}>
      {children}
    </div>
  );
};

/* ---------- part one: contrast-color() against YIQ ---------- */

const PALETTE: [name: string, hex: string][] = [
  ["blue", "#3b82f6"],
  ["red", "#ef4444"],
  ["violet", "#8b5cf6"],
  ["amber", "#fbbf24"],
  ["emerald", "#10b981"],
  ["slate", "#64748b"],
  ["steel", "#4682b4"],
  ["choc", "#d2691e"],
];

const Swatches = () => {
  const { scheme, metric, target } = useContrast();
  const M = METRICS[metric];
  const hostRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [native, setNative] = useState<Record<string, string>>({});

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const canCompute =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("color", "contrast-color(red)");
    setSupported(canCompute);
    if (!canCompute) {
      // The rule falls back to plain white, so reading it back would report a
      // browser answer that no browser gave.
      return;
    }
    const read: Record<string, string> = {};
    host.querySelectorAll<HTMLElement>("[data-swatch]").forEach((element) => {
      const ink = readComputedInk(element);
      if (ink && element.dataset.swatch) {
        read[element.dataset.swatch] = rgbToHex(ink);
      }
    });
    setNative(read);
  }, []);

  const disagree = PALETTE.filter(
    ([, hex]) => readableInk(rgb(hex)) !== yiqInk(rgb(hex))
  ).length;

  const mismatched = PALETTE.some(
    ([name, hex]) => native[name] && native[name] !== readableInk(rgb(hex))
  );

  return (
    <div
      className={styles.demo}
      ref={hostRef}
      style={{
        colorScheme: SCHEMES[scheme],
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <p
        className={styles.support_banner}
        data-supported={supported === null ? "unknown" : String(supported)}
      >
        <span className={styles.dot} />
        <span className={styles.grow}>
          {supported === null
            ? "Checking support"
            : supported
            ? "Supported here, so the first line in each swatch is the browser's own answer"
            : "Not supported here, so the first line falls back to the JS equivalent"}
        </span>
        <code>
          CSS.supports(&apos;color&apos;, &apos;contrast-color(red)&apos;)
        </code>
      </p>

      <div className={styles.swatches}>
        {PALETTE.map(([name, hex]) => {
          const background = rgb(hex);
          const exact = readableInk(background);
          const yiq = yiqInk(background);
          const readBack = native[name];
          // The colour made readable on itself. Every other line in the swatch
          // throws the colour away to answer the question, which is what makes
          // this one worth putting next to them.
          const shifted = contrastShift(hex, hex, { target, metric });
          return (
            <div
              key={name}
              className={styles.swatch}
              style={{ background: hex, ["--bg" as string]: hex }}
            >
              <p className={styles.sw_name} style={{ color: exact }}>
                {hex}
              </p>
              <p
                className={styles.cc_native}
                data-swatch={name}
                style={supported === false ? { color: exact } : undefined}
              >
                contrast-color(){" "}
                <span className={styles.sw_tag}>
                  {readBack
                    ? `${readBack}${readBack === exact ? "" : " differs!"}`
                    : `${exact} (fallback)`}
                </span>
              </p>
              <p style={{ color: exact }}>
                threshold{" "}
                <span className={styles.sw_tag}>
                  {exact} · {contrastRatio(rgb(exact), background).toFixed(2)}:1
                </span>
              </p>
              <p style={{ color: yiq }}>
                YIQ{" "}
                <span className={styles.sw_tag}>
                  {yiq} · {contrastRatio(rgb(yiq), background).toFixed(2)}:1
                </span>
              </p>
              <p style={{ color: shifted.hex }}>
                shifted{" "}
                <span className={styles.sw_tag}>
                  {shifted.hex} · {M.fmt(shifted.score)}
                  {shifted.reached ? "" : " best effort"}
                </span>
              </p>
              {exact !== yiq ? (
                <span className={styles.sw_flag} style={{ color: exact }}>
                  YIQ picks the worse one
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className={styles.verdict_line}>
        {supported === false ? (
          <>
            This browser cannot compute <code>contrast-color()</code>, so the
            first line of each swatch shows the JS equivalent. YIQ still picks
            differently on{" "}
            <strong>
              {disagree} of {PALETTE.length}
            </strong>{" "}
            swatches.
          </>
        ) : (
          <>
            The browser&rsquo;s <code>contrast-color()</code> and the derived
            threshold agree on all {PALETTE.length} swatches
            {mismatched ? <strong> except where marked</strong> : null}. YIQ
            picks differently on{" "}
            <strong>
              {disagree} of {PALETTE.length}
            </strong>
            , and every time it picks the lower-contrast option.
          </>
        )}
      </p>
    </div>
  );
};

/* ---------- part two: six worked cases ---------- */

const CASES: { fg: string; bg: string; note: string }[] = [
  {
    fg: "#3b82f6",
    bg: "#ffffff",
    note: "A short hop. The blue stays unmistakably blue, which is the common case.",
  },
  {
    fg: "#1e3a8a",
    bg: "#ffffff",
    note: "Already over the bar, so nothing moves. The cheapest correction is no correction, and it is worth having a function that can say so.",
  },
  {
    fg: "#8b5cf6",
    bg: "#f5f3ff",
    note: "A brand colour on its own tint, which is where this comes up most. It clears the bar having barely moved, and nobody would call it a different violet.",
  },
  {
    fg: "#ef4444",
    bg: "#7f1d1d",
    note: "Down is blocked, so it goes up. The direction is chosen, never assumed.",
  },
  {
    fg: "#fde047",
    bg: "#ffffff",
    note: "No yellow gets there on white. What comes back is olive: the gamut telling you this wants to be a background, not text.",
  },
  {
    fg: "#22c55e",
    bg: "#0b1120",
    note: "Light on dark. Switch metrics and APCA scores the reverse polarity on its own curve.",
  },
];

const Examples = () => {
  const { metric, target } = useContrast();
  const M = METRICS[metric];

  return (
    <div className={styles.examples}>
      {CASES.map((example) => {
        const bgRgb = rgb(example.bg);
        const fgRgb = rgb(example.fg);
        const shifted = contrastShift(example.fg, example.bg, {
          target,
          metric,
        });
        const ink = yiqInk(bgRgb);

        const rows: [string, string, Rgb][] = [
          ["as typed", example.fg, fgRgb],
          ["shifted", shifted.hex, shifted.rgb],
          ["yiq ink", ink, rgb(ink)],
        ];

        return (
          <article
            key={`${example.fg}-${example.bg}`}
            className={cx(styles.chip, styles.example)}
          >
            <div
              className={styles.example_stage}
              style={{ background: example.bg }}
            >
              <p style={{ color: example.fg }}>As typed</p>
              <p style={{ color: shifted.hex }}>Shifted</p>
              <p style={{ color: ink }}>YIQ ink</p>
            </div>
            <div className={styles.example_meta}>
              <p className={styles.chip_label}>
                {example.fg} on {example.bg}
                <span className={styles.target_tag}>
                  target {M.fmt(target)}
                </span>
              </p>
              <dl>
                {rows.map(([name, hex, color]) => {
                  const score = M.score(color, bgRgb);
                  return (
                    <div key={name} className={styles.row}>
                      <dt>{name}</dt>
                      {/* Two dd for one dt, which a description list allows and
                          which is what lets the detail line have the whole
                          width instead of a third of it. */}
                      <dd
                        className={cx(
                          styles.dd_main,
                          score < target && styles.ratio_bad
                        )}
                      >
                        {M.fmt(score)}
                      </dd>
                      <dd className={styles.dd_alt}>
                        {dualScore(color, bgRgb)} · {hex}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className={styles.note}>{example.note}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
};

/* ---------- the live lab ---------- */

const PRESETS: { label: string; bg: string; fg: string }[] = [
  { label: "grey-band failure", bg: "#e25d32", fg: "#7c2d12" },
  { label: "grey band, lighter", bg: "#00a9fb", fg: "#0c4a6e" },
  { label: "metrics disagree", bg: "#3b82f6", fg: "#1e3a8a" },
  { label: "near threshold", bg: "#787878", fg: "#3f3f46" },
  { label: "dark surface", bg: "#0b1120", fg: "#22c55e" },
];

type CssPaneId = "broken" | "fixed" | "lum";

const CSS_PANES: { id: CssPaneId; tag: string; note: string; klass: string }[] =
  [
    {
      id: "broken",
      tag: "CSS YIQ",
      note: "×−1000",
      klass: "css_broken",
    },
    { id: "fixed", tag: "CSS YIQ", note: "×−100000", klass: "css_fixed" },
    { id: "lum", tag: "CSS luminance", note: "pow()", klass: "css_lum" },
  ];

const Lab = () => {
  const { metric, target } = useContrast();
  const M = METRICS[metric];

  const [bg, setBg] = useState("#3b82f6");
  const [fg, setFg] = useState("#1e3a8a");
  const [bgText, setBgText] = useState("#3b82f6");
  const [fgText, setFgText] = useState("#1e3a8a");
  const [preserveChroma, setPreserveChroma] = useState(true);
  const [cssInk, setCssInk] = useState<Record<CssPaneId, Rgb> | null>(null);
  const [cssComputed, setCssComputed] = useState(true);

  const panesRef = useRef<HTMLDivElement>(null);
  const bgId = useId();
  const fgId = useId();
  const chromaId = useId();

  const bgRgb = rgb(bg);
  const fgRgb = rgb(fg);

  /* The three CSS panes carry the real declarations, so what they are showing is
     whatever the engine resolved. Reading it back after paint is the only way to
     put a number next to it, and the only honest way to claim the grey band is
     real rather than something this page drew to make a point. */
  useEffect(() => {
    const host = panesRef.current;
    if (!host) {
      return;
    }
    const read = {} as Record<CssPaneId, Rgb>;
    let computed = true;
    CSS_PANES.forEach(({ id }) => {
      const element = host.querySelector(`[data-pane="${id}"]`);
      const ink = element ? readComputedInk(element) : null;
      if (ink) {
        read[id] = ink;
      } else {
        computed = false;
        read[id] =
          id === "lum"
            ? cssLumFallback(bgRgb)
            : cssYiqFallback(bgRgb, id === "broken" ? 1000 : 100000);
      }
    });
    setCssInk(read);
    setCssComputed(computed);
    // bg is what the expressions read from, so it is what makes them change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg]);

  const shifted = contrastShift(fg, bg, { target, preserveChroma, metric });
  const [, C0, H] = rgbToOklch(fgRgb);
  const shiftedChroma = rgbToOklch(shifted.rgb)[1];
  const chromaKept = C0 < 1e-4 ? 100 : Math.round((shiftedChroma / C0) * 100);

  /* The ramp holds hue and chroma and sweeps lightness, so the picture under the
     numbers is the same one the search walks. */
  const ramp = useMemo(() => {
    const stops: string[] = [];
    for (let i = 0; i <= 32; i++) {
      const L = i / 32;
      stops.push(`${rgbToHex(fitChroma(L, C0, H))} ${(L * 100).toFixed(1)}%`);
    }
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, [C0, H]);

  /* Every lightness that clears the target, as runs rather than as 240 divs. */
  const band = useMemo(() => {
    const segments: { left: number; width: number }[] = [];
    const steps = 240;
    let runStart: number | null = null;
    for (let i = 0; i <= steps; i++) {
      const L = i / steps;
      const passes = M.score(fitChroma(L, C0, H), bgRgb) >= target;
      if (passes && runStart === null) {
        runStart = L;
      }
      if ((!passes || i === steps) && runStart !== null) {
        const end = passes ? L : (i - 1) / steps;
        segments.push({
          left: runStart * 100,
          width: Math.max(0.4, (end - runStart) * 100),
        });
        runStart = null;
      }
    }
    return segments;
    // bg and the metric are read through the closures above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [C0, H, bg, metric, target]);

  const ink = yiqInk(bgRgb);
  const exactInk = readableInk(bgRgb);

  const ticks = [
    { kind: "bg", L: rgbToOklch(bgRgb)[0], text: "bg" },
    { kind: "typed", L: shifted.L0, text: "typed" },
    { kind: "yiq", L: ink === "#000000" ? 0 : 1, text: "yiq" },
    ...(shifted.direction === "none"
      ? []
      : [{ kind: "shifted", L: shifted.L, text: "shifted" }]),
  ];

  const setBoth = (next: string, isBackground: boolean) => {
    if (isBackground) {
      setBg(next);
      setBgText(next);
    } else {
      setFg(next);
      setFgText(next);
    }
  };

  const onText = (value: string, isBackground: boolean) => {
    if (isBackground) {
      setBgText(value);
    } else {
      setFgText(value);
    }
    const parsed = hexToRgb(value);
    if (parsed) {
      const normalised = rgbToHex(parsed);
      if (isBackground) {
        setBg(normalised);
      } else {
        setFg(normalised);
      }
    }
  };

  const paneStyle = (color?: string) => ({
    background: bg,
    ["--bg" as string]: bg,
    ...(color ? { color } : null),
  });

  const notes: ReactNode[] = [];
  if (cssInk) {
    const brokenHex = rgbToHex(cssInk.broken);
    const fixedHex = rgbToHex(cssInk.fixed);
    if (brokenHex !== fixedHex) {
      notes.push(
        <span key="grey">
          <strong>The ×−1000 expression is in its grey band here.</strong> Luma
          is {yiqLuma(bgRgb).toFixed(3)}, within 0.255 of the 128 cutoff, so the
          clamp never saturates: it returns {brokenHex} at{" "}
          {M.fmt(M.score(cssInk.broken, bgRgb))} instead of {fixedHex}. Roughly
          1 background in 600 lands here.
        </span>
      );
    }
  }
  if (ink !== exactInk) {
    notes.push(
      <span key="ink">
        YIQ and the luminance threshold disagree on this background:{" "}
        {ink === "#000000" ? "black" : "white"} at{" "}
        {M.fmt(M.score(rgb(ink), bgRgb))} against{" "}
        {exactInk === "#000000" ? "black" : "white"} at{" "}
        {M.fmt(M.score(rgb(exactInk), bgRgb))}.
      </span>
    );
  }
  if (metric === "apca") {
    notes.push(
      <span key="apca">
        Signed Lc for the shift is {apcaLc(shifted.rgb, bgRgb).toFixed(1)},{" "}
        {polarity(shifted.rgb, bgRgb)}. Swap the text and the background and the
        number changes, which a WCAG ratio cannot express.
      </span>
    );
  }
  if (!shifted.reached) {
    notes.push(
      <span key="unreachable">
        Nothing at this hue clears {M.fmt(target)} here, so the shift returns
        its best effort. This is where plain ink genuinely is the better answer.
      </span>
    );
  }
  if (!cssComputed) {
    notes.push(
      <span key="unsupported">
        <strong>
          This browser did not compute the relative-colour expressions
        </strong>
        , so those three panes are showing a JS mirror of the same maths.
      </span>
    );
  }

  return (
    <div className={cx(styles.chip, styles.lab)}>
      <div className={styles.controls}>
        <div className={styles.field}>
          <label className={styles.chip_label} htmlFor={bgId}>
            Background
          </label>
          <div className={styles.field_inputs}>
            <input
              type="color"
              value={bg}
              aria-label="Background colour picker"
              onChange={(event) => setBoth(event.target.value, true)}
            />
            <input
              type="text"
              id={bgId}
              value={bgText}
              spellCheck={false}
              aria-invalid={!hexToRgb(bgText)}
              onChange={(event) => onText(event.target.value, true)}
              onBlur={() => setBgText(bg)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.chip_label} htmlFor={fgId}>
            Text colour
          </label>
          <div className={styles.field_inputs}>
            <input
              type="color"
              value={fg}
              aria-label="Text colour picker"
              onChange={(event) => setBoth(event.target.value, false)}
            />
            <input
              type="text"
              id={fgId}
              value={fgText}
              spellCheck={false}
              aria-invalid={!hexToRgb(fgText)}
              onChange={(event) => onText(event.target.value, false)}
              onBlur={() => setFgText(fg)}
            />
          </div>
        </div>

        <label className={styles.toggle} htmlFor={chromaId}>
          <input
            type="checkbox"
            id={chromaId}
            checked={preserveChroma}
            onChange={(event) => setPreserveChroma(event.target.checked)}
          />
          Hold chroma
        </label>
      </div>

      <div className={styles.presets}>
        <span className={styles.chip_label}>Jump to</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setBoth(preset.bg, true);
              setBoth(preset.fg, false);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className={styles.panes} ref={panesRef}>
        <div className={styles.pane} style={paneStyle(fg)}>
          <p className={styles.pane_tag}>
            <span>As typed</span>
            <em>yours</em>
          </p>
          <p className={styles.sample}>Handgloves</p>
          <p className={styles.readout}>
            <b>{M.fmt(M.score(fgRgb, bgRgb))}</b>
            <i>{dualScore(fgRgb, bgRgb)}</i>
            <span className={styles.sub}>{fg}</span>
            <span className={styles.verdict}>
              {M.score(fgRgb, bgRgb) >= target ? "passes" : "fails"}
            </span>
          </p>
        </div>

        <div className={styles.pane} style={paneStyle(shifted.hex)}>
          <p className={styles.pane_tag}>
            <span>Shifted</span>
            <em>OKLCh</em>
          </p>
          <p className={styles.sample}>Handgloves</p>
          <p className={styles.readout}>
            <b>{M.fmt(shifted.score)}</b>
            <i>{dualScore(shifted.rgb, bgRgb)}</i>
            <span className={styles.sub}>{shifted.hex}</span>
            <span className={styles.sub}>
              ΔL {shifted.L >= shifted.L0 ? "+" : "−"}
              {Math.abs(shifted.L - shifted.L0).toFixed(3)} · chroma{" "}
              {chromaKept}%
            </span>
            <span className={styles.verdict}>
              {!shifted.reached
                ? `best effort, ${M.fmt(shifted.score)}`
                : shifted.direction === "none"
                ? "already passing"
                : `${shifted.direction} · ${polarity(shifted.rgb, bgRgb)}`}
            </span>
          </p>
        </div>

        {CSS_PANES.map(({ id, tag, note, klass }) => {
          const color = cssInk?.[id];
          return (
            <div
              key={id}
              className={cx(styles.pane, styles[klass])}
              data-pane={id}
              style={paneStyle()}
            >
              <p className={styles.pane_tag}>
                <span>{tag}</span>
                <em>{note}</em>
              </p>
              <p className={styles.sample}>Handgloves</p>
              <p className={styles.readout}>
                <b>{color ? M.fmt(M.score(color, bgRgb)) : "—"}</b>
                <i>{color ? dualScore(color, bgRgb) : ""}</i>
                <span className={styles.sub}>
                  {color ? rgbToHex(color) : "—"}
                </span>
                {color ? (
                  <span className={styles.verdict}>
                    {M.score(color, bgRgb) >= target ? "passes" : "fails"}
                  </span>
                ) : null}
              </p>
            </div>
          );
        })}
      </div>

      <p className={`${styles.verdict_line} ${styles.verdict_notes}`}>
        {notes.length ? notes : "All five agree on this background."}
      </p>

      <div className={styles.track_block}>
        <div className={styles.track_head}>
          <p className={styles.chip_label}>Lightness track</p>
          <p>
            The ramp holds your hue and chroma steady and sweeps L from 0 to 1.
            The solid bar marks every lightness clearing the target.
          </p>
        </div>

        <div className={styles.track}>
          <div className={styles.ramp} style={{ background: ramp }} />
          <div className={styles.band}>
            {band.map((segment) => (
              <i
                key={segment.left}
                style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
              />
            ))}
          </div>
          <div>
            {ticks.map((tick) => (
              <div
                key={tick.kind}
                className={styles.tick}
                data-kind={tick.kind}
                data-flip={tick.L > 0.78}
                style={{ left: `${tick.L * 100}%` }}
              >
                <label>
                  {tick.text} {tick.L.toFixed(2)}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.scale}>
          <span>L 0.00</span>
          <span>0.50</span>
          <span>L 1.00</span>
        </div>

        <div className={styles.legend}>
          <span>···· background</span>
          <span>‒ ‒ ‒ as typed</span>
          <span>──── shifted</span>
          <span>│ YIQ ink</span>
        </div>
      </div>
    </div>
  );
};

export const ContrastDemo = {
  Provider,
  Bench,
  Toolbar,
  Swatches,
  Examples,
  Lab,
};
