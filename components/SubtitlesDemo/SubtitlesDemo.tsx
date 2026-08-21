import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./SubtitlesDemo.module.scss";

/**
 * The hero demo from subtitles-live.com, ported to React.
 *
 * It plays a three-scene loop: a call, the notes you switch to while the call
 * keeps running, and a podcast. Captions type themselves out over the top of
 * all of it, and the app switch happens *while* a caption is running, because
 * that is the whole point being made, the overlay belongs to the screen, not
 * to the window underneath it.
 *
 * Nothing here is an image or a video. Every pixel is CSS.
 */

const APPS = {
  meeting: "Meetings",
  notes: "Notes",
  player: "Player",
} as const;

type AppId = keyof typeof APPS;

type Scene = {
  app: AppId;
  /** Names the scene under the bar, and to a screen reader. */
  label: string;
  lines: string[];
};

const SCENES: Scene[] = [
  {
    app: "meeting",
    label: "The call",
    lines: [
      "Universal subtitles for any app, live on your Mac.",
      "In a meeting, second language or not, one missed word costs you the next three.",
      "So the captions run live, over the call, while people are still talking.",
    ],
  },
  {
    app: "notes",
    label: "Your notes",
    lines: [
      "Switch to your notes and the meeting carries on without you watching it.",
      "The overlay stays above every window, so you keep the thread.",
    ],
  },
  {
    app: "player",
    label: "A podcast",
    lines: [
      "The same for a podcast, a lecture, or a video.",
      "And none of it leaves the Mac: it runs on the Neural Engine, on-device.",
    ],
  },
];

/** One closed caption in the stack. Carries an id because the demo speaks seven
 *  lines into fifteen slots, so the same sentence is often in the stack twice
 *  and its text cannot tell the two boxes apart. */
type HistoryPage = { id: number; text: string };

const PEOPLE = [
  { initials: "AO", name: "Amara", face: styles.f1 },
  { initials: "YT", name: "Yuki", face: styles.f2 },
  { initials: "TR", name: "Tomás", face: styles.f3 },
  { initials: "LK", name: "Lena", face: styles.f4 },
];

/** One height per bar, read off a real waveform rather than generated. */
const WAVE = [
  72, 93, 63, 66, 60, 65, 78, 77, 89, 98, 100, 89, 63, 73, 72, 73, 97, 91, 99,
  83, 84, 68, 62, 58, 57, 66, 71, 55, 48, 39, 30, 19, 14, 15, 18, 26, 37, 42,
  40, 41, 39, 41, 40, 40, 44, 44, 40, 39, 35, 34, 34, 33, 36, 36, 36, 38, 36,
  35, 34, 34, 35, 35, 40, 35, 32, 26, 20, 14, 12, 13, 20, 31, 40, 46, 53, 58,
  49, 54, 51, 55, 77, 79, 73, 76, 65, 64, 61, 61, 70, 94, 100, 84, 94, 90, 79,
  70,
];

const EPISODES = [
  { width: "58%", length: "41:07" },
  { width: "72%", length: "36:52" },
  { width: "44%", length: "52:19" },
];

// Scaled so the longest line reaches the text column's right edge. The
// padding was always even, but the widest line stopped short and left a
// gutter against nothing on the left, which read as a page set crooked.
// Every line is scaled by the same 100/92, so the raggedness is unchanged.
const NOTE_LINES_TOP = ["100%", "84.8%", "92.4%", "47.8%"];
const NOTE_LINES_BOTTOM = ["95.7%", "79.3%", "88%", "56.5%", "93.5%", "41.3%"];

// The transport runs only while the player is in front, and faster than real
// time on purpose: a scene lasts about a dozen seconds, and a real playhead
// would not visibly move in that. The clock counting up is the part people read
// as "this is playing", so that is the part that has to move.
const START = 18 * 60 + 24; // 18:24, where the episode starts
const TOTAL = 41 * 60 + 7; // 41:07
const RATE = 4; // seconds of episode per second of demo

const WORD_MS = 130; // roughly conversational pace
const JITTER = 80;
const GAP_MS = 500; // blank between boxes

/** A finished box holds long enough to actually be read: a base beat plus time
 *  per word, so a long caption is not gone before you reach the end. */
const holdFor = (words: number) => Math.min(1500 + words * 130, 4200);

