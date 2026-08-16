import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";

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
  lines: string[];
};

const SCENES: Scene[] = [
  {
    app: "meeting",
    lines: [
      "Universal subtitles for any app, live on your Mac.",
      "In a meeting, second language or not, one missed word costs you the next three.",
      "So the captions run live, over the call, while people are still talking.",
    ],
  },
  {
    app: "notes",
    lines: [
      "Switch to your notes and the meeting carries on without you watching it.",
      "The overlay stays above every window, so you keep the thread.",
    ],
  },
  {
    app: "player",
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

const NOTE_LINES_TOP = ["92%", "78%", "85%", "44%"];
const NOTE_LINES_BOTTOM = ["88%", "73%", "81%", "52%", "86%", "38%"];

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

/** Thrown to unwind the scene loop when the component goes away. */
const CANCELLED = Symbol("cancelled");

export const SubtitlesDemo = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [clock, setClock] = useState("");
  const [front, setFront] = useState<AppId>(SCENES[0]?.app ?? "meeting");
  const [selected, setSelected] = useState<AppId>(SCENES[0]?.app ?? "meeting");
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [speaking, setSpeaking] = useState(0);
  const [elapsed, setElapsed] = useState(START);
  const [committed, setCommitted] = useState("");
  const [tentative, setTentative] = useState("");
  const [captionVisible, setCaptionVisible] = useState(false);

  // The loop parks on `paused` instead of returning, because restarting it on
  // every scroll-back stacked a second copy on top of the first and the two
  // raced the caption text.
  const pausedRef = useRef(false);
  const onScreenRef = useRef(true);

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
    if (front !== "meeting" || reducedMotion) {
      return;
    }
    setSpeaking(0);
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
  }, [front, reducedMotion]);

  // The playhead. Every visit to the scene starts from the same place.
  useEffect(() => {
    if (front !== "player" || reducedMotion) {
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
  }, [front, reducedMotion]);

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

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, ms);
        timers.add(timer);
      });

    const step = async (ms: number) => {
      await wait(ms);
      while (pausedRef.current && !cancelled) {
        await wait(150);
      }
      if (cancelled) {
        throw CANCELLED;
      }
    };

    // One subtitle box: types out, holds long enough to read, clears. The app
    // pages the same way, and shows the newest word dim until it commits.
    const say = async (line: string) => {
      const words = line.split(" ");
      setCommitted("");
      setTentative("");
      setCaptionVisible(true);

      for (let i = 0; i < words.length; i++) {
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

      await step(holdFor(words.length));
      setCaptionVisible(false);
      await step(GAP_MS);
    };

    // ⌘-tab: panel up on the current app, selection moves, window fronts as the
    // panel drops — which is when you'd release the key.
    const switchTo = async (from: AppId, to: AppId) => {
      setSelected(from);
      setSwitcherVisible(true);
      await step(340);
      setSelected(to);
      await step(560);
      setFront(to);
      setSwitcherVisible(false);
      await step(220);
    };

    const loop = async () => {
      let showing = firstScene.app;

      for (let i = 0; ; i = (i + 1) % SCENES.length) {
        const scene = SCENES[i];
        const opener = scene?.lines[0];
        if (!scene || !opener) {
          return;
        }

        if (scene.app !== showing) {
          if (i === 0) {
            // Coming back round to the top. This one switch runs on its own,
            // with the captions starting after it lands, so the loop reads as
            // beginning again rather than as a first line that started while
            // the previous scene's window was still in front.
            await switchTo(showing, scene.app);
            showing = scene.app;
            await say(opener);
          } else {
            // Deliberately concurrent: the caption keeps running straight
            // through the app switch, which is the whole point being made.
            await Promise.all([say(opener), switchTo(showing, scene.app)]);
            showing = scene.app;
          }
        } else {
          await say(opener);
        }

        for (let j = 1; j < scene.lines.length; j++) {
          await say(scene.lines[j] ?? "");
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
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [reducedMotion]);

  const played = Math.round((elapsed / TOTAL) * WAVE.length);

  const windowClass = (app: AppId) =>
    cx(styles.demo_window, front === app && styles.is_front);

  return (
    // Decorative through and through: the captions are a scripted loop, not
    // content, and the windows are drawings of apps. Screen readers get the
    // page copy instead.
    <div ref={rootRef} className={styles.demo} aria-hidden="true">
      <div className={styles.screen}>
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

        <div className={styles.stage}>
          <div className={styles.desktop} />

          {/* 1 · the call */}
          <div className={cx(windowClass("meeting"), styles.win_meeting)}>
            <div className={styles.titlebar}>
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
                      front === "meeting" &&
                        !reducedMotion &&
                        speaking === index &&
                        styles.is_speaking
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
          <div className={cx(windowClass("notes"), styles.win_notes)}>
            <div className={styles.titlebar}>
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
          <div className={cx(windowClass("player"), styles.win_player)}>
            <div className={styles.titlebar}>
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
            </span>
            <span className={styles.sw_name}>{APPS[selected]}</span>
          </div>

          <div
            className={cx(styles.overlay, captionVisible && styles.is_visible)}
          >
            <span>{committed}</span>
            <span className={styles.tentative}>{tentative}</span>
          </div>
        </div>
      </div>
      <p className={styles.caption}>
        Switch apps and the captions stay: the overlay is above every window,
        and lets clicks through. In the app itself, holding <kbd>⇧</kbd> lets
        you move it.
      </p>
    </div>
  );
};
