import {
  AreaRect,
  createPointAndShoot,
  OverlayStyle,
  PointAndShoot,
  ShootContext,
  Target,
} from "@daformat/point-and-shoot";
import { escapeMarkdown, toMarkdown } from "@daformat/point-and-shoot/markdown";
import {
  createContext,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaCheck } from "react-icons/fa6";
import { IoChevronDownOutline } from "react-icons/io5";

import { Dropdown } from "@/components/ButtonGroup/Dropdown/Dropdown";
import { DropdownRadioGroup } from "@/components/ButtonGroup/Dropdown/DropdownRadioGroup";
import { DropdownRadioItem } from "@/components/ButtonGroup/Dropdown/DropdownRadioItem";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";

import { formatCapture, GLEA_DEMO, highlight } from "./entry";
import { GleaView, GleaWindow } from "./glea";
import glea from "./Glea.module.scss";
import styles from "./PointAndShootDemo.module.scss";
import { screenshot } from "./screenshot";

/**
 * The point-and-shoot playground.
 *
 * The whole page is what you point at: hold Option, or press the button in
 * the bar, and the spotlight follows the pointer over everything in the
 * essay, the journal window included, as on glea.app. A click or a drag
 * lands in that window, the same mock glea.app has, as the Markdown Glea
 * would write. The bar, the view switch and the hint are the demo's own
 * controls and are left out (their clicks go through), so they keep working
 * while the mode is on.
 */

const cx = (...names: (string | undefined | false)[]) =>
  names.filter(Boolean).join(" ");

/** The demo's own furniture: never targeted, never in a screenshot. */
const IGNORE = "[data-pns-ignore]";
const ASSETS = "/media/design-engineering/point-and-shoot/glea/";

type SelectionMode = "target" | "anywhere" | "shoot" | "ignore";
type After = "deactivate" | "stay";
type Look = "glea" | "site" | "outline";
type Trigger = "option" | "button" | null;
type Collected = { message: string };

const LOOKS: Record<Look, OverlayStyle> = {
  glea: {},
  site: {
    color: "color-mix(in srgb, var(--text-secondary) 16%, transparent)",
    pressedColor: "color-mix(in srgb, var(--text-secondary) 24%, transparent)",
    dotColor: "color-mix(in srgb, var(--text-secondary) 45%, transparent)",
  },
  outline: {
    color: "transparent",
    pressedColor: "color-mix(in srgb, var(--text-secondary) 8%, transparent)",
    dotColor: "color-mix(in srgb, var(--text-secondary) 60%, transparent)",
    border:
      "1.5px solid color-mix(in srgb, var(--text-secondary) 70%, transparent)",
    radius: 6,
  },
};

const LOOK_CHOICES: [Look, string][] = [
  ["glea", "Glea"],
  ["site", "This page"],
  ["outline", "Outline"],
];

const SELECTION_CHOICES: [SelectionMode, string][] = [
  ["target", "Pointed at"],
  ["anywhere", "Anywhere"],
  ["shoot", "At once"],
  ["ignore", "Ignored"],
];

const AFTER_CHOICES: [After, string][] = [
  ["deactivate", "Turn off"],
  ["stay", "Stay on"],
];

/* ---------- state ---------- */

type DemoContextValue = {
  active: boolean;
  trigger: Trigger;
  toggle: (at?: { x: number; y: number }) => void;
  captures: number;
  lastCapture: number;
  look: Look;
  setLook: (look: Look) => void;
  selection: SelectionMode;
  setSelection: (selection: SelectionMode) => void;
  after: After;
  setAfter: (after: After) => void;
  areas: boolean;
  setAreas: (areas: boolean) => void;
  /** Where the window mounts the Glea view, and where the file view writes. */
  windowRef: React.RefObject<HTMLDivElement | null>;
  fileRef: React.RefObject<HTMLPreElement | null>;
  view: "glea" | "markdown";
  setView: (view: "glea" | "markdown") => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

const useDemo = () => {
  const value = useContext(DemoContext);
  if (!value) {
    throw new Error("PointAndShootDemo parts must be inside its Provider");
  }
  return value;
};

/**
 * The shot's answer, a beat later, as Glea answers once the capture is
 * saved: the spotlight holds on what was shot while its flash plays out,
 * rather than moving on to whatever is under the pointer with the flash
 * still going (with ⌥ held, the mode stays on).
 */
const collected = () =>
  new Promise<Collected>((resolve) =>
    window.setTimeout(() => resolve({ message: "Collected to Today" }), 450)
  );

/** Typing in a field: Option makes characters there, and isn't a capture. */
const editing = () => {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) {
    el = el.shadowRoot.activeElement;
  }
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
  );
};

