import {
  AnalyserSource,
  attachBorealis,
  Borealis,
  BorealisConfig,
  createAnalyserSource,
  createMicrophoneSource,
  createMockVoice,
  defaults,
  LookName,
  LOOKS,
  MicrophoneSource,
  Source,
  StrengthName,
} from "@daformat/audio-borealis";
import {
  createContext,
  CSSProperties,
  Fragment,
  KeyboardEvent,
  MutableRefObject,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaCheck } from "react-icons/fa6";
import {
  IoChevronDownOutline,
  IoMoonOutline,
  IoSunnyOutline,
} from "react-icons/io5";
import {
  TbRectangle,
  TbRectangleVertical,
  TbVolume,
  TbVolumeOff,
} from "react-icons/tb";

import { Dropdown } from "@/components/ButtonGroup/Dropdown/Dropdown";
import { DropdownRadioGroup } from "@/components/ButtonGroup/Dropdown/DropdownRadioGroup";
import { DropdownRadioItem } from "@/components/ButtonGroup/Dropdown/DropdownRadioItem";
import { Tabs } from "@/components/Tabs/Tabs";
import { useReducedMotion } from "@/hooks/useReducedMotion";

import styles from "./AudioBorealisDemo.module.scss";
import CLIP from "./voice-clip.json";

/**
 * The Audio Borealis playground.
 *
 * A caption box on a desk, spoken to by a voice that is not there, with the
 * glow from the Subtitles app along its bottom edge. The parts are separate
 * components sharing one provider, so the page can put prose between them and
 * still have one look, one strength and one set of knobs running through the
 * lot: the toolbar picks, the stage shows, the meter reads what the driver
 * sees, and the knobs are the app's own, every one of them live.
 *
 * Nothing in here is simulated except the mock voice. The glow is the
 * published package, attached to the box exactly as a caller would attach
 * it, and the recording and the microphone, when they are picked, go through
 * the package's own analyser source.
 */

const cx = (...names: (string | undefined | false)[]) =>
  names.filter(Boolean).join(" ");

export type LookChoice = LookName | "off";
type Input = "voice" | "clip" | "mic";
/** What the glow is drawn on: the app's caption box, or one the shape of a phone. */
type Shape = "caption" | "phone";
/** The stage's own theme, or null to follow the page's. */
type Theme = "light" | "dark";
type MicState = "idle" | "asking" | "live" | "denied" | "unavailable";
type ClipState = "idle" | "playing" | "failed";

/** The recording, played through an analyser so the glow reads it as sound. */
type Clip = {
  audio: HTMLAudioElement;
  context: AudioContext;
  gain: GainNode;
  source: AnalyserSource;
};

const CLIP_SRC = "/media/design-engineering/audio-borealis/voice.mp3";

type ClipWord = { word: string; at: number };
type ClipSentence = {
  text: string;
  start: number;
  end: number;
  words: ClipWord[];
};
const CLIP_SENTENCES: ClipSentence[] = CLIP.sentences;

/** What the box says, one line at a time. */
const LINES = [
  "Audio Borealis draws a sound reactive glow at the bottom of any HTML element.",
  "The glow sits under the words, and it rises with the voice.",
  "The low sounds sit in the middle, and the high ones spread out toward the edges.",
  "It slides along while a sound is heard, and it holds still during silence.",
  "And when there is no sound anymore, it goes away.",
  "Now available on GitHub and npm.",
];

/** A word landed within this long ago: the voice is still going. */
const SPEAKING_WINDOW = 450;

/** A number in 0..1 from an integer, the same one every time. */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

type BorealisContextValue = {
  look: LookChoice;
  setLook: (next: LookChoice) => void;
  strength: StrengthName;
  setStrength: (next: StrengthName) => void;
  input: Input;
  setInput: (next: Input) => void;
  micState: MicState;
  clipState: ClipState;
  muted: boolean;
  setMuted: (next: boolean) => void;
  /** What the stage is drawn in: the visitor's pick, or the page's theme. */
  theme: Theme;
  setTheme: (next: Theme) => void;
  shape: Shape;
  setShape: (next: Shape) => void;
  knobs: Partial<BorealisConfig>;
  setKnob: <K extends keyof BorealisConfig>(
    key: K,
    value: BorealisConfig[K]
  ) => void;
  resetKnobs: () => void;
  glowRef: MutableRefObject<Borealis | null>;
  micRef: MutableRefObject<MicrophoneSource | null>;
  clipRef: MutableRefObject<Clip | null>;
};

const BorealisContext = createContext<BorealisContextValue | null>(null);

const useBorealis = () => {
  const value = useContext(BorealisContext);
  if (!value) {
    throw new Error(
      "AudioBorealisDemo parts need an AudioBorealisDemo.Provider above them"
    );
  }
  return value;
};