const mmss = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(
    2,
    "0"
  )}`;

const cx = (...names: (string | undefined | false)[]) =>
  names.filter(Boolean).join(" ");

/** Capturing can throw on a pointer the browser no longer knows about, and a
 *  drag that works without capture is better than one that never starts. */
const capture = (event: ReactPointerEvent<HTMLElement>) => {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // the pointer went away between the press and this line
  }
};

/** A window's place on the screen, as fractions of it. */
type Placement = { left: number; top: number; width: number; height: number };

/** Thrown to unwind the scene loop when the component goes away. */
const CANCELLED = Symbol("cancelled");
/** Thrown to unwind it when somebody picks a different scene. */
const JUMPED = Symbol("jumped");

export const SubtitlesDemo = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // The stack's boxes are put there by hand rather than rendered, so this is a
  // ref to an element React is asked to leave alone. See the effect below.
  const historyRef = useRef<HTMLDivElement>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [clock, setClock] = useState("");
  const [front, setFront] = useState<AppId>(SCENES[0]?.app ?? "meeting");
  const [selected, setSelected] = useState<AppId>(SCENES[0]?.app ?? "meeting");
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [speaking, setSpeaking] = useState(0);
  // Back to front, and the only thing that decides what covers what.
  const [stack, setStack] = useState<AppId[]>(["notes", "player", "meeting"]);
  const [elapsed, setElapsed] = useState(START);
  const [committed, setCommitted] = useState("");
  const [tentative, setTentative] = useState("");
  const [captionVisible, setCaptionVisible] = useState(false);
  const [scene, setScene] = useState(0);
  // How far through the current scene the loop is, and how long the bar has to
  // get there. The loop sets a target and a duration per caption and CSS walks
  // it there, rather than the component animating a number frame by frame.
  const [progress, setProgress] = useState({ value: 0, ms: 0 });
  // Where the caption box has been dragged to, as the fraction of the screen its
  // centre sits at, not pixels, so it keeps its place when the demo resizes.
  // Null until somebody moves it, which leaves the CSS to place it.
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  // The live box goes solid while the stack is up, the way it does under shift.
  const [stackUp, setStackUp] = useState(false);
  /** Where in the box the drag started, so it doesn't jump to the cursor. */
  const grabRef = useRef<{ x: number; y: number } | null>(null);
  // Read by the reveal and the stack below, which run outside React's render and
  // need these the instant they change rather than at the next commit: the stack
  // measures the live box in the same breath as the page that closed it.
  const shiftHeldRef = useRef(false);
  const captionVisibleRef = useRef(false);
  const closePageRef = useRef<((line: string) => void) | null>(null);
  const queueHoleRef = useRef<(() => void) | null>(null);
  // Windows that have been dragged off their CSS insets, each held as fractions
  // of the screen so they keep both their size and their place when it resizes.
  const [placed, setPlaced] = useState<Partial<Record<AppId, Placement>>>({});
  const [draggedWindow, setDraggedWindow] = useState<AppId | null>(null);
  const windowGrabRef = useRef<{
    app: AppId;
    x: number;
    y: number;
    place: Placement;
    handle: HTMLElement;
    pointerId: number;
  } | null>(null);

  // The loop parks on `paused` instead of returning, because restarting it on
  // every scroll-back stacked a second copy on top of the first and the two
  // raced the caption text.
  const pausedRef = useRef(false);
  const onScreenRef = useRef(true);
  // Set by a click on a scene button or on one of the windows; the loop unwinds
  // at its next beat and picks that scene up from the top. `direct` is the
  // difference between the two: the buttons are a request to go somewhere, and
  // watching the ⌘-tab get there is the point of them, while clicking a window
  // is reaching for that window, the machinery in between would be in the way.
  const jumpRef = useRef<{ index: number; direct: boolean } | null>(null);
  // Cuts every wait the loop is sitting in short. Without it a click landed
  // whenever the current wait happened to end, and a finished caption holds for
  // up to 4.2 seconds, long enough to read as nothing having happened.
  const wakeRef = useRef<(() => void) | null>(null);
  // Which window is actually in front, updated at the moment it fronts. The loop
  // used to carry this in a local it only assigned once a switch had finished,
  // so a switch interrupted by a second click left it a window behind: the next
  // ⌘-tab panel then opened on the wrong app and skipped over the real one.
  const frontRef = useRef<AppId>(SCENES[0]?.app ?? "meeting");

  // Both together, always. The stack anchors itself to the live box at the
  // moment a page closes, which is the same moment this goes false, and a state
  // update has not reached the DOM by then.
  const showCaption = useCallback((next: boolean) => {
    captionVisibleRef.current = next;
    setCaptionVisible(next);
  }, []);

  const showApp = useCallback((app: AppId) => {
    frontRef.current = app;
    setFront(app);
    // Back to front. The three windows used to share one z-index with the front
    // one lifted above them, so everything behind fell back on the order it sits
    // in the markup: raising the notes also carried the podcast over the call.
    // Whatever is raised goes on top and the rest keep the order they had.
    setStack((order) => [...order.filter((id) => id !== app), app]);
  }, []);

  // Two of the three windows make a sound, and the higher of those two in the
  // stack is the one making it. The notes never take it, so switching to them
  // leaves whatever was playing still playing, and switching between the call
  // and the podcast hands the sound from one to the other: something is always
  // going, and only ever one thing. Being in front was never the right test, and
  // it stopped the screen dead the moment the notes came forward.
  const callPlaying = stack.indexOf("meeting") > stack.indexOf("player");

  const syncPaused = useCallback(() => {
    pausedRef.current = !onScreenRef.current || document.hidden;
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Only run while the demo is on screen, and only while the tab is in front:
  // timers in a backgrounded tab are throttled to about one a second, which
  // would wreck the pacing.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
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

  // macOS shows weekday, date and time in the user's own locale. Set after
  // mount rather than during render, so the server and the client agree.
  useEffect(() => {
    const format = new Intl.DateTimeFormat(navigator.language || "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setClock(format.format(new Date()));
      // Re-arm on the next minute boundary rather than polling every second.
      clearTimeout(timer);
      timer = setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    };

    tick();
    // A backgrounded tab throttles timers, so resync when it comes back.
    const resync = () => {
      if (!document.hidden) {
        tick();
      }
    };
    document.addEventListener("visibilitychange", resync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", resync);
    };
  }, []);

  // Who is talking, handed round the tiles the way it goes in a real call:
  // never straight back to the same person, and held for an uneven beat,
  // because a fixed rotation reads as a carousel rather than a conversation.
  useEffect(() => {
    if (!callPlaying) {
      return;
    }
    setSpeaking(0);
    // Somebody is talking the moment the call can be seen. Reduced motion gets
    // that as a still ring: it is who is speaking, not an animation.
    if (reducedMotion) {
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      setSpeaking(
        (at) =>
          (at + 1 + Math.floor(Math.random() * (PEOPLE.length - 1))) %
          PEOPLE.length
      );
      timer = setTimeout(step, 2100 + Math.random() * 1700);
    };
    timer = setTimeout(step, 1900);
    return () => clearTimeout(timer);
  }, [callPlaying, reducedMotion]);

  // The playhead. Every time the podcast starts playing again, it starts here.
  useEffect(() => {
    if (callPlaying || reducedMotion) {
      return;
    }
    setElapsed(START);
    const timer = setInterval(() => {
      // A backgrounded tab should not run the episode on without anybody
      // watching, or coming back to it shows a clock that has raced ahead.
      if (document.hidden) {
        return;
      }
      setElapsed((at) => Math.min(TOTAL, at + RATE));
    }, 1000);
    return () => clearInterval(timer);
    // On the boolean, not on `front`: keyed to the front window this re-ran on
    // every switch and reset the episode to 18:24 each time, so it never got
    // past its first few seconds.
  }, [callPlaying, reducedMotion]);

  // The scene loop itself.
  useEffect(() => {
    const firstScene = SCENES[0];
    const firstLine = firstScene?.lines[0];
    if (!firstScene || !firstLine) {
      return;
    }

    if (reducedMotion) {
      setCommitted(firstLine);
      setTentative("");
      showCaption(true);
      return;
    }

    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    // Every wait currently in flight, so a click can end them all now rather
    // than when their timer says so.
    const waking = new Set<() => void>();

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          timers.delete(timer);
          waking.delete(finish);
          resolve();
        };
        const timer = setTimeout(finish, ms);
        timers.add(timer);
        waking.add(finish);
      });

    wakeRef.current = () => {
      for (const finish of [...waking]) {
        finish();
      }
    };

    const step = async (ms: number) => {
      await wait(ms);
      while (pausedRef.current && !cancelled) {
        await wait(150);
      }
      if (cancelled) {
        throw CANCELLED;
      }
      if (jumpRef.current !== null) {
        throw JUMPED;
      }
    };

    // One subtitle box: types out, holds long enough to read, clears. The app
    // pages the same way, and shows the newest word dim until it commits.
    //
    // `from` and `to` are the slice of the scene's bar this caption is worth.
    // The bar is walked across it in two moves, one for the typing, one for the
    // hold, because those are the only two moments the loop knows how long the
    // next stretch will take. The second starts from wherever the first actually
    // got to, so the jitter in the typing corrects itself rather than piling up.
    const say = async (line: string, from: number, to: number) => {
      const words = line.split(" ");
      const hold = holdFor(words.length);
      const typing = words.length * (WORD_MS + JITTER / 2);
      const typed = from + (to - from) * (typing / (typing + hold + GAP_MS));

      setCommitted("");
      setTentative("");
      showCaption(true);
      setProgress({ value: typed, ms: typing });

      for (let i = 0; i < words.length; i++) {
        if (jumpRef.current !== null) {
          throw JUMPED;
        }
        const word = words[i] ?? "";
        setCommitted(i ? `${words.slice(0, i).join(" ")} ` : "");
        setTentative(word);
        // A comma or full stop gets a beat, the way speech does.
        const punctuated = /[,.;:—]$/.test(word);
        await step(WORD_MS + Math.random() * JITTER + (punctuated ? 180 : 0));
      }

      // Everything commits once the utterance ends.
      setCommitted(line);
      setTentative("");
      setProgress({ value: to, ms: hold + GAP_MS });

      await step(hold);
      showCaption(false);
      // The page has closed. The app records it here too, at the fade, because
      // fading is precisely when somebody looked away and will want it back.
      closePageRef.current?.(line);
      await step(GAP_MS);
    };

    // ⌘-tab: panel up on the current app, selection moves, window fronts as the
    // panel drops, which is when you'd release the key.
    const switchTo = async (to: AppId) => {
      setSelected(frontRef.current);
      setSwitcherVisible(true);
      await step(340);
      setSelected(to);
      await step(560);
      showApp(to);
      setSwitcherVisible(false);
      await step(220);
    };

    // Both halves of a concurrent pair have to finish before the loop moves on,
    // including when one of them threw: awaiting Promise.all would leave the
    // other running against a loop that has already unwound, and its rejection
    // unhandled a beat later.
    const both = async (a: Promise<void>, b: Promise<void>) => {
      const results = await Promise.allSettled([a, b]);
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") {
        throw failed.reason;
      }
    };

    const loop = async () => {
      let index = 0;
      // Set by a jump, cleared by the scene that answers it: the switch that
      // gets there runs on its own rather than under the first caption.
      let picked = false;

      for (;;) {
        const current = SCENES[index];
        const opener = current?.lines[0];
        if (!current || !opener) {
          return;
        }

        const slice = 1 / current.lines.length;
        const deliberate = picked;
        picked = false;
        setScene(index);
        // Back to empty before the first caption of the scene, and instantly:
        // the wrap-around switch runs before any caption does, and the bar would
        // otherwise sit full through it.
        setProgress({ value: 0, ms: 0 });

        try {
          // Against what is actually in front, not against what the last switch
          // meant to leave there: an interrupted one may have fronted its window
          // already, and this scene's may be it.
          if (current.app !== frontRef.current) {
            if (index === 0 || deliberate) {
              // Coming back round to the top, or somebody picked this scene.
              // The switch runs on its own, with the captions starting after it
              // lands: a first line that began while the previous scene's window
              // was still in front reads as the loop losing its place, and after
              // a click it would read as the caption belonging to the window you
              // just left.
              await switchTo(current.app);
              await say(opener, 0, slice);
            } else {
              // Deliberately concurrent: the caption keeps running straight
              // through the app switch, which is the whole point being made.
              await both(say(opener, 0, slice), switchTo(current.app));
            }
          } else {
            await say(opener, 0, slice);
          }

          for (let j = 1; j < current.lines.length; j++) {
            await say(current.lines[j] ?? "", j * slice, (j + 1) * slice);
          }

          index = (index + 1) % SCENES.length;
        } catch (error) {
          if (error !== JUMPED) {
            throw error;
          }
          // Somebody picked a scene. Drop whatever was mid-sentence and let the
          // next turn of the loop get there, which is also what makes a second
          // click during a switch work: it lands here again. A window click has
          // already fronted its window, so the next turn finds nothing to switch
          // and goes straight to the captions.
          const jump = jumpRef.current;
          jumpRef.current = null;
          index = jump?.index ?? index;
          picked = jump ? !jump.direct : false;
          setSwitcherVisible(false);
          showCaption(false);
          setCommitted("");
          setTentative("");
          setProgress({ value: 0, ms: 0 });
        }
      }
    };

    loop().catch((error) => {
      if (error !== CANCELLED) {
        throw error;
      }
    });

    return () => {
      cancelled = true;
      wakeRef.current = null;
      timers.forEach(clearTimeout);
      timers.clear();
      waking.clear();
    };
  }, [reducedMotion, showApp, showCaption]);

  // Picking the scene that is already playing does nothing, whether you picked
  // it from the bar or by clicking its window: restarting it would punish a
  // click on the thing you are already watching.
  const jumpTo = useCallback(
    (index: number, direct = false) => {
      if (index === scene) {
        return;
      }
      const target = SCENES[index];
      if (!target) {
        return;
      }

      if (reducedMotion) {
        // No loop to unwind, the scene is just what is on screen.
        setScene(index);
        showApp(target.app);
        setCommitted(target.lines[0] ?? "");
        setTentative("");
        setCaptionVisible(true);
        setProgress({ value: 0, ms: 0 });
        return;
      }

      // Waking the loop is what makes this instant: it is otherwise sitting in
      // whatever wait it started before the click, which for a caption that has
      // finished typing is a hold of up to 4.2 seconds. Woken, it unwinds on the
      // next microtask and the ⌘-tab panel is up within the frame.
      jumpRef.current = { index, direct };
      setScene(index);
      setCaptionVisible(false);
      setProgress({ value: 0, ms: 0 });
      if (direct) {
        // Clicking a window is reaching for it: it comes forward now, and the
        // loop finds it already there and skips the ⌘-tab entirely.
        showApp(target.app);
        setSwitcherVisible(false);
      }
      wakeRef.current?.();
    },
    [reducedMotion, scene, showApp]
  );

  // ── moving the caption box ───────────────────────────────────────────────
  //
  // The app lets the overlay through clicks until you hold shift, at which point
  // it becomes something you can pick up and put somewhere else. This does the
  // same, inside the fake screen: shift arms it, the box is dragged by its
  // centre, and it cannot be dropped outside the screen it belongs to.

  useEffect(() => {
    // The ref as well as the state, because the reveal below reads it from a
    // frame callback rather than from a render, and repaint the hole with it:
    // arming the box is one of the two things that puts the hole away.
    const hold = (next: boolean) => {
      shiftHeldRef.current = next;
      setShiftHeld(next);
      queueHoleRef.current?.();
    };
    const down = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        hold(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        hold(false);
      }
    };
    // Tabbing away with the key down would otherwise leave it armed forever.
    const clear = () => hold(false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  /** Keeps the whole box on the screen, whatever the cursor asks for. */
  const insideStage = useCallback((x: number, y: number) => {
    const stage = stageRef.current?.getBoundingClientRect();
    const box = overlayRef.current?.getBoundingClientRect();
    if (!stage || !box) {
      return { x, y };
    }
    const halfWide = box.width / 2 / stage.width;
    const halfTall = box.height / 2 / stage.height;
    return {
      x: Math.min(Math.max(x, halfWide), 1 - halfWide),
      y: Math.min(Math.max(y, halfTall), 1 - halfTall),
    };
  }, []);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current?.getBoundingClientRect();
      const box = overlayRef.current?.getBoundingClientRect();
      // Mouse only, as with the windows, and shift is a key nobody holds on a
      // phone anyway.
      if (event.pointerType !== "mouse" || !event.shiftKey || !stage || !box) {
        return;
      }
      event.preventDefault();
      // Captured, so the box keeps receiving the pointer once it leaves it,
      // and keeps receiving the release, wherever that happens. Paired with
      // onLostPointerCapture below, which covers the pointer being taken away
      // rather than let go: without it a release outside the page would leave
      // the box grabbed forever.
      capture(event);

      const centre = {
        x: (box.left + box.width / 2 - stage.left) / stage.width,
        y: (box.top + box.height / 2 - stage.top) / stage.height,
      };
      grabRef.current = {
        x: centre.x - (event.clientX - stage.left) / stage.width,
        y: centre.y - (event.clientY - stage.top) / stage.height,
      };
      setDragging(true);
      setSpot(insideStage(centre.x, centre.y));
    },
    [insideStage]
  );

  const onDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const grab = grabRef.current;
      const stage = stageRef.current?.getBoundingClientRect();
      if (!grab || !stage) {
        return;
      }
      setSpot(
        insideStage(
          (event.clientX - stage.left) / stage.width + grab.x,
          (event.clientY - stage.top) / stage.height + grab.y
        )
      );
    },
    [insideStage]
  );

  const endDrag = useCallback(() => {
    grabRef.current = null;
    setDragging(false);
  }, []);

  // ── the pointer reveal and the option stack ──────────────────────────────
  //
  // Neither of these is drawn. The page has a pointer and something underneath
  // the captions, which is everything the reveal needs, and a keyboard with the
  // same modifier on it, so both are wired to the real thing and behave as they
  // do in the app. The geometry is in the stylesheet, against the app's own
  // constants; what is here is where the hole is and what is in the stack.
  //
  // All of it runs outside React on purpose. The stack is a scroll container
  // whose children animate in, and the order of the work is the whole trick:
  // patch the boxes in place, settle the scroll while they are still at rest,
  // and only then let them move. Rendering the list would hand that order to
  // the reconciler, and re-attaching a box is exactly what restarts the CSS
  // animation still named on it. So React is given an empty div whose className
  // never changes, which means it never writes to the node again, and this owns
  // the children.
  useEffect(() => {
    const box = overlayRef.current;
    const stage = stageRef.current;
    const screen = screenRef.current;
    const historyEl = historyRef.current;
    if (!box || !stage || !screen || !historyEl) {
      return;
    }

    // Closed pages, oldest first, at the app's own `defaultHistoryDepth`.
    //
    // Held back to six at first, on the reasoning that this stage is only a few
    // hundred pixels tall and would clip most of them. That was the wrong way
    // round: a stack that always fits is a stack the scroll never does anything
    // to, and scrolling back through the older ones is half of what the feature
    // is. Fifteen overflows this stage comfortably, which is the point.
    //
    // The demo speaks seven distinct lines, so a full buffer repeats them. The
    // app would do the same with a speaker who repeats themselves: closePage
    // only refuses a line identical to the one before it.
    const PAST_MAX = 15;
    // Below this there is not enough room to be worth drawing: the app's 40pt.
    const MIN_ROOM = 1.33;
    const FADE_MAX = 2.2;

    // The stylesheet's own names. The module types them as possibly absent and
    // `classList` refuses an empty token, so each one falls back to the name it
    // is written under next door: inert if it ever came to that, and never
    // empty.
    const NAMES = {
      line: styles.hist_line || "hist_line",
      rising: styles.is_rising || "is_rising",
      below: styles.is_below || "is_below",
      clipped: styles.is_clipped || "is_clipped",
      starved: styles.is_starved || "is_starved",
      visible: styles.is_visible || "is_visible",
    };

    const past: HistoryPage[] = [];
    // Pages carry an id rather than being matched on their text. Seven lines
    // into fifteen slots means the same sentence is in the stack more than once,
    // and keying the patch below on text made two different boxes look like one
    // box that had moved, which rebuilt and re-animated the lot.
    let pageId = 0;

    // Which side of the live box the stack takes. Decided on the press that
    // raises it and held for as long as it is up: re-deciding it as the box
    // resizes would let one sentence wrapping to a second line throw the stack
    // across it mid-read, which is the app's reasoning too.
    let placedAbove = true;
    // Whether the stack is raised, which is also what keeps the live box solid.
    let raised = false;
    // How many boxes are still playing their entrance. While any of them is, the
    // scroll geometry below is not to be trusted or written to: a box mid-rise
    // is displaced by its own transform, and that displacement widens the
    // scrollable overflow it is measured against.
    let rising = 0;
    // Whether the stack is sitting against the live box, tracked rather than
    // measured. Deriving it from the scroll offset meant reading geometry at the
    // one moment it cannot be trusted: a box closing while an earlier one was
    // still rising would have read as the reader having scrolled away, and the
    // stack would then have refused to follow the newest box.
    let parked = true;
    // When the reader last turned the wheel, and when we last moved the scroll
    // ourselves. The second exists only to keep the first honest: every write
    // below fires a scroll event, and without telling them apart the stack would
    // read its own corrections as a gesture.
    let userScrolledAt = -1e9;
    let selfScrolledAt = -1e9;

    const emSize = () => parseFloat(getComputedStyle(historyEl).fontSize) || 16;

    // The live box's top edge, as the stack should hang off it.
    //
    // Between pages the box is invisible but still holds the caption that just
    // ended, at whatever height that sentence needed. Anchoring to that edge put
    // the stack where a two-line box had left it and then dropped it the moment
    // the next caption came up one line short, which reads as the stack lagging
    // a page behind.
    //
    // The box is bottom-anchored and grows upwards, so its bottom edge is the
    // stable one. While it is down, anchor to where a single line would put the
    // top instead, which is where the next caption opens. A sentence that goes
    // on to wrap still lifts the stack when it wraps, exactly as in the app.
    const anchorTop = (rect: DOMRect) => {
      if (captionVisibleRef.current) {
        return rect.top;
      }
      const cs = getComputedStyle(box);
      const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.34;
      const oneLine =
        line + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      return Math.max(rect.top, rect.bottom - oneLine);
    };

    // Vertical space for the stack on one side of the live box. The gap is the
    // app's 6pt and the margin off the edge of the screen its 12pt, both at 30pt
    // of text, so both in em. The bottom edge needs no such care: it does not
    // move when the caption changes length.
    const roomFor = (above: boolean, rect: DOMRect, bounds: DOMRect) =>
      (above ? anchorTop(rect) - bounds.top : bounds.bottom - rect.bottom) -
      emSize() * 0.6;

    const boxes = () => Array.from(historyEl.children) as HTMLElement[];

    // How tall the stack's content is, measured from layout rather than read off
    // `scrollHeight`.
    //
    // A box mid-entrance carries a transform, and a transformed child widens its
    // scroll container's scrollable overflow, so during the rise `scrollHeight`
    // reports a stack up to 0.4em taller than the one that will be standing
    // there a fifth of a second later. `offsetHeight` is layout and ignores
    // transforms, so this is the height the stack will settle at, available
    // before it gets there.
    const contentHeight = () => {
      const kids = boxes();
      if (!kids.length) {
        return 0;
      }
      const gap = parseFloat(getComputedStyle(historyEl).rowGap) || 0;
      return (
        kids.reduce((sum, el) => sum + el.offsetHeight, 0) +
        gap * (kids.length - 1)
      );
    };

    // The exact scroll range, from the browser rather than from arithmetic.
    // Summing the children is off by whole pixels each, since `offsetHeight` is
    // rounded and the pills are fractionally tall, and against a full stack that
    // error compounded into several: parking on it put the scroll past the real
    // end, the browser clamped it back, and the stack snapped. `scrollHeight` is
    // exact and fractional, and only wrong while a transform is in flight, which
    // is what `rising` keeps this away from.
    const maxScroll = () =>
      Math.max(0, historyEl.scrollHeight - historyEl.clientHeight);

    // Distance between the edge nearest the live box and the end of the content
    // on that side. Zero means the newest box is flush against the live one,
    // which is where the stack parks itself. Everything is measured from that
    // edge because it is the one the reader is anchored to and the end new boxes
    // arrive at, and which edge that is depends on the side the stack took.
    const nearDistance = () =>
      placedAbove ? maxScroll() - historyEl.scrollTop : historyEl.scrollTop;

    const setNearDistance = (distance: number) => {
      const max = maxScroll();
      const clamped = Math.min(Math.max(distance, 0), max);
      selfScrolledAt = performance.now();
      historyEl.scrollTop = placedAbove ? max - clamped : clamped;
    };

    // Fade the edge that still has boxes beyond it, and only that one. Scroll to
    // the end and the fade goes with it, because a fade with nothing behind it
    // advertises content that is not there. The band is sized to the amount
    // actually hidden, so a stack overflowing by ten pixels gets a ten-pixel
    // fade rather than swallowing a whole box to announce it.
    //
    // Only the depth moves here. `is_clipped` carries the mask and is set from
    // layout in placeHistory instead: adding or removing a mask on a scroll
    // container disturbs the scroll, so toggling it on every scroll frame put
    // the fade in a fight with the gesture it was reading. A depth of zero looks
    // exactly like no mask and costs the scroller nothing.
    const updateFade = () => {
      const hidden = Math.max(0, maxScroll() - nearDistance());
      const fade = Math.min(
        emSize() * FADE_MAX,
        hidden,
        historyEl.clientHeight / 2
      );
      historyEl.style.setProperty("--fade", `${fade.toFixed(1)}px`);
    };

    // Pinned to the live box, so dragging the captions takes the stack with
    // them. Deliberately does not park the scroll: this runs on every frame the
    // stack is up, to follow a live box that moves and resizes under it, and
    // parking here is what threw the reader back to the newest box the instant
    // they scrolled away from it.
    const placeHistory = () => {
      const bounds = stage.getBoundingClientRect();
      const rect = box.getBoundingClientRect();
      const em = emSize();
      const room = roomFor(placedAbove, rect, bounds);
      const near = nearDistance();
      const was = historyEl.clientHeight;

      historyEl.style.left = `${
        ((rect.left + rect.width / 2 - bounds.left) / bounds.width) * 100
      }%`;
      if (placedAbove) {
        historyEl.style.top = "auto";
        historyEl.style.bottom = `${
          ((bounds.bottom - anchorTop(rect) + em * 0.2) / bounds.height) * 100
        }%`;
      } else {
        historyEl.style.bottom = "auto";
        historyEl.style.top = `${
          ((rect.bottom - bounds.top + em * 0.2) / bounds.height) * 100
        }%`;
      }
      // Rounded, because `room` is derived from the live box's rect and jitters
      // by fractions of a pixel as a caption is typed. Left as a float it
      // crossed the half-pixel test below on its own every few frames, and every
      // crossing was a scroll correction the reader had not asked for.
      historyEl.style.maxHeight = `${Math.max(0, Math.round(room))}px`;

      // Nowhere left to put it. Hidden rather than emptied, because the live box
      // shrinks again on the next page and the stack should still be there.
      historyEl.classList.toggle(NAMES.starved, room < em * MIN_ROOM);
      // Whether the stack can scroll at all, which changes only when a box lands
      // or the live box takes room away, never mid-gesture.
      historyEl.classList.toggle(NAMES.clipped, contentHeight() > room + 1);

      // Only a change of height disturbs the scroller; the live box merely
      // moving does not. Put the reader back the same distance from the live
      // box, so a caption growing to a second line eats the stack from the far
      // end rather than sliding it under them.
      //
      // Never mid-gesture. Somebody flicking through the stack while a caption
      // happens to resize the live box underneath is navigating, and moving the
      // content under them is the one thing that must not happen. The app draws
      // the same line with `!scroll.isScrolling`.
      if (
        Math.abs(historyEl.clientHeight - was) > 0.5 &&
        performance.now() - userScrolledAt > 400 &&
        !rising
      ) {
        setNearDistance(near);
      }

      updateFade();
    };

    // Patched in place rather than rebuilt, so a box already standing is not
    // animated again when a page closes while the key is still held: only the
    // one that just closed rises. The boxes already there are never detached,
    // because taking an element out of the document and putting it back restarts
    // a CSS animation still named on it, and leaving them alone leaves the
    // scroll position alone too.
    const paintHistory = () => {
      // Read the reader's place before the patch destroys it. Sticking to the
      // newest box is right only if that is where they already were; if they had
      // scrolled back to an older one, hold that box still instead. New text
      // arriving must not drag the page out from under someone mid-sentence.
      const wasParked = !historyEl.children.length || parked;
      const wasNear = nearDistance();
      const wasContent = contentHeight();

      // Reversed when the stack hangs below, so the newest box is the one
      // touching the live box either way.
      const ordered = placedAbove ? past : [...past].reverse();

      const living = new Set(ordered.map((page) => String(page.id)));
      boxes().forEach((el) => {
        if (!living.has(el.dataset.pid ?? "")) {
          el.remove();
        }
      });

      const risen: HTMLElement[] = [];
      ordered.forEach((page, i) => {
        const here = historyEl.children[i] as HTMLElement | undefined;
        if (here && here.dataset.pid === String(page.id)) {
          return;
        }
        const el = document.createElement("div");
        el.className = NAMES.line;
        el.dataset.pid = String(page.id);
        el.textContent = page.text;
        historyEl.insertBefore(el, here ?? null);
        risen.push(el);
      });

      placeHistory();

      // Settle the scroll while the new boxes are still sitting at their resting
      // position, before a single transform exists to widen the overflow they
      // are measured against. Parked stays parked; otherwise the box they were
      // reading holds still, which means moving with the growth that landed at
      // the near end.
      setNearDistance(wasParked ? 0 : wasNear + (contentHeight() - wasContent));
      parked = wasParked;

      // Only now do they animate. Nearest the live box first, so the stack
      // unrolls out of it: the newest box is last above the live one and first
      // below it.
      const kids = boxes();
      risen.forEach((el) => {
        const i = kids.indexOf(el);
        el.style.setProperty(
          "--rise",
          String(placedAbove ? kids.length - 1 - i : i)
        );
        rising += 1;
        el.addEventListener(
          "animationend",
          () => {
            rising = Math.max(0, rising - 1);
          },
          { once: true }
        );
        el.classList.add(NAMES.rising);
      });
    };

    // Deduplicated against the last entry, as the app's own closePage is: a page
    // can close twice in a beat, and two identical boxes read as a stutter
    // rather than as history.
    const closePage = (line: string) => {
      const trimmed = line.trim();
      const last = past[past.length - 1];
      if (!trimmed || (last && trimmed === last.text)) {
        return;
      }
      past.push({ id: ++pageId, text: trimmed });
      if (past.length > PAST_MAX) {
        past.splice(0, past.length - PAST_MAX);
      }
      if (raised) {
        paintHistory();
      }
    };

    const showHistory = (on: boolean) => {
      const want = on && past.length > 0;

      if (want) {
        // A fresh press builds the stack from nothing, so every box rises. Only
        // while the key is still held does the patch in paintHistory matter, and
        // then it is a single box that just closed joining a stack already up.
        // The app draws the same line.
        if (!raised) {
          historyEl.textContent = "";
          // Whatever was still animating went with them, and a fresh press
          // always opens against the live box.
          rising = 0;
          parked = true;
        }

        // Flip only when there is genuinely more room the other way, which is
        // what makes the stack fall below the box once the box has been dragged
        // to the top of the screen.
        const bounds = stage.getBoundingClientRect();
        const rect = box.getBoundingClientRect();
        placedAbove =
          roomFor(true, rect, bounds) >= roomFor(false, rect, bounds);
        historyEl.classList.toggle(NAMES.below, !placedAbove);
        raised = true;
        paintHistory();
      }
      // The boxes are left in place on the way out so the stack fades rather
      // than vanishing; the next press is what clears them.
      raised = want;
      historyEl.classList.toggle(NAMES.visible, want);
      setStackUp(want);
      queueHole();
    };

    // Where the pointer is, in the page's coordinates. Kept rather than the
    // hole's offset because the box moves under a still pointer far more than
    // the pointer moves over a still box: it re-centres and re-sizes on every
    // word, and the app recomputes the centre on exactly the same events for
    // exactly the same reason.
    let pointer: { x: number; y: number } | null = null;
    let holeFrame = 0;

    const paintHole = () => {
      // Shift keeps the box solid, the way it does in the app: you are about to
      // pick it up, and a hole under the hand you are picking it up with is no
      // help. The stack does too, because the stack is what is being read then.
      if (!pointer || shiftHeldRef.current || raised) {
        box.style.setProperty("--hole-x", "-999px");
        box.style.setProperty("--hole-y", "-999px");
        return;
      }
      const rect = box.getBoundingClientRect();
      box.style.setProperty("--hole-x", `${pointer.x - rect.left}px`);
      box.style.setProperty("--hole-y", `${pointer.y - rect.top}px`);
    };

    // One paint a frame at most. The box resizes on every word and the pointer
    // reports faster than that, so both feed the same queue.
    const queueHole = () => {
      if (holeFrame) {
        return;
      }
      holeFrame = requestAnimationFrame(() => {
        holeFrame = 0;
        paintHole();
        if (raised) {
          placeHistory();
        }
      });
    };

    // Follows the wheel, not just the moment the stack is built: scrolling is
    // exactly when the amount hidden at each edge changes. One update a frame,
    // because this writes a property and then measures, and doing that on every
    // scroll event is how a handler starts costing more than the scroll.
    let fadeFrame = 0;
    const onScroll = () => {
      if (performance.now() - selfScrolledAt > 60) {
        userScrolledAt = performance.now();
        // Only worth reading between entrances, when the geometry is honest.
        if (!rising) {
          parked = nearDistance() < 1;
        }
      }
      if (fadeFrame) {
        return;
      }
      fadeFrame = requestAnimationFrame(() => {
        fadeFrame = 0;
        updateFade();
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      pointer = { x: event.clientX, y: event.clientY };
      queueHole();
    };
    // Nothing to turn off: the falloff means distance alone ends the reveal, on
    // this screen as on a real one. This is only for the pointer that leaves in
    // one jump, or out of the window entirely.
    const onPointerLeave = () => {
      pointer = null;
      queueHole();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // Held keys repeat, and a repeat that repainted would restart the stagger
      // over and over for as long as the key is down.
      if (event.key === "Alt" && !event.repeat) {
        showHistory(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") {
        showHistory(false);
      }
    };
    // Tabbing away with the key down would otherwise leave the stack up forever,
    // the same reason the shift handler above watches blur.
    const onBlur = () => showHistory(false);

    closePageRef.current = closePage;
    queueHoleRef.current = queueHole;

    historyEl.addEventListener("scroll", onScroll);
    screen.addEventListener("pointermove", onPointerMove);
    screen.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    // The box changes width on almost every word, which moves its left edge by
    // most of the box. Without this the hole lands off the pointer until the
    // pointer next moves, and reads as the reveal blinking out.
    const sizes =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => queueHole())
        : null;
    sizes?.observe(box);

    return () => {
      closePageRef.current = null;
      queueHoleRef.current = null;
      historyEl.removeEventListener("scroll", onScroll);
      screen.removeEventListener("pointermove", onPointerMove);
      screen.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      sizes?.disconnect();
      cancelAnimationFrame(holeFrame);
      cancelAnimationFrame(fadeFrame);
    };
  }, []);

  // ── moving the windows ───────────────────────────────────────────────────
  //
  // By the title bar, as on a real desktop, and no modifier: the window comes
  // forward as you take hold of it and cannot be dropped over an edge. Once
  // dragged, a window is placed in fractions of the screen rather than by the
  // insets it started with, so it keeps its size and its spot at any width.

  const startWindowDrag = useCallback(
    (app: AppId, index: number) => (event: ReactPointerEvent<HTMLElement>) => {
      const stage = stageRef.current?.getBoundingClientRect();
      const node = event.currentTarget.parentElement;
      // Mouse only. On a phone the title bar is inside a page you are trying to
      // scroll, and a drag that starts there would take the window with you,
      // or eat the scroll. Tapping a window still brings it forward.
      if (event.pointerType !== "mouse" || !stage || !node) {
        return;
      }
      event.preventDefault();
      capture(event);

      const box = node.getBoundingClientRect();
      const place = {
        left: (box.left - stage.left) / stage.width,
        top: (box.top - stage.top) / stage.height,
        width: box.width / stage.width,
        height: box.height / stage.height,
      };
      windowGrabRef.current = {
        app,
        x: (event.clientX - box.left) / stage.width,
        y: (event.clientY - box.top) / stage.height,
        place,
        handle: event.currentTarget,
        pointerId: event.pointerId,
      };
      setDraggedWindow(app);
      setPlaced((at) => ({ ...at, [app]: place }));
      // Taking hold of a window raises it, which here means playing its scene.
      jumpTo(index, true);
    },
    [jumpTo]
  );

  const dragWindow = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const grab = windowGrabRef.current;
    const stage = stageRef.current?.getBoundingClientRect();
    if (!grab || !stage) {
      return;
    }
    const { place } = grab;
    // Sideways and downwards a window can go where it likes and be clipped by
    // the screen, which is what happens on a desktop. Upwards it stops at the
    // top of the stage, which is the underside of the menu bar: on a Mac you
    // cannot push a window up behind it either.
    setPlaced((at) => ({
      ...at,
      [grab.app]: {
        ...place,
        left: (event.clientX - stage.left) / stage.width - grab.x,
        top: Math.max(0, (event.clientY - stage.top) / stage.height - grab.y),
      },
    }));
  }, []);

  const endWindowDrag = useCallback(() => {
    const grab = windowGrabRef.current;
    if (grab?.handle.hasPointerCapture(grab.pointerId)) {
      // Ending a drag the pointer has not finished: let go of it, or the button
      // still being down would keep feeding this window moves it should not get.
      grab.handle.releasePointerCapture(grab.pointerId);
    }
    windowGrabRef.current = null;
    setDraggedWindow(null);
  }, []);

  // A window you are holding stops being yours when the demo moves on: the loop
  // reaches the next scene, brings another window forward, and the one under the
  // cursor is now behind it. Carrying on dragging it there would be dragging a
  // window nobody is looking at. The scene the drag itself asked for does not
  // count, which is what the app check is for.
  useEffect(() => {
    if (draggedWindow && SCENES[scene]?.app !== draggedWindow) {
      endWindowDrag();
    }
  }, [draggedWindow, endWindowDrag, scene]);

  // The box holds its place as a fraction of the screen, but its own size does
  // not scale with the demo in lockstep, the caption has a floor, so a resize
  // can leave it hanging over an edge. Put it back inside.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !spot) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setSpot((at) => (at ? insideStage(at.x, at.y) : at));
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [insideStage, spot]);

  const played = Math.round((elapsed / TOTAL) * WAVE.length);

  // A window is a way into its own scene. The one in front is already there, so
  // it does nothing; the others come forward when clicked. Mouse-only on
  // purpose: the screen is hidden from assistive tech, and the scene buttons
  // under it are the same three destinations, as buttons.
  const windowProps = (app: AppId, place: string | undefined) => {
    const index = SCENES.findIndex((item) => item.app === app);
    const spotted = placed[app];
    return {
      className: cx(
        styles.demo_window,
        place,
        front === app && styles.is_front,
        front !== app && styles.is_reachable,
        (callPlaying ? app === "meeting" : app === "player") &&
          styles.is_playing,
        draggedWindow === app && styles.is_held
      ),
      onClick: () => jumpTo(index, true),
      // Placed by its own corner once dragged, rather than by the insets it
      // was born with; the size comes along so it doesn't reflow mid-drag.
      // --z rides along either way: it is the focus order, not the geometry.
      style: {
        ["--z"]: stack.indexOf(app) + 1,
        ...(spotted
          ? {
              height: `${spotted.height * 100}%`,
              inset: "auto",
              left: `${spotted.left * 100}%`,
              top: `${spotted.top * 100}%`,
              width: `${spotted.width * 100}%`,
            }
          : {}),
      } as CSSProperties,
    };
  };

  /** The title bar is the handle, the way it is on a real window. */
  const titlebarProps = (app: AppId) => ({
    className: styles.titlebar,
    onPointerDown: startWindowDrag(
      app,
      SCENES.findIndex((item) => item.app === app)
    ),
    onPointerMove: dragWindow,
    onPointerUp: endWindowDrag,
    onPointerCancel: endWindowDrag,
    // The pointer being taken away rather than let go, released off the page,
    // or claimed by something else. Without this the window stays grabbed and
    // follows the cursor with no button held.
    onLostPointerCapture: endWindowDrag,
  });

  return (
    <div ref={rootRef} className={styles.demo}>
      {/* The screen is decorative through and through: the captions are a
          scripted loop, not content, and the windows are drawings of apps.
          Screen readers get the page copy, and the scene buttons below, which
          are the only part of this anybody can operate. */}
      <div ref={screenRef} className={styles.screen} aria-hidden="true">
        <div className={styles.menubar}>
          <span />
          <span className={styles.mb_right}>
            <span className={cx(styles.mb_glyph, styles.is_live)}>
              <svg viewBox="0 0 16 14" fill="currentColor">
                <path d="M8 0C12.4183 3.45921e-08 16 2.76601 16 6.17773C15.9998 9.58934 12.4182 12.3545 8 12.3545C7.95891 12.3545 7.91789 12.3549 7.87695 12.3545C7.2354 12.3471 6.62608 12.6326 6.12207 13.0293C5.08323 13.847 3.98202 14.2713 2.6416 13.8018C2.18877 13.6432 2.26424 13.0289 2.6416 12.8965C3.14721 12.719 3.16134 12.5345 3.35254 11.9893C3.49999 11.5685 3.22962 11.1513 2.85547 10.9082C1.10992 9.77516 9.73494e-05 8.07645 0 6.17773C0 2.76601 3.58172 0 8 0ZM3.53027 7.03613C3.19866 7.03637 2.9298 7.30507 2.92969 7.63672C2.92969 7.96846 3.19858 8.23805 3.53027 8.23828H8.21289C8.54478 8.23828 8.81445 7.96861 8.81445 7.63672C8.81434 7.30493 8.54471 7.03613 8.21289 7.03613H3.53027ZM10.416 7.03613C10.0843 7.03626 9.81554 7.305 9.81543 7.63672C9.81543 7.96853 10.0842 8.23816 10.416 8.23828H11.9189C12.2507 8.23809 12.5195 7.96849 12.5195 7.63672C12.5194 7.30504 12.2506 7.03632 11.9189 7.03613H10.416ZM3.53027 4.65723C3.19868 4.65742 2.9299 4.92622 2.92969 5.25781C2.92969 5.58958 3.19855 5.85918 3.53027 5.85938H6.18457C6.51646 5.85938 6.78613 5.5897 6.78613 5.25781C6.78592 4.92611 6.51633 4.65723 6.18457 4.65723H3.53027ZM8.36328 4.65723C8.03152 4.65723 7.76291 4.92611 7.7627 5.25781C7.7627 5.5897 8.03139 5.85938 8.36328 5.85938H13.0703C13.4022 5.85938 13.6719 5.5897 13.6719 5.25781C13.6717 4.92611 13.4021 4.65723 13.0703 4.65723H8.36328Z" />
              </svg>
              <span className={styles.mb_dot} />
            </span>
            <span className={styles.mb_time}>{clock}</span>
          </span>
        </div>

        <div ref={stageRef} className={styles.stage}>
          {/* 1 · the call */}
          <div {...windowProps("meeting", styles.win_meeting)}>
            <div {...titlebarProps("meeting")}>
              <span className={styles.lights}>
                <i className={styles.l_close} />
                <i className={styles.l_min} />
                <i className={styles.l_max} />
              </span>
              <span className={styles.win_title}>Weekly sync · 4 people</span>
            </div>
            <div className={styles.win_content}>
              <div className={styles.meet_grid}>
                {PEOPLE.map((person, index) => (
                  <span
                    key={person.initials}
                    className={cx(
                      styles.tile,
                      callPlaying && speaking === index && styles.is_speaking
                    )}
                  >
                    <i className={cx(styles.face, person.face)}>
                      {person.initials}
                    </i>
                    <em>{person.name}</em>
                  </span>
                ))}
              </div>
              <div className={styles.meet_bar}>
                <span className={styles.meet_btn}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14.5a3.2 3.2 0 0 0 3.2-3.2V5.6a3.2 3.2 0 1 0-6.4 0v5.7a3.2 3.2 0 0 0 3.2 3.2z" />
                    <path d="M17.8 11a.9.9 0 1 1 1.8 0 7.6 7.6 0 0 1-6.7 7.5v2a.9.9 0 1 1-1.8 0v-2A7.6 7.6 0 0 1 4.4 11a.9.9 0 1 1 1.8 0 5.8 5.8 0 0 0 11.6 0z" />
                  </svg>
                </span>
                <span className={styles.meet_btn}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2.6" y="6.4" width="12.6" height="11.2" rx="2.4" />
                    <path d="M16.8 11.2l3.6-2.6a.7.7 0 0 1 1.1.6v5.6a.7.7 0 0 1-1.1.6l-3.6-2.6z" />
                  </svg>
                </span>
                <span className={cx(styles.meet_btn, styles.is_leave)}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 9.3c-2.6 0-5 .5-7 1.4v3a1.4 1.4 0 0 0 2.2 1.1l1.6-1.2c.4-.3.6-.7.6-1.2v-1a15 15 0 0 1 5.2 0v1c0 .5.2 1 .6 1.2l1.6 1.2a1.4 1.4 0 0 0 2.2-1.1v-3c-2-.9-4.4-1.4-7-1.4z" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* 2 · what you switch to */}
          <div {...windowProps("notes", styles.win_notes)}>
            <div {...titlebarProps("notes")}>
              <span className={styles.lights}>
                <i className={styles.l_close} />
                <i className={styles.l_min} />
                <i className={styles.l_max} />
              </span>
              <span className={styles.win_title}>Notes · Weekly sync</span>
            </div>
            <div className={styles.win_content}>
              <div className={styles.notes_body}>
                <div className={styles.notes_side}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <i
                      key={index}
                      className={cx(index === 1 && styles.is_on)}
                    />
                  ))}
                </div>
                <div className={styles.notes_doc}>
                  <b>Weekly sync</b>
                  {NOTE_LINES_TOP.map((width, index) => (
                    <i key={index} style={{ width }} />
                  ))}
                  <b className={styles.sub}>Actions</b>
                  {NOTE_LINES_BOTTOM.map((width, index) => (
                    <i key={index} style={{ width }} />
                  ))}
                  <span className={styles.notes_caret} />
                </div>
              </div>
            </div>
          </div>

          {/* 3 · the podcast */}
          <div {...windowProps("player", styles.win_player)}>
            <div {...titlebarProps("player")}>
              <span className={styles.lights}>
                <i className={styles.l_close} />
                <i className={styles.l_min} />
                <i className={styles.l_max} />
              </span>
              <span className={styles.win_title}>Interview · Episode 42</span>
            </div>
            <div className={styles.win_content}>
              <div className={styles.scene} />

              {/* Laid out the way a desktop music app is: library rail down the
                  left, what you are listening to in the middle, and the
                  transport across the bottom. Nobody's branding and nobody's
                  green, though: the accent is the app's own. */}
              <div className={styles.pod}>
                <div className={styles.pod_side}>
                  <i className={styles.pod_nav} />
                  <i className={styles.pod_nav} />
                  <i className={cx(styles.pod_nav, styles.is_on)} />
                  <span className={styles.pod_sep} />
                  <i className={styles.pod_item} />
                  <i className={styles.pod_item} />
                  <i className={styles.pod_item} />
                  <i className={styles.pod_item} />
                </div>

                <div className={styles.pod_main}>
                  <div className={styles.pod_head}>
                    <span className={styles.pod_art} />
                    <span className={styles.pod_meta}>
                      <em>Podcast</em>
                      <b>The Long Way Round</b>
                      <i>Episode 42 · Ana Ferreira</i>
                    </span>
                  </div>
                  <div className={styles.pod_wave}>
                    {WAVE.map((height, index) => (
                      <i
                        key={index}
                        className={cx(index < played && styles.is_played)}
                        style={
                          {
                            "--i": index,
                            "--h": `${height}%`,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                  <div className={styles.pod_list}>
                    {EPISODES.map((episode) => (
                      <span key={episode.length} className={styles.pod_ep}>
                        <i style={{ "--w": episode.width } as CSSProperties} />
                        <em>{episode.length}</em>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.win_controls}>
                <span className={styles.np_now}>
                  <span className={styles.np_art} />
                  <span className={styles.np_text}>
                    <b>Episode 42</b>
                    <i>Ana Ferreira</i>
                  </span>
                </span>
                <span className={styles.np_transport}>
                  <svg
                    className={styles.np_skip}
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M10.6 1.4v9.2a.5.5 0 0 1-.78.42L4.4 7.3v3.3a.5.5 0 0 1-.78.42L.9 9.1V2.9l2.72-1.92a.5.5 0 0 1 .78.42v3.3L9.82.98a.5.5 0 0 1 .78.42z" />
                  </svg>
                  <span className={styles.ctl_play}>
                    <svg viewBox="0 0 12 14" fill="currentColor">
                      <path d="M1 1.2v11.6a.6.6 0 0 0 .92.5l9.2-5.8a.6.6 0 0 0 0-1L1.92.7A.6.6 0 0 0 1 1.2z" />
                    </svg>
                  </span>
                  <svg
                    className={styles.np_skip}
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M1.4 1.4v9.2a.5.5 0 0 0 .78.42L7.6 7.3v3.3a.5.5 0 0 0 .78.42L11.1 9.1V2.9L8.38.98a.5.5 0 0 0-.78.42v3.3L2.18.98a.5.5 0 0 0-.78.42z" />
                  </svg>
                </span>
                <span className={styles.ctl_time}>{mmss(elapsed)}</span>
                <span className={styles.ctl_track}>
                  <i
                    style={{
                      width: `${((elapsed / TOTAL) * 100).toFixed(2)}%`,
                    }}
                  />
                </span>
                <span className={styles.ctl_time}>41:07</span>
              </div>
            </div>
          </div>

          {/* ⌘-tab */}
          <div
            className={cx(
              styles.switcher,
              switcherVisible && styles.is_visible
            )}
          >
            <span
              className={cx(
                styles.sw_app,
                selected === "meeting" && styles.is_selected
              )}
            >
              <span className={cx(styles.sw_icon, styles.i_meet)}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2.6" y="6.4" width="12.6" height="11.2" rx="2.6" />
                  <path d="M16.8 11.2l3.6-2.6a.7.7 0 0 1 1.1.6v5.6a.7.7 0 0 1-1.1.6l-3.6-2.6z" />
                </svg>
              </span>
              <span className={styles.sw_name}>{APPS["meeting"]}</span>
            </span>
            <span
              className={cx(
                styles.sw_app,
                selected === "notes" && styles.is_selected
              )}
            >
              <span className={cx(styles.sw_icon, styles.i_notes)}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4.6" y="3" width="14.8" height="18" rx="2.6" />
                  <g fill="#b07d18">
                    <rect x="7.4" y="7" width="9.2" height="1.7" rx="0.85" />
                    <rect x="7.4" y="11" width="9.2" height="1.7" rx="0.85" />
                    <rect x="7.4" y="15" width="5.6" height="1.7" rx="0.85" />
                  </g>
                </svg>
              </span>
              <span className={styles.sw_name}>{APPS["notes"]}</span>
            </span>
            <span
              className={cx(
                styles.sw_app,
                selected === "player" && styles.is_selected
              )}
            >
              <span className={cx(styles.sw_icon, styles.i_player)}>
                {/* Badge and mark in one SVG on purpose, see the note in the
                    stylesheet. Drawn as two elements they drifted apart by a
                    pixel as the panel finished scaling. */}
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle
                    cx="12"
                    cy="12"
                    r="7.68"
                    fill="rgba(255,255,255,0.95)"
                    stroke="none"
                  />
                  <path
                    transform="translate(11.478 12) scale(.5) translate(-12 -12)"
                    d="M8.4 5.8v12.4a.8.8 0 0 0 1.22.68l9.8-6.2a.8.8 0 0 0 0-1.36l-9.8-6.2a.8.8 0 0 0-1.22.68z"
                  />
                </svg>
              </span>
              <span className={styles.sw_name}>{APPS["player"]}</span>
            </span>
          </div>

          {/* The stack of closed captions. A sibling of the live box rather
              than a child, for the reason the app gives for making its stack a
              second panel: the live box carries the pointer reveal, a mask
              applies to a whole subtree, and a stack inside the box would
              dissolve along with it.

              Empty on purpose. Its boxes are put here by the effect above, and
              because neither the class nor the style ever changes as a prop,
              React never writes to this node again after it mounts. */}
          <div ref={historyRef} className={styles.history} />

          <div
            ref={overlayRef}
            className={cx(
              styles.overlay,
              captionVisible && styles.is_visible,
              shiftHeld && styles.is_movable,
              stackUp && styles.is_solid,
              dragging && styles.is_dragging
            )}
            // Once moved it is placed by its centre, which is also how it is
            // dragged and how it is kept inside the screen.
            style={
              spot
                ? {
                    bottom: "auto",
                    left: `${spot.x * 100}%`,
                    top: `${spot.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }
                : undefined
            }
            onPointerDown={startDrag}
            onPointerMove={onDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
          >
            <span>{committed}</span>
            <span className={styles.tentative}>{tentative}</span>
          </div>
        </div>
      </div>

      {/* One segment per scene: how far through the loop is, and a way out of
          waiting for it. Each one jumps to the top of its scene; the one already
          playing does nothing. */}
      <div className={styles.scenes}>
        {SCENES.map((item, index) => (
          <button
            key={item.app}
            type="button"
            className={cx(
              styles.scene_button,
              index === scene && styles.is_current
            )}
            aria-current={index === scene ? "true" : undefined}
            onClick={() => jumpTo(index)}
          >
            <span className={styles.scene_track}>
              <span
                className={styles.scene_fill}
                style={{
                  transform: `scaleX(${
                    index < scene ? 1 : index === scene ? progress.value : 0
                  })`,
                  transitionDuration: `${index === scene ? progress.ms : 0}ms`,
                }}
              />
            </span>
            <span className={styles.scene_label}>{item.label}</span>
          </button>
        ))}
      </div>

      <p className={styles.caption}>
        Switch apps and the captions stay: the overlay is above every window,
        and lets clicks through.
      </p>
      <p className={styles.caption}>
        Click a window to bring it forward. Hold <kbd>⇧</kbd> and drag the
        captions to move them, as you would in the app.
      </p>
      {/* Says nothing to a phone, and is hidden from one by the stylesheet. */}
      <p className={cx(styles.caption, styles.caption_try)}>
        Point at the captions and they dissolve under you. Hold <kbd>⌥</kbd> to
        stack the last few back up. Both work here exactly as they do in the
        app.
      </p>
    </div>
  );
};