const backgroundImage = (el: Element) => {
  const m = getComputedStyle(el).backgroundImage.match(
    /url\(\s*(['"]?)(.*?)\1\s*\)/
  );
  return m?.[2] ?? null;
};

const absolute = (url: string) => {
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return "";
  }
};

const Provider = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState(false);
  const [trigger, setTrigger] = useState<Trigger>(null);
  const [captures, setCaptures] = useState(0);
  const [lastCapture, setLastCapture] = useState(0);
  const [look, setLook] = useState<Look>("glea");
  const [selection, setSelection] = useState<SelectionMode>("shoot");
  const [after, setAfter] = useState<After>("deactivate");
  const [areas, setAreas] = useState(true);
  const [view, setView] = useState<"glea" | "markdown">("glea");

  const pnsRef = useRef<PointAndShoot<never, Collected> | null>(null);
  const triggerRef = useRef<Trigger>(null);
  const afterRef = useRef(after);
  afterRef.current = after;
  const windowRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLPreElement | null>(null);
  const gleaRef = useRef<GleaView | null>(null);
  const markdownRef = useRef(GLEA_DEMO);
  /** Screenshots taken here, by the file name the entry links them with. */
  const shotsRef = useRef<Record<string, string | false>>({});

  const marks = useMemo(
    () => ({
      heading: styles.file_heading ?? "",
      link: styles.file_link ?? "",
      quote: styles.file_quote ?? "",
      symbol: styles.file_symbol ?? "",
    }),
    []
  );

  // The Glea window, and the file view beside it.
  useEffect(() => {
    const root = windowRef.current;
    const file = fileRef.current;
    if (!root || !file) {
      return;
    }
    const pane = document.createElement("div");
    root.appendChild(pane);
    const glw = new GleaWindow(pane, {
      markdown: markdownRef.current,
      title: "Today",
      date: new Date(),
      assets: ASSETS,
      resolve: (src) => shotsRef.current[src.split("/").pop() ?? ""],
      // A block dragged in the window: the file follows.
      onChange: (md) => {
        markdownRef.current = md;
        file.innerHTML = highlight(md.replace(/\n$/, ""), marks);
      },
    });
    gleaRef.current = glw.view;
    file.innerHTML = highlight(markdownRef.current.replace(/\n$/, ""), marks);
    // The window is the app's own size; narrower screens get it scaled down.
    // Scaled with a transform rather than CSS zoom, which the area
    // screenshots (modern-screenshot) don't draw right; the room it takes
    // is set by hand, since a transform takes none.
    const fit = () => {
      const z = Math.min(1, root.clientWidth / 1024) || 1;
      pane.style.transform = z < 1 ? `scale(${z})` : "";
      pane.style.transformOrigin = "0 0";
      root.style.height = z < 1 ? `${720 * z}px` : "";
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    return () => {
      observer.disconnect();
      pane.remove();
      gleaRef.current = null;
    };
  }, [marks]);

  /** Lands a capture in today's entry, in the window and in the file. */
  const collect = useCallback(
    (md: string) => {
      const entry = formatCapture(md);
      markdownRef.current =
        markdownRef.current.replace(/\s+$/, "") + "\n\n" + entry + "\n";
      const file = fileRef.current;
      if (file) {
        const line = document.createElement("span");
        line.className = styles.file_new ?? "";
        line.innerHTML = highlight("\n\n" + entry, marks);
        file.appendChild(line);
        file.scrollTo({ top: file.scrollHeight, behavior: "smooth" });
      }
      gleaRef.current?.setMarkdown(markdownRef.current);
      gleaRef.current?.scrollToEnd();
      setCaptures((n) => n + 1);
      setLastCapture(Date.now());
    },
    [marks]
  );

  /**
   * A dragged area. The shot answers at once, so the flash plays on the
   * drawn area as it's let go, and the picture is drawn in the background
   * (the overlay is never in it: it's left out of the drawing). The entry
   * goes in once the picture is done, not before: adding it scrolls the
   * journal window, and a picture drawn during that scroll is of the window
   * somewhere else.
   */
  const collectArea = useCallback(
    (rect: AreaRect): Promise<Collected> => {
      const name = Math.random().toString(16).slice(2, 14) + ".png";
      screenshot(rect.viewport)
        .then((url) => {
          shotsRef.current[name] = url;
          collect(
            `![${document.title.replace(/[[\]]/g, "")}](../assets/${name})`
          );
        })
        .catch((error) => console.warn("The area couldn't be drawn", error));
      return collected();
    },
    [collect]
  );

  /** What a shot keeps: Glea's own choices, less the posts and videos. */
  const shoot = useCallback(
    async (
      target: Target<never>,
      ctx: ShootContext<Collected>
    ): Promise<Collected> => {
      if (target.node instanceof Range) {
        collect(
          toMarkdown(target.node) || escapeMarkdown(target.node.toString())
        );
        // Collected: let go of it, or the mode would light it again.
        getSelection()?.removeAllRanges();
        return collected();
      }
      const node = target.node;
      if (
        node instanceof HTMLCanvasElement ||
        node instanceof HTMLIFrameElement
      ) {
        return ctx.captureArea();
      }
      const image = target.kind !== "element";
      const img =
        node instanceof HTMLImageElement ? node : node.querySelector("img");
      let md =
        image && img
          ? toMarkdown(node.tagName === "FIGURE" ? node : img)
          : toMarkdown(node);
      if (!md && image) {
        const bg = backgroundImage(node);
        if (bg) {
          md = `![](${absolute(bg)})`;
        }
      }
      // Nothing Markdown can hold (a drawing, a widget): keep a picture.
      if (!md) {
        return ctx.captureArea();
      }
      collect(md);
      return collected();
    },
    [collect]
  );

  // The controller, for the page's lifetime.
  useEffect(() => {
    const pns = createPointAndShoot<never, Collected>({
      ignore: IGNORE,
      onShoot: shoot,
      area: { onCapture: collectArea },
      feedback: {
        announce: { success: (result) => result.value.message },
      },
    });
    pnsRef.current = pns;
    const offs = [
      pns.on("activate", () => setActive(true)),
      pns.on("deactivate", () => {
        setActive(false);
        triggerRef.current = null;
        setTrigger(null);
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      pns.destroy();
      pnsRef.current = null;
    };
  }, [shoot, collectArea]);

  // The bar's choices, as they change.
  useEffect(() => {
    pnsRef.current?.configure({
      overlay: LOOKS[look],
      selection,
      area: areas ? { onCapture: collectArea } : undefined,
    });
  }, [look, selection, areas, collectArea]);

  useEffect(() => {
    if (triggerRef.current === "button") {
      pnsRef.current?.configure({ after });
    }
  }, [after]);

  const start = useCallback(
    (how: Exclude<Trigger, null>, at?: { x: number; y: number }) => {
      const pns = pnsRef.current;
      if (!pns) {
        return;
      }
      triggerRef.current = how;
      setTrigger(how);
      pns.configure(
        how === "option"
          ? {
              // Held: on until it's let go, and only while it's held (a
              // release can go unseen when focus goes elsewhere).
              after: "stay",
              guard: (e) => e.altKey && !e.ctrlKey && !e.metaKey,
            }
          : { after: afterRef.current, guard: undefined }
      );
      pns.activate({ at });
    },
    []
  );

  const toggle = useCallback(
    (at?: { x: number; y: number }) => {
      const pns = pnsRef.current;
      if (pns?.state === "idle") {
        start("button", at);
      } else {
        pns?.deactivate();
      }
    },
    [start]
  );

  // Option, held on its own for a moment (⌥ on the way to a shortcut never
  // starts it), turns it on until it's let go. The library has no keys: this
  // is the page's.
  useEffect(() => {
    const pointer = { x: -1, y: -1 };
    let pending = 0;
    const cancelPending = () => {
      window.clearTimeout(pending);
      pending = 0;
    };
    const stopHeld = () => {
      cancelPending();
      if (triggerRef.current === "option") {
        pnsRef.current?.deactivate();
      }
    };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Alt") {
        if (e.repeat || e.ctrlKey || e.metaKey || e.shiftKey || editing()) {
          return;
        }
        // (Firefox on Windows would focus its menu bar.)
        e.preventDefault();
        if (pending || triggerRef.current === "option") {
          return;
        }
        pending = window.setTimeout(() => {
          pending = 0;
          if (pnsRef.current?.state === "idle" && document.hasFocus()) {
            start(
              "option",
              pointer.x >= 0 ? { x: pointer.x, y: pointer.y } : undefined
            );
          }
        }, 120);
        return;
      }
      // Any other key: a shortcut or a character, not a capture.
      stopHeld();
    };
    const onUp = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Alt") {
        stopHeld();
      }
    };
    addEventListener("pointermove", onMove, true);
    addEventListener("keydown", onDown, true);
    addEventListener("keyup", onUp, true);
    addEventListener("blur", stopHeld);
    return () => {
      cancelPending();
      removeEventListener("pointermove", onMove, true);
      removeEventListener("keydown", onDown, true);
      removeEventListener("keyup", onUp, true);
      removeEventListener("blur", stopHeld);
    };
  }, [start]);

  const value: DemoContextValue = {
    active,
    trigger,
    toggle,
    captures,
    lastCapture,
    look,
    setLook,
    selection,
    setSelection,
    after,
    setAfter,
    areas,
    setAreas,
    windowRef,
    fileRef,
    view,
    setView,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

/* ---------- the bar ---------- */

const Picker = <T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: [T, string][];
  onChange: (next: T) => void;
}) => {
  const id = useId();
  const current = choices.find(([v]) => v === value)?.[1] ?? value;
  return (
    <span className={styles.field}>
      <small className={styles.field_label} id={`${id}-label`}>
        {label}
      </small>
      <Dropdown
        trigger={
          <button
            type="button"
            id={`${id}-button`}
            className={cx("button", styles.picker)}
            aria-labelledby={`${id}-label ${id}-button`}
          >
            {current}
            <IoChevronDownOutline aria-hidden="true" />
          </button>
        }
      >
        <DropdownRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as T)}
        >
          {choices.map(([v, text]) => (
            <DropdownRadioItem
              key={v}
              value={v}
              prefix={
                <span className={styles.tick} aria-hidden="true">
                  {v === value ? <FaCheck size={9} /> : null}
                </span>
              }
            >
              {text}
            </DropdownRadioItem>
          ))}
        </DropdownRadioGroup>
      </Dropdown>
    </span>
  );
};