const Provider = ({ children }: { children: ReactNode }) => {
  const [look, setLookState] = useState<LookChoice>("rainbow");
  const [strength, setStrength] = useState<StrengthName>("medium");
  const [input, setInputState] = useState<Input>("voice");
  const [micState, setMicState] = useState<MicState>("idle");
  const [clipState, setClipState] = useState<ClipState>("idle");
  const [muted, setMutedState] = useState(false);
  // The stage follows the page's theme until a sun or moon is clicked, and
  // the page's theme is only known on the client, so the pick starts empty
  // and the server renders the stage in the page's scheme.
  const [themePick, setTheme] = useState<Theme | null>(null);
  const [pageTheme, setPageTheme] = useState<Theme>("light");
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setPageTheme(query.matches ? "dark" : "light");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const theme = themePick ?? pageTheme;
  // The box the glow is drawn on: the caption, or the same box stood on
  // end at a phone's proportions. The glow is not told; it measures the
  // box it is on and paints the edge it finds.
  const [shape, setShape] = useState<Shape>("caption");
  const [knobs, setKnobs] = useState<Partial<BorealisConfig>>({});
  const glowRef = useRef<Borealis | null>(null);
  const micRef = useRef<MicrophoneSource | null>(null);
  const clipRef = useRef<Clip | null>(null);
  const goneRef = useRef(false);

  // The recording, made once and kept: an element can only be wired into an
  // audio graph once, and a graph made from the click that asks for it is
  // one every browser will let play. Muting is a gain of 0 after the
  // analyser, so the glow keeps reading a voice nobody hears.
  const startClip = useCallback(() => {
    const existing = clipRef.current;
    if (existing) {
      void existing.context.resume();
      existing.audio.play().then(
        () => setClipState("playing"),
        () => setClipState("failed")
      );
      return;
    }
    if (typeof AudioContext === "undefined") {
      setClipState("failed");
      setInputState("voice");
      return;
    }
    try {
      const audio = new Audio(CLIP_SRC);
      audio.loop = true;
      audio.preload = "auto";
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.6;
      const gain = context.createGain();
      gain.gain.value = muted ? 0 : 1;
      context.createMediaElementSource(audio).connect(analyser);
      analyser.connect(gain);
      gain.connect(context.destination);
      const clip: Clip = {
        audio,
        context,
        gain,
        source: createAnalyserSource(analyser),
      };
      clipRef.current = clip;
      void context.resume();
      audio.play().then(
        () => setClipState("playing"),
        () => {
          setClipState("failed");
          setInputState("voice");
        }
      );
    } catch {
      setClipState("failed");
      setInputState("voice");
    }
  }, [muted]);

  const pauseClip = useCallback(() => {
    const clip = clipRef.current;
    if (clip) {
      clip.audio.pause();
      setClipState("idle");
    }
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    const clip = clipRef.current;
    if (clip) {
      clip.gain.gain.value = next ? 0 : 1;
    }
  }, []);

  // The microphone is asked for from the click that picks it, which is the
  // only place a browser will let the question be asked, and let go the
  // moment something else is picked, so the tab's recording light goes out.
  const setInput = useCallback(
    (next: Input) => {
      setInputState(next);
      if (next !== "mic") {
        const mic = micRef.current;
        micRef.current = null;
        setMicState("idle");
        void mic?.stop();
      }
      if (next !== "clip") {
        pauseClip();
      }
      if (next === "clip") {
        startClip();
        return;
      }
      if (next !== "mic") {
        return;
      }
      if (micRef.current) {
        setMicState("live");
        return;
      }
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setMicState("unavailable");
        setInputState("voice");
        return;
      }
      setMicState("asking");
      createMicrophoneSource().then(
        (mic) => {
          if (goneRef.current) {
            void mic.stop();
            return;
          }
          micRef.current = mic;
          setMicState("live");
        },
        (error: unknown) => {
          const name = error instanceof Error ? error.name : "";
          setMicState(
            name === "NotAllowedError" || name === "SecurityError"
              ? "denied"
              : "unavailable"
          );
          setInputState("voice");
        }
      );
    },
    [pauseClip, startClip]
  );

  useEffect(() => {
    goneRef.current = false;
    return () => {
      goneRef.current = true;
      const mic = micRef.current;
      micRef.current = null;
      void mic?.stop();
      const clip = clipRef.current;
      clipRef.current = null;
      if (clip) {
        clip.audio.pause();
        clip.audio.src = "";
        void clip.context.close();
      }
    };
  }, []);

  const setKnob = useCallback(
    <K extends keyof BorealisConfig>(key: K, value: BorealisConfig[K]) =>
      setKnobs((previous) => ({ ...previous, [key]: value })),
    []
  );
  const resetKnobs = useCallback(() => setKnobs({}), []);

  // A preset is a hue start and a hue width, and so are two of the knobs.
  // Picking a preset lets go of the knobs' own, so the two never disagree;
  // dragging a knob afterwards makes the preset a custom one.
  const setLook = useCallback((next: LookChoice) => {
    setLookState(next);
    setKnobs((previous) => {
      const { hueStart: _start, hueWidth: _width, ...rest } = previous;
      return rest;
    });
  }, []);

  const value = useMemo(
    () => ({
      look,
      setLook,
      strength,
      setStrength,
      input,
      setInput,
      micState,
      clipState,
      muted,
      setMuted,
      theme,
      setTheme,
      shape,
      setShape,
      knobs,
      setKnob,
      resetKnobs,
      glowRef,
      micRef,
      clipRef,
    }),
    [
      look,
      strength,
      input,
      setInput,
      micState,
      clipState,
      muted,
      setMuted,
      theme,
      shape,
      knobs,
      setKnob,
      resetKnobs,
    ]
  );

  return (
    <BorealisContext.Provider value={value}>
      {children}
    </BorealisContext.Provider>
  );
};

