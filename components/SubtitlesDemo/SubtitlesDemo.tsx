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
 * that is the whole point being made — the overlay belongs to the screen, not
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
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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
  // centre sits at — not pixels, so it keeps its place when the demo resizes.
  // Null until somebody moves it, which leaves the CSS to place it.
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  /** Where in the box the drag started, so it doesn't jump to the cursor. */
  const grabRef = useRef<{ x: number; y: number } | null>(null);
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
  // is reaching for that window — the machinery in between would be in the way.
  const jumpRef = useRef<{ index: number; direct: boolean } | null>(null);
  // Cuts every wait the loop is sitting in short. Without it a click landed
  // whenever the current wait happened to end, and a finished caption holds for
  // up to 4.2 seconds — long enough to read as nothing having happened.
  const wakeRef = useRef<(() => void) | null>(null);
  // Which window is actually in front, updated at the moment it fronts. The loop
  // used to carry this in a local it only assigned once a switch had finished,
  // so a switch interrupted by a second click left it a window behind: the next
  // ⌘-tab panel then opened on the wrong app and skipped over the real one.
  const frontRef = useRef<AppId>(SCENES[0]?.app ?? "meeting");

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
      setCaptionVisible(true);
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
    // The bar is walked across it in two moves — one for the typing, one for the
    // hold — because those are the only two moments the loop knows how long the
    // next stretch will take. The second starts from wherever the first actually
    // got to, so the jitter in the typing corrects itself rather than piling up.
    const say = async (line: string, from: number, to: number) => {
      const words = line.split(" ");
      const hold = holdFor(words.length);
      const typing = words.length * (WORD_MS + JITTER / 2);
      const typed = from + (to - from) * (typing / (typing + hold + GAP_MS));

      setCommitted("");
      setTentative("");
      setCaptionVisible(true);
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
      setCaptionVisible(false);
      await step(GAP_MS);
    };

    // ⌘-tab: panel up on the current app, selection moves, window fronts as the
    // panel drops — which is when you'd release the key.
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
          setCaptionVisible(false);
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
  }, [reducedMotion, showApp]);

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
        // No loop to unwind — the scene is just what is on screen.
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
    const down = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setShiftHeld(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setShiftHeld(false);
      }
    };
    // Tabbing away with the key down would otherwise leave it armed forever.
    const clear = () => setShiftHeld(false);

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
      // Mouse only, as with the windows — and shift is a key nobody holds on a
      // phone anyway.
      if (event.pointerType !== "mouse" || !event.shiftKey || !stage || !box) {
        return;
      }
      event.preventDefault();
      // Captured, so the box keeps receiving the pointer once it leaves it —
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
      // scroll, and a drag that starts there would take the window with you —
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
  // not scale with the demo in lockstep — the caption has a floor — so a resize
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
    // The pointer being taken away rather than let go — released off the page,
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
      <div className={styles.screen} aria-hidden="true">
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
                {/* Badge and mark in one SVG on purpose — see the note in the
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

          <div
            ref={overlayRef}
            className={cx(
              styles.overlay,
              captionVisible && styles.is_visible,
              shiftHeld && styles.is_movable,
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
        and lets clicks through — click a window to bring it forward. Hold{" "}
        <kbd>⇧</kbd> and drag the captions to move them, as you would in the
        app.
      </p>
    </div>
  );
};