const Toolbar = () => {
  const {
    active,
    toggle,
    look,
    setLook,
    selection,
    setSelection,
    after,
    setAfter,
    areas,
    setAreas,
  } = useDemo();
  return (
    // The card's own padding is a page rule with more weight than a module's,
    // so the carousel page sets its bar's inline, and this does the same.
    <div
      className={cx(styles.controls, "card")}
      style={{ paddingBlock: 10, paddingInline: 12 }}
      data-pns-ignore=""
    >
      <div className={styles.row}>
        <button
          type="button"
          className={cx("button", styles.start)}
          aria-pressed={active}
          onClick={(event) => {
            // From the keyboard there's no pointer: the dot waits for one.
            const at =
              event.detail > 0
                ? { x: event.clientX, y: event.clientY }
                : undefined;
            toggle(at);
          }}
        >
          {active ? "Stop" : "Point and shoot"}
        </button>
        <Picker
          label="Color"
          value={look}
          choices={LOOK_CHOICES}
          onChange={setLook}
        />
        <Picker
          label="Selection"
          value={selection}
          choices={SELECTION_CHOICES}
          onChange={setSelection}
        />
        <Picker
          label="After a shot"
          value={after}
          choices={AFTER_CHOICES}
          onChange={setAfter}
        />
        <label className={styles.field}>
          <Checkbox
            checked={areas}
            onChange={(event) => setAreas(event.target.checked)}
          />
          <small className={styles.field_label}>Drag for an area</small>
        </label>
      </div>
    </div>
  );
};