/* ---------- the toolbar ---------- */

const LOOK_CHOICES: [LookChoice, string][] = [
  ["rainbow", "Rainbow"],
  ["northernLights", "Northern lights"],
  ["autumn", "Autumn"],
  ["whiteHaze", "White haze"],
  ["off", "Off"],
];

const STRENGTH_CHOICES: [StrengthName, string][] = [
  ["strong", "Strong"],
  ["medium", "Medium"],
  ["subtle", "Subtle"],
];

/**
 * One choice among a few, as the site's other demos offer it: the current
 * one on the button, the rest in a menu under it, the current one ticked.
 * The button is named by the label beside it and its own value, so a screen
 * reader hears "Preset, Rainbow" without the label being said twice.
 */
const Picker = <T extends string>({
  label,
  value,
  choices,
  onChange,
  currentLabel,
}: {
  label: string;
  value: T;
  choices: [T, string][];
  onChange: (next: T) => void;
  /** What the button says instead of the value's name, when the value has been moved off. */
  currentLabel?: string;
}) => {
  const id = useId();
  const current =
    currentLabel ?? choices.find(([id]) => id === value)?.[1] ?? value;
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
          {choices.map(([id, text]) => (
            <DropdownRadioItem
              key={id}
              value={id}
              prefix={
                <span className={styles.tick} aria-hidden="true">
                  {id === value ? <FaCheck size={9} /> : null}
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

type Segment<T extends string> = {
  value: T;
  /** Its name: what the button says, or what a screen reader hears when an icon is shown instead. */
  label: string;
  icon?: ReactNode;
  busy?: boolean;
};

/**
 * A choice among a few, at the size of the site's button: the buttons
 * joined, the picked one filled, and the arrow keys walking them. One radio
 * group, as the pattern goes: the picked option is the group's one tab
 * stop, left and right, or up and down, move the pick along and wrap, and
 * Home and End go to the ends. No focus ring of its own: the hover fill
 * marks the focused option, and the pick is the filled one.
 */
const Segmented = <T extends string>({
  label,
  value,
  segments,
  onChange,
  className,
}: {
  label: string;
  value: T;
  segments: Segment<T>[];
  onChange: (next: T) => void;
  className?: string;
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
    <span
      className={cx(styles.segmented, className)}
      role="radiogroup"
      aria-label={label}
    >
      {segments.map((segment, index) => (
        <button
          key={segment.value}
          ref={(node) => {
            buttonsRef.current[index] = node;
          }}
          type="button"
          role="radio"
          aria-checked={segment.value === value}
          aria-label={segment.icon ? segment.label : undefined}
          aria-busy={segment.busy || undefined}
          tabIndex={segment.value === value ? 0 : -1}
          onClick={() => onChange(segment.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {segment.icon ?? segment.label}
        </button>
      ))}
    </span>
  );
};

const Toolbar = () => {
  const {
    look,
    setLook,
    strength,
    setStrength,
    input,
    setInput,
    micState,
    muted,
    setMuted,
    theme,
    setTheme,
    shape,
    setShape,
    knobs,
  } = useBorealis();
  const customHue =
    knobs.hueStart !== undefined || knobs.hueWidth !== undefined;

  return (
    // The card's own padding is a page rule with more weight than a module's,
    // so the carousel page sets its bar's inline, and this does the same.
    <div
      className={cx(styles.controls, "card")}
      style={{ paddingBlock: 10, paddingInline: 12 }}
    >
      <div className={styles.row}>
        <Picker
          label="Preset"
          value={look}
          choices={LOOK_CHOICES}
          onChange={setLook}
          currentLabel={customHue && look !== "off" ? "Custom" : undefined}
        />
        <Picker
          label="Strength"
          value={strength}
          choices={STRENGTH_CHOICES}
          onChange={setStrength}
        />
        <span className={styles.field}>
          <Segmented
            label="Listening to"
            value={input}
            onChange={setInput}
            segments={[
              { value: "voice", label: "Mock" },
              { value: "clip", label: "Recording" },
              {
                value: "mic",
                label: "Microphone",
                busy: micState === "asking",
              },
            ]}
          />
        </span>
        {/* The recording's sound. Always in the row, so picking the recording
            does not reflow the bar, and live only while it plays. */}
        <button
          type="button"
          className={cx("button", styles.icon_button)}
          aria-label={muted ? "Unmute the recording" : "Mute the recording"}
          aria-pressed={muted}
          disabled={input !== "clip"}
          onClick={() => setMuted(!muted)}
        >
          {muted ? (
            <TbVolumeOff size={16} aria-hidden="true" />
          ) : (
            <TbVolume size={16} aria-hidden="true" />
          )}
        </button>
        {/* The box the glow is drawn on: the app's caption, or the same box
            at a phone's proportions. */}
        <Segmented
          label="Box shape"
          value={shape}
          onChange={setShape}
          className={styles.icons}
          segments={[
            {
              value: "caption",
              label: "Caption box",
              icon: <TbRectangle size={16} aria-hidden="true" />,
            },
            {
              value: "phone",
              label: "Phone box",
              icon: <TbRectangleVertical size={16} aria-hidden="true" />,
            },
          ]}
        />
        <Segmented
          label="Stage theme"
          value={theme}
          onChange={setTheme}
          className={styles.icons}
          segments={[
            {
              value: "light",
              label: "Light",
              icon: <IoSunnyOutline size={15} aria-hidden="true" />,
            },
            {
              value: "dark",
              label: "Dark",
              icon: <IoMoonOutline size={15} aria-hidden="true" />,
            },
          ]}
        />
      </div>
    </div>
  );
};

/** Wraps the bar and everything it drives, and carries the demo's tokens. */
const Bench = ({ children }: { children: ReactNode }) => (
  <div className={styles.bench}>{children}</div>
);

/* ---------- the stage ---------- */

/**
 * The knobs the look and the strength own, taken out of the defaults before
 * the rest is written back, so a reset of the knobs does not reset the menu.
 */
const baseConfig = (): Partial<BorealisConfig> => {
  const base: Partial<BorealisConfig> = defaults();
  delete base.colorMode;
  delete base.hueStart;
  delete base.hueWidth;
  delete base.opacity;
  return base;
};

/** The class the box carries for the flight, which turns its transition on. */
const MORPHING = styles.morphing ?? "morphing";

/** A shape's layout of the words, as they are now: measured on a copy of the box. */
type End = {
  outer: DOMRect;
  block: DOMRect;
  words: { x: number; y: number }[];
};

const layoutIn = (box: HTMLDivElement, shape: Shape): End => {
  const ghost = box.cloneNode(true) as HTMLDivElement;
  ghost.querySelector("canvas")?.remove();
  ghost.dataset.shape = shape;
  // The words as inline blocks, so each one's box is its line's height and
  // sits where the flight will set it, an absolute box of the same height.
  ghost.dataset.measure = "";
  ghost.classList.remove(MORPHING);
  ghost.style.transition = "none";
  ghost.style.visibility = "hidden";
  ghost.setAttribute("aria-hidden", "true");
  box.parentElement?.appendChild(ghost);
  const outer = ghost.getBoundingClientRect();
  const block =
    ghost.querySelector("[data-words]")?.getBoundingClientRect() ?? outer;
  const words = [...ghost.querySelectorAll("[data-word]")].map((word) => {
    const rect = word.getBoundingClientRect();
    return { x: rect.left - block.left, y: rect.top - block.top };
  });
  ghost.remove();
  return { outer, block, words };
};

/**
 * Both ends of a flight, for the words as they are now: the caption layout
 * and the phone layout, each measured on a copy of the box laid in the
 * stage unseen. The box gets its outer size at the caption end, the words'
 * block its size at both ends, and each word its place in the block at
 * both, all in px on the elements, and the stylesheet mixes them by the
 * flight's progress: a word goes straight from its place on one line to
 * its place on another, and no wrapping in between is ever laid out.
 * Max-content has no transition to a length in any browser but one, and
 * this way needs none.
 */
const END_PROPERTIES = [
  "--cap-w",
  "--cap-h",
  "--cap-tw",
  "--cap-th",
  "--phone-tw",
  "--phone-th",
];

const measureEnds = (box: HTMLDivElement) => {
  const cap = layoutIn(box, "caption");
  const phone = layoutIn(box, "phone");
  const set = (name: string, value: number) =>
    box.style.setProperty(name, `${value}px`);
  // To the fraction: a width rounded down by half a pixel would wrap the
  // words' last line one line further than the box at rest does.
  set("--cap-w", cap.outer.width);
  set("--cap-h", cap.outer.height);
  set("--cap-tw", cap.block.width);
  set("--cap-th", cap.block.height);
  set("--phone-tw", phone.block.width);
  set("--phone-th", phone.block.height);
  box.querySelectorAll<HTMLElement>("[data-word]").forEach((word, i) => {
    const from = cap.words[i];
    const to = phone.words[i];
    if (from && to) {
      word.style.setProperty("--x0", `${from.x}px`);
      word.style.setProperty("--y0", `${from.y}px`);
      word.style.setProperty("--x1", `${to.x}px`);
      word.style.setProperty("--y1", `${to.y}px`);
    }
  });
};

const Stage = () => {
  const {
    look,
    strength,
    input,
    micState,
    clipState,
    theme,
    shape,
    knobs,
    glowRef,
    micRef,
    clipRef,
  } = useBorealis();
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<Source | null>(null);
  // When the last word landed, on the frame clock. A ref, not state: the
  // source reads it once a frame, and nothing needs to render for it.
  const spokeAtRef = useRef(-1e9);
  const onScreenRef = useRef(true);
  const pausedRef = useRef(false);
  const inputRef = useRef<Input>(input);
  inputRef.current = input;
  const reducedMotion = useReducedMotion();
  const [text, setText] = useState({
    committed: "",
    tentative: "",
    visible: false,
  });

  // The glow, attached once, as a caller would attach it: a mock voice that
  // speaks while words are landing in the box, and is quiet otherwise.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) {
      return;
    }
    const voice = createMockVoice();
    const source: Source = (dt) =>
      voice.read(dt, performance.now() - spokeAtRef.current < SPEAKING_WINDOW);
    voiceRef.current = source;
    // The site's own lift over the app's: its box is drawn inside a screen
    // scaled down to fit, where the glow reads shorter against its text than
    // the app's does, and 1.2 has the peaks clear the top of the last line as
    // they do in the app. The box here is at the app's size, and it keeps the
    // lift so the glow is the one the site shows.
    const glow = attachBorealis(box, {
      className: styles.glow,
      source,
      scaleY: 1.2,
    });
    glowRef.current = glow;
    return () => {
      glow.destroy();
      glowRef.current = null;
      voiceRef.current = null;
    };
  }, [glowRef]);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) {
      return;
    }
    if (look === "off") {
      glow.reset();
      glow.pause();
    } else {
      glow.setLook(look);
      glow.resume();
    }
  }, [look, glowRef]);

  useEffect(() => {
    glowRef.current?.setStrength(strength);
  }, [strength, glowRef]);

  // The knobs over the app's defaults, and under a reduced-motion preference
  // the lobes hold still and the hue stays put, unless a knob says otherwise.
  useEffect(() => {
    glowRef.current?.configure({
      ...baseConfig(),
      ...(reducedMotion ? { flow: 0, hueRange: 0 } : {}),
      ...knobs,
    });
  }, [knobs, reducedMotion, glowRef]);

  // The morph between the shapes is a transition, not an animation, so a
  // flip in mid-flight turns the box around from wherever it is. One number
  // transitions, --p, and the stylesheet mixes every size on the box from
  // it; the stage only measures the caption end, turns the class on for the
  // flight, and takes it off when it lands, so at rest the box follows its
  // words at once, as the app's does.
  const prevShapeRef = useRef(shape);
  // The flight's bookkeeping: whether one is on, the frame loop that
  // watches it, and the transition's measured speed, in its own seconds
  // per second of the clock.
  const morphRef = useRef({ active: false, raf: 0, rate: 1 });

  const settle = useCallback(() => {
    const box = boxRef.current;
    const morph = morphRef.current;
    cancelAnimationFrame(morph.raf);
    morph.raf = 0;
    if (!box || !morph.active) {
      return;
    }
    morph.active = false;
    // At either end the mix is the shape's own size, so letting go of the
    // class is not a change that shows.
    box.classList.remove(MORPHING);
    for (const end of END_PROPERTIES) {
      box.style.removeProperty(end);
    }
  }, []);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const prev = prevShapeRef.current;
    prevShapeRef.current = shape;
    if (!box || prev === shape) {
      return;
    }
    if (reducedMotion) {
      settle();
      return;
    }
    const morph = morphRef.current;
    // Back to the shape it was in, flushed: React has written the new one,
    // and the flight has to start from a style the box was painted in.
    box.dataset.shape = prev;
    void box.offsetWidth;
    measureEnds(box);
    // Flushed again with the ends written and the class still off: the
    // ends transition under a flight, and the take-off is not a change of
    // ends but the start of one.
    void box.offsetWidth;
    box.classList.add(MORPHING);
    box.dataset.shape = shape;
    morph.active = true;
    // The transition's own end event lands first. Behind it, a frame loop
    // watches the transition itself rather than the clock: the devtools can
    // play every animation at a tenth of its speed, or hold it, and a timer
    // set to the stylesheet's 0.7s would let go of the flight in the middle
    // of it. Each frame the loop reads how far the transition's own time
    // has come against the clock's, which is its real speed, and lets go
    // only once the transition is gone and --p rests at an end.
    cancelAnimationFrame(morph.raf);
    let ownTime: number | null = null;
    let clock = 0;
    const watch = (now: number) => {
      morph.raf = 0;
      if (!morph.active) {
        return;
      }
      const flight = box
        .getAnimations()
        .find(
          (animation): animation is CSSTransition =>
            animation instanceof CSSTransition &&
            animation.transitionProperty === "--p"
        );
      if (flight) {
        const time =
          typeof flight.currentTime === "number" ? flight.currentTime : null;
        if (time !== null && ownTime !== null && now > clock) {
          morph.rate = (time - ownTime) / (now - clock);
        }
        ownTime = time;
        clock = now;
        morph.raf = requestAnimationFrame(watch);
        return;
      }
      const p = parseFloat(getComputedStyle(box).getPropertyValue("--p"));
      if (p === 0 || p === 1) {
        settle();
        return;
      }
      morph.raf = requestAnimationFrame(watch);
    };
    morph.raf = requestAnimationFrame(watch);
  }, [shape, reducedMotion, settle]);

  // Words landing during a flight move both its ends: measured again. The
  // words snap to their new places, and the box glides to its new size.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (box && morphRef.current.active) {
      measureEnds(box);
    }
  }, [text]);

  useEffect(() => {
    const box = boxRef.current;
    const morph = morphRef.current;
    if (!box) {
      return;
    }
    const onEnd = (event: TransitionEvent) => {
      if (event.target === box && event.propertyName === "--p") {
        settle();
      }
    };
    box.addEventListener("transitionend", onEnd);
    return () => {
      box.removeEventListener("transitionend", onEnd);
      cancelAnimationFrame(morph.raf);
    };
  }, [settle]);

  const listening = input === "mic" && micState === "live";
  const playing = input === "clip" && clipState === "playing";

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) {
      return;
    }
    const mic = micRef.current;
    const clip = clipRef.current;
    if (listening && mic) {
      glow.setSource(() => mic.read());
    } else if (playing && clip) {
      glow.setSource(() => clip.source.read());
      // From the top, the glow starts over with the recording: its hue
      // drift and the lobes' flow run on the driver's own clock, and a
      // round of the recording is only a round of the glow if both begin
      // together. Picked up from the middle, it carries on as it was.
      if (clip.audio.currentTime < 0.5) {
        // Back to the very top with it, so the glow and the sound start on
        // the same frame here as they do at every wrap.
        clip.audio.currentTime = 0;
        glow.reset();
      }
    } else {
      glow.setSource(voiceRef.current);
    }
  }, [listening, playing, glowRef, micRef, clipRef]);

  // Only type while the stage is on screen and the tab is in front: timers
  // in a backgrounded tab are throttled to about one a second, which would
  // wreck the pacing. The recording pauses with it, and picks up where it
  // left off, so nothing plays to a page nobody is looking at.
  const syncPaused = useCallback(() => {
    pausedRef.current = !onScreenRef.current || document.hidden;
    const clip = clipRef.current;
    if (clip && inputRef.current === "clip") {
      if (pausedRef.current) {
        clip.audio.pause();
      } else {
        clip.audio.play().catch(() => {});
      }
    }
  }, [clipRef]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreenRef.current = entry?.isIntersecting ?? true;
        syncPaused();
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", syncPaused);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPaused);
    };
  }, [syncPaused]);

  // The recording's captions, from its word timings: each frame reads where
  // the clip is and shows the words said so far, the next one dimmed. A
  // sentence stays up until the next one begins, the last until the loop
  // comes round, so the box is never up with nothing in it.
  useEffect(() => {
    const clip = clipRef.current;
    if (!playing || !clip) {
      return;
    }
    let raf = 0;
    let last = "";
    let lastTime = 0;
    const tick = () => {
      const t = clip.audio.currentTime;
      // The wrap: the recording ends on a breath of silence, so the glow is
      // already gone, and starting the driver over here is what makes every
      // round of the recording the same round of the glow.
      if (t < lastTime - 0.5) {
        glowRef.current?.reset();
      }
      lastTime = t;
      let shown: {
        committed: string;
        tentative: string;
        visible: true;
      } | null = null;
      for (let i = 0; i < CLIP_SENTENCES.length; i++) {
        const sentence = CLIP_SENTENCES[i];
        const next = CLIP_SENTENCES[i + 1];
        if (!sentence) {
          break;
        }
        const until = next ? next.start : Infinity;
        if (t >= sentence.start && t < until) {
          const words = sentence.words.map((w) => w.word);
          const landed = Math.max(
            1,
            sentence.words.filter((w) => w.at <= t).length
          );
          shown = {
            committed: words.slice(0, landed).join(" "),
            tentative: words[landed] ?? "",
            visible: true,
          };
          break;
        }
      }
      // Nothing said yet, on the very first frame: the box keeps what it had.
      if (shown) {
        const key = `${shown.committed}|${shown.tentative}`;
        if (key !== last) {
          last = key;
          setText(shown);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, clipRef]);

  // The lines, a word at a time: the next word shows dimmed before it lands,
  // as the app shows what the model has not settled on yet. A line holds
  // once it is said, and the next one's first word replaces it: the box is
  // hidden until the first word of all, and never up with nothing in it.
  useEffect(() => {
    if (playing) {
      return;
    }
    if (listening) {
      setText({
        committed: "Listening to your microphone.",
        tentative: "",
        visible: true,
      });
      return;
    }
    let cancelled = false;
    let timer = 0;
    let line = 0;
    let word = 0;
    const later = (fn: () => void, ms: number) => {
      timer = window.setTimeout(fn, ms);
    };
    const step = () => {
      if (cancelled) {
        return;
      }
      if (pausedRef.current) {
        later(step, 250);
        return;
      }
      const words = (LINES[line] ?? "").split(" ");
      word += 1;
      setText({
        committed: words.slice(0, word).join(" "),
        tentative: words[word] ?? "",
        visible: true,
      });
      spokeAtRef.current = performance.now();
      if (word < words.length) {
        const last = words[word - 1] ?? "";
        const beat =
          120 + 150 * hash(line * 131 + word) + (/[,:;]$/.test(last) ? 260 : 0);
        later(step, beat);
        return;
      }
      later(() => {
        line = (line + 1) % LINES.length;
        word = 0;
        step();
      }, 2200);
    };
    later(step, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [listening, playing]);

  return (
    <div ref={rootRef} className={styles.stage} data-look={look}>
      <div
        ref={boxRef}
        className={styles.caption}
        data-visible={text.visible ? "true" : "false"}
        data-theme={theme}
        data-shape={shape}
      >
        {/* The source's row, as the app draws it by default: the icon and
            name of what the words are being read from. */}
        <span className={styles.cap_app}>
          <img
            src="/media/design-engineering/subtitles/dock/microphone.png"
            width={84}
            height={84}
            alt=""
          />
          <span className={styles.cap_name}>
            {listening ? "Microphone" : playing ? "Recording" : "Mock voice"}
          </span>
        </span>
        {/* One span a word, so a flight between the shapes can set each
            word where it goes; at rest they read as the one run of text. */}
        <span className={styles.cap_text} data-words="">
          {text.committed
            .split(" ")
            .filter(Boolean)
            .map((word, i) => (
              <Fragment key={i}>
                {i > 0 ? " " : null}
                <span data-word="">{word}</span>
              </Fragment>
            ))}
          {text.tentative && (
            <>
              {" "}
              <span data-word="" className={styles.tentative}>
                {text.tentative}
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
};

/* ---------- the meter ---------- */

const BAND_NAMES = ["lows", "low mids", "mids", "high mids", "highs"];

/**
 * What the driver sees, after the gate, the auto gain and the follower: the
 * five bands and the level, and the rise everything is scaled by. Written to
 * the bars once a frame as a custom property rather than rendered, since a
 * value that changes sixty times a second has no business in React state.
 */
const Meter = () => {
  const { glowRef } = useBorealis();
  const rootRef = useRef<HTMLDivElement>(null);
  const riseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const fills = [...root.querySelectorAll<HTMLElement>("[data-fill]")];
    let raf = 0;
    let onScreen = true;
    const tick = () => {
      raf = 0;
      const frame = glowRef.current?.frame ?? null;
      fills.forEach((fill, index) => {
        const value = frame
          ? index < BAND_NAMES.length
            ? frame.bands[index] ?? 0
            : frame.level
          : 0;
        fill.style.setProperty("--v", value.toFixed(3));
      });
      if (riseRef.current) {
        riseRef.current.textContent = `${Math.round(
          (frame?.glow ?? 0) * 100
        )}%`;
      }
      if (onScreen) {
        raf = requestAnimationFrame(tick);
      }
    };
    const start = () => {
      if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            onScreen = entry?.isIntersecting ?? true;
            if (onScreen) {
              start();
            }
          })
        : null;
    observer?.observe(root);
    start();
    return () => {
      observer?.disconnect();
      onScreen = false;
      cancelAnimationFrame(raf);
    };
  }, [glowRef]);

  return (
    <div ref={rootRef} className={styles.meter}>
      <div className={styles.bars} role="img" aria-label="Band levels">
        {BAND_NAMES.map((name) => (
          <div key={name} className={styles.bar}>
            <div className={styles.bar_track}>
              <div className={styles.bar_fill} data-fill="" />
            </div>
            <span className={styles.bar_name}>{name}</span>
          </div>
        ))}
        <div className={cx(styles.bar, styles.bar_level)}>
          <div className={styles.bar_track}>
            <div className={styles.bar_fill} data-fill="" />
          </div>
          <span className={styles.bar_name}>level</span>
        </div>
      </div>
      <p className={styles.rise}>
        <span className={styles.chip_label}>Rise</span>
        <span ref={riseRef} className={styles.rise_value}>
          0%
        </span>
        <span className={styles.rise_note}>
          the level to the power of the curve: what every size below is scaled
          by
        </span>
      </p>
    </div>
  );
};

/* ---------- the knobs ---------- */

type NumberKnob = {
  [K in keyof BorealisConfig]: BorealisConfig[K] extends number ? K : never;
}[keyof BorealisConfig];

type Knob = {
  key: NumberKnob;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
};

type KnobGroup = {
  id: "voice" | "lobes" | "hills" | "colors";
  title: string;
  brief: string;
  knobs: Knob[];
};

const KNOB_GROUPS: KnobGroup[] = [
  {
    id: "colors",
    title: "Colors",
    brief: "Seven shares of the wheel, drifting.",
    knobs: [
      {
        key: "hueStart",
        label: "Hue start",
        min: 0,
        max: 360,
        step: 1,
        unit: "°",
      },
      {
        key: "hueWidth",
        label: "Hue width",
        min: 0,
        max: 360,
        step: 1,
        unit: "°",
      },
      { key: "saturation", label: "Saturation", min: 0, max: 1, step: 0.01 },
      { key: "hueRange", label: "Drift", min: 0, max: 180, step: 1, unit: "°" },
      {
        key: "hueDuration",
        label: "Drift period",
        min: 2,
        max: 40,
        step: 0.5,
        unit: "s",
      },
    ],
  },
  {
    id: "voice",
    title: "Voice",
    brief: "How a loudness becomes a level.",
    knobs: [
      { key: "sensitivity", label: "Sensitivity", min: 0.5, max: 8, step: 0.1 },
      { key: "threshold", label: "Gate", min: 0, max: 0.3, step: 0.005 },
      { key: "curve", label: "Curve", min: 0.2, max: 2, step: 0.05 },
      {
        key: "attack",
        label: "Attack",
        min: 0.01,
        max: 0.5,
        step: 0.01,
        unit: "s",
      },
      {
        key: "release",
        label: "Release",
        min: 0.05,
        max: 1.5,
        step: 0.01,
        unit: "s",
      },
      { key: "idle", label: "Breathe in silence", min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    id: "lobes",
    title: "Lobes",
    brief: "Seven of them, fanned out from the middle of the edge.",
    knobs: [
      { key: "reach", label: "Reach", min: 0.3, max: 3, step: 0.05 },
      { key: "spread", label: "Spread", min: 0, max: 2.5, step: 0.05 },
      { key: "bend", label: "Lift", min: 0, max: 120, step: 1, unit: "pt" },
      { key: "lobeSpacing", label: "Spacing", min: 0.5, max: 1.6, step: 0.01 },
      { key: "flow", label: "Flow", min: 0, max: 200, step: 1, unit: "pt/s" },
      { key: "glowOpacity", label: "Opacity", min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    id: "hills",
    title: "Hills",
    brief: "One per band, standing over the lobes.",
    knobs: [
      { key: "curveCount", label: "Count", min: 0, max: 7, step: 1 },
      { key: "curveOpacity", label: "Fill", min: 0, max: 0.6, step: 0.01 },
      { key: "curveEdge", label: "Crest line", min: 0, max: 1, step: 0.01 },
      { key: "curveCeiling", label: "Ceiling", min: 0.1, max: 1, step: 0.01 },
      { key: "curveShape", label: "Profile", min: 1, max: 4, step: 0.05 },
      { key: "curveWander", label: "Wander", min: 0, max: 0.3, step: 0.004 },
    ],
  },
];

const format = (value: number, step: number) =>
  step >= 1 ? String(Math.round(value)) : value.toFixed(step < 0.01 ? 3 : 2);

const Knobs = () => {
  const { knobs, setKnob, resetKnobs, look } = useBorealis();
  const id = useId();
  const base = useMemo(() => defaults(), []);
  const changed = Object.keys(knobs).length > 0;
  // The preset's own hue start and width, where it has them: the two hue
  // knobs rest there rather than at the config's defaults.
  const preset = look === "off" ? undefined : LOOKS[look];

  const toggle = <K extends "autoGain" | "curveBlend">(
    key: K,
    label: string,
    choices: [BorealisConfig[K], string][]
  ) => (
    <div className={styles.knob}>
      <span className={styles.knob_label}>
        <small>{label}</small>
      </span>
      <Segmented
        label={label}
        className={styles.small}
        value={String(knobs[key] ?? base[key])}
        onChange={(next) => {
          const choice = choices.find(([value]) => String(value) === next);
          if (choice) {
            setKnob(key, choice[0]);
          }
        }}
        segments={choices.map(([value, text]) => ({
          value: String(value),
          label: text,
        }))}
      />
    </div>
  );

  return (
    <div className={styles.knobs}>
      {/* One group at a time, on the site's tabs: all four at once was more
          panel than demo, and the point is to see the box move as a knob
          does. */}
      <Tabs
        defaultValue="colors"
        tabs={KNOB_GROUPS.map((group) => ({
          id: group.id,
          trigger: group.title,
          content: (
            <div className={styles.knob_group}>
              <div className={styles.knob_list}>
                {group.knobs.map((knob) => {
                  const value =
                    knobs[knob.key] ??
                    (knob.key === "hueStart" || knob.key === "hueWidth"
                      ? preset?.[knob.key] ?? base[knob.key]
                      : base[knob.key]);
                  const percent =
                    ((value - knob.min) / (knob.max - knob.min)) * 100;
                  const inputId = `${id}-${knob.key}`;
                  return (
                    <div key={knob.key} className={styles.knob}>
                      <label htmlFor={inputId} className={styles.knob_label}>
                        <small>{knob.label}</small>
                      </label>
                      <input
                        id={inputId}
                        type="range"
                        min={knob.min}
                        max={knob.max}
                        step={knob.step}
                        value={value}
                        style={{ "--value": `${percent}%` } as CSSProperties}
                        onChange={(event) =>
                          setKnob(knob.key, parseFloat(event.target.value))
                        }
                      />
                      <output htmlFor={inputId} className={styles.knob_value}>
                        <small>
                          {format(value, knob.step)}
                          {knob.unit ? <span>{knob.unit}</span> : null}
                        </small>
                      </output>
                    </div>
                  );
                })}
                {group.id === "voice" &&
                  toggle("autoGain", "Auto gain", [
                    [true, "On"],
                    [false, "Off"],
                  ])}
                {group.id === "hills" &&
                  toggle("curveBlend", "Blend", [
                    ["normal", "Over"],
                    ["additive", "Added"],
                  ])}
              </div>
            </div>
          ),
        }))}
      />
      <div className={styles.knobs_foot}>
        <button
          type="button"
          className={styles.reset}
          onClick={resetKnobs}
          disabled={!changed}
        >
          Back to the app&rsquo;s values
        </button>
      </div>
    </div>
  );
};

export const AudioBorealisDemo = {
  Provider,
  Bench,
  Toolbar,
  Stage,
  Meter,
  Knobs,
};