/* ---------- the window ---------- */

type Segment<T extends string> = { value: T; label: string };

/** A choice among a few, as the site's segmented controls go. */
const Segmented = <T extends string>({
  label,
  value,
  segments,
  onChange,
}: {
  label: string;
  value: T;
  segments: Segment<T>[];
  onChange: (next: T) => void;
}) => {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const last = segments.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (index + 1) % segments.length
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? (index + last) % segments.length
        : event.key === "Home"
        ? 0
        : event.key === "End"
        ? last
        : -1;
    const segment = segments[next];
    if (!segment) {
      return;
    }
    event.preventDefault();
    onChange(segment.value);
    buttonsRef.current[next]?.focus();
  };
  return (
    <span className={styles.segmented} role="radiogroup" aria-label={label}>
      {segments.map((segment, index) => (
        <button
          key={segment.value}
          ref={(node) => {
            buttonsRef.current[index] = node;
          }}
          type="button"
          role="radio"
          aria-checked={segment.value === value}
          tabIndex={segment.value === value ? 0 : -1}
          onClick={() => onChange(segment.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {segment.label}
        </button>
      ))}
    </span>
  );
};

const Stage = () => {
  const { windowRef, fileRef, view, setView } = useDemo();
  const [path, setPath] = useState("~/Documents/Glea/journal/today.md");
  useEffect(() => {
    const day = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setPath(
      `~/Documents/Glea/journal/${day.getFullYear()}-${pad(
        day.getMonth() + 1
      )}-${pad(day.getDate())}.md`
    );
  }, []);
  return (
    <div className={styles.stage} id="today">
      <div className={styles.view_switch} data-pns-ignore="">
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          segments={[
            { value: "glea", label: "Glea" },
            { value: "markdown", label: "Markdown" },
          ]}
        />
      </div>
      <div
        ref={windowRef}
        className={cx(glea.glea, styles.window)}
        hidden={view !== "glea"}
      />
      <div className={styles.file} hidden={view !== "markdown"}>
        <header>{path}</header>
        <pre ref={fileRef} />
      </div>
    </div>
  );
};

/* ---------- the hint ---------- */

/**
 * What to do, at the bottom of the screen while the demo is on, and where a
 * capture went, for a moment after it lands, wherever on the page it came
 * from.
 */
const Hint = () => {
  const { active, trigger, captures, lastCapture } = useDemo();
  const [recent, setRecent] = useState(false);
  useEffect(() => {
    if (!lastCapture) {
      return;
    }
    setRecent(true);
    const timer = window.setTimeout(() => setRecent(false), 2600);
    return () => window.clearTimeout(timer);
  }, [lastCapture]);
  const shown = active || recent;
  return (
    <p
      className={styles.hint}
      data-shown={shown || undefined}
      data-pns-ignore=""
    >
      <kbd aria-hidden="true">⌥</kbd>
      {recent && captures > 0 ? (
        <span>
          Collected to{" "}
          <a
            href="#today"
            onClick={(event) => {
              event.preventDefault();
              document
                .getElementById("today")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            Today
          </a>
          .{" "}
          {captures === 1
            ? "Drag to capture an area."
            : `${captures} captures, all in Markdown.`}
        </span>
      ) : (
        <span>
          {trigger === "button"
            ? "Click anything to capture it, Escape to stop."
            : "Click anything to capture it, or drag for an area."}
        </span>
      )}
    </p>
  );
};

export const PointAndShootDemo = {
  Provider,
  Toolbar,
  Stage,
  Hint,
};
