// Regenerates the gallery card clips, their posters and the OG stills for the
// audio borealis page (/design-engineering/audio-borealis).
//
//   node scripts/capture-audio-borealis-media.mjs            # everything
//   node scripts/capture-audio-borealis-media.mjs light      # one theme
//   node scripts/capture-audio-borealis-media.mjs light og   # one theme, stills only
//   node scripts/capture-audio-borealis-media.mjs dark video # one theme, clip and poster
//   node scripts/capture-audio-borealis-media.mjs dark encode # cut the kept recording again, no new take
//   BOREALIS_WEBP_OUT=../audio-borealis/media/demo-dark.webp node scripts/capture-audio-borealis-media.mjs dark encode
//                                                            # and an animated WebP of the same cut, for the package's README
//
// Needs ffmpeg on the PATH, Chrome installed, and the site running: the demo
// is a React component and only exists once the page is served. Point
// BOREALIS_SITE at whichever origin is running it.
//
// What it films is the stage: the desk and the caption box on it, playing
// the recording, since the recording loops and the mock voice does not. The
// clip is a screen recording of a real Chrome window, made by macOS's own
// screencapture, rather than Chrome's screencast over the devtools protocol:
// the screencast stops presenting the box's canvas for a quarter second
// every time the box shrinks or changes height, which is every caption, and
// the screen recording shows what the display shows, which is smooth. The
// page carries a marker strip under the stage that the capture turns white
// on the frame the clip opens on, the box faded in with "Audio Borealis"
// written, and again on the frame that same caption comes round a loop
// later, so the recording is cut between the two marks, exactly, and loops
// without a seam. The poster is the clip's own first frame, so the card's
// still and its first painted frame are the same image, and the OG still is
// the first line just said in full with the glow still up under it.
//
// The window is put at the top left of the main display, in front, for the
// length of a round per theme: do not cover it while it records.
//
// The stage is drawn at the card's own proportions, so nothing has to be
// restyled to fill the frame beyond hiding the rest of the page and taking
// the boxes off the ancestors between the stage and the body.
//
// Frames come off a CDP screencast as PNG rather than through Playwright's own
// recorder: the recorder needs a bundled ffmpeg that isn't installed here, and
// PNG keeps the pixels lossless until the single h264 pass at the end.

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SITE =
  process.env.BOREALIS_SITE ??
  "http://localhost:3000/design-engineering/audio-borealis";

const OUT =
  process.env.BOREALIS_MEDIA_OUT ??
  join(ROOT, "public", "media", "design-engineering", "audio-borealis");
/** Where the screen recordings themselves are kept, uncut, for a re-encode
    without another take: exports/ is ignored by git. */
const SOURCES =
  process.env.BOREALIS_SOURCE_OUT ?? join(ROOT, "exports", "audio-borealis");

const THEMES = process.argv[2] ? [process.argv[2]] : ["light", "dark"];
/** "og", "video", "encode" (the clip from the kept recording), or neither for both. */
const MODE = process.argv[3] ?? "both";

const CARD = { width: 990, height: 500 }; // ×2 for the 1980×1000 the cards use
const OG = { width: 1200, height: 630 };

/** Where the window goes on the display, and how far the stage sits in from
    its edges, clear of the window's rounded corners. */
const WINDOW = { x: 40, y: 60, inset: 20 };
/** The marker strip under the stage, in CSS px: cut off the clip after. */
const MARK_HEIGHT = 4;
/** Seconds the screen recording runs: a round of the recording plus room to
    pick it and to close on the loop. */
const RECORD_S = 44;
/** How long after the last word lands the still is taken and the clip begins:
    the voice is still "speaking" for 450ms after a word, and the glow takes a
    while to come down after that, so this is well inside the glow. */
const SETTLE_MS = 150;

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });

/**
 * Keep the stage and nothing else, filling the frame edge to edge.
 *
 * Inline styles rather than a rewritten DOM: the component is live for the
 * rest of the capture and its observers are watching the stage, which a
 * reparented tree would break.
 */
const isolate = () => {
  const stage = document.querySelector('[class*="AudioBorealisDemo_stage__"]');
  if (!stage) {
    throw new Error("the stage isn't on the page");
  }

  document.querySelectorAll("body *").forEach((node) => {
    if (!node.contains(stage) && !stage.contains(node)) {
      node.style.display = "none";
    }
  });

  for (
    let node = stage.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    node.style.cssText +=
      ";margin:0!important;padding:0!important;border:0!important;" +
      "border-radius:0!important;box-shadow:none!important;background:none!important;" +
      "max-width:none!important;width:100%!important;height:100%!important;" +
      "display:block!important;overflow:visible!important;position:static!important;";
  }

  const style = document.createElement("style");
  style.textContent = `
    html, body {
      height: 100% !important;
      margin: 0 !important;
      overflow: hidden !important;
      padding: 0 !important;
    }
    [class*="AudioBorealisDemo_stage__"] {
      aspect-ratio: auto !important;
      border: 0 !important;
      border-radius: 0 !important;
      height: 100% !important;
      margin: 0 !important;
      width: 100% !important;
    }
  `;
  document.head.appendChild(style);
};

/**
 * For the screen recording: the stage at the card's size, inset from the
 * window's edges, and the marker strip right under it. Everything else is
 * hidden as isolate() hides it.
 */
const isolateForScreen = ({ width, height, inset, mark }) => {
  const stage = document.querySelector('[class*="AudioBorealisDemo_stage__"]');
  if (!stage) {
    throw new Error("the stage isn't on the page");
  }
  document.querySelectorAll("body *").forEach((node) => {
    if (!node.contains(stage) && !stage.contains(node)) {
      node.style.display = "none";
    }
  });
  for (
    let node = stage.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    node.style.cssText +=
      ";margin:0!important;padding:0!important;border:0!important;" +
      "max-width:none!important;width:auto!important;height:auto!important;" +
      "display:block!important;position:static!important;";
  }
  const style = document.createElement("style");
  style.textContent = `
    html, body {
      background: #000 !important;
      height: 100% !important;
      margin: 0 !important;
      overflow: hidden !important;
      padding: 0 !important;
    }
    [class*="AudioBorealisDemo_stage__"] {
      aspect-ratio: auto !important;
      border: 0 !important;
      border-radius: 0 !important;
      height: ${height}px !important;
      left: ${inset}px !important;
      margin: 0 !important;
      position: fixed !important;
      top: ${inset}px !important;
      width: ${width}px !important;
    }
  `;
  document.head.appendChild(style);
  const strip = document.createElement("div");
  strip.id = "__mark";
  strip.style.cssText =
    `position:fixed;left:${inset}px;top:${inset + height}px;` +
    `width:${width}px;height:${mark}px;background:#000;z-index:99`;
  document.body.appendChild(strip);
};

/**
 * Watch the recording play from inside the page, a frame at a time, and
 * flag the clip's two ends on the marker strip: white for a few frames when
 * the box is faded all the way in with "Audio Borealis" written, and white
 * again when that same caption comes round after the last line. Resolves
 * once the second mark is down.
 */
const markRound = () =>
  new Promise((resolve, reject) => {
    const strip = document.getElementById("__mark");
    const read = () => {
      const box = document.querySelector(
        '[class*="AudioBorealisDemo_caption__"]'
      );
      const said =
        box?.querySelector('[class*="AudioBorealisDemo_cap_text__"] > span')
          ?.textContent ?? "";
      const next =
        box?.querySelector('[class*="AudioBorealisDemo_tentative__"]')
          ?.textContent ?? "";
      const who =
        box?.querySelector('[class*="AudioBorealisDemo_cap_name__"]')
          ?.textContent ?? "";
      return {
        said: said.trim(),
        next: next.trim(),
        who: who.trim(),
        opaque: box ? getComputedStyle(box).opacity === "1" : false,
      };
    };
    const deadline = performance.now() + 90000;
    let opening = null;
    let movedOn = false;
    let lastLineSeen = false;
    let holdUntil = 0;
    // Armed only once the recording's own first word is up on its own: the
    // box names the recording a frame or two before its captions replace
    // the mock voice's, and the mock voice's first line opens on the same
    // two words.
    let phase = "arming";
    const tick = (now) => {
      if (now > deadline) {
        reject(
          new Error("the recording never came round to its opening again")
        );
        return;
      }
      const state = read();
      if (phase === "arming") {
        if (state.who === "Recording" && state.said === "Audio") {
          phase = "opening";
        }
      } else if (phase === "opening") {
        if (
          state.who === "Recording" &&
          state.said.startsWith("Audio Borealis") &&
          state.opaque
        ) {
          opening = state;
          strip.style.background = "#fff";
          holdUntil = now + 50;
          phase = "hold";
        }
      } else if (phase === "hold") {
        if (now >= holdUntil) {
          strip.style.background = "#000";
          phase = "round";
        }
      } else if (phase === "round") {
        const same = state.said === opening.said && state.next === opening.next;
        if (!movedOn) {
          movedOn = !same;
        } else if (!lastLineSeen) {
          lastLineSeen = state.said.startsWith("Now available");
        } else if (same) {
          strip.style.background = "#fff";
          holdUntil = now + 50;
          phase = "closing";
        }
      } else if (now >= holdUntil) {
        strip.style.background = "#000";
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

/**
 * The frames of the recording where the marker strip is white, from the
 * strip's rows alone, decoded as grey: two groups, the opening and the
 * closing, and the first frame of each is what the cut is made on. The
 * recording only holds a frame where the screen changed, so it is conformed
 * to 60 a second first, here and in the cut alike, and the frame numbers
 * mean the same thing in both.
 */
const markedFrames = (movie, scale, width, height, mark) => {
  const rows = mark * scale;
  const raw = execFileSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-i",
      movie,
      "-vf",
      `fps=60,crop=${width * scale}:${rows}:0:${height * scale}`,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "gray",
      "-",
    ],
    { maxBuffer: 1024 * 1024 * 1024 }
  );
  const perFrame = width * scale * rows;
  const count = Math.floor(raw.length / perFrame);
  const white = [];
  for (let f = 0; f < count; f++) {
    let sum = 0;
    for (let i = f * perFrame; i < (f + 1) * perFrame; i += 7) {
      sum += raw[i];
    }
    white.push(sum / Math.ceil(perFrame / 7) > 128);
  }
  const groups = [];
  for (let f = 0; f < count; f++) {
    if (white[f] && !white[f - 1]) {
      groups.push(f);
    }
  }
  return { count, groups };
};

/**
 * The stage has to end up filling the frame. Anything much smaller means an
 * ancestor kept a box of its own, and the difference between noticing that
 * and overwriting the committed media with a blank frame is this check.
 */
const verify = () => {
  const stage = document.querySelector('[class*="AudioBorealisDemo_stage__"]');
  const { width, height } = stage.getBoundingClientRect();
  if (width < window.innerWidth * 0.98 || height < window.innerHeight * 0.98) {
    throw new Error(
      `the stage measured ${Math.round(width)}×${Math.round(height)} in a ` +
        `${window.innerWidth}×${window.innerHeight} frame, so something is still boxing it in`
    );
  }
  return { width, height };
};

/**
 * Wait for the first line to be said in full: the box's text ends on a full
 * stop with no dimmed word after it. The page is reloaded just before this is
 * called, so the first finished line is the first line.
 */
const waitForFirstLine = async (page) => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(captionState);
    if (state.who === "Recording" && /[.!?]$/.test(state.said) && !state.next) {
      await wait(SETTLE_MS);
      return;
    }
    await wait(40);
  }
  throw new Error("the first line never finished: is the demo typing?");
};

/** What the box says: the words landed, the dimmed one after them, and who is speaking. */
const captionState = () => {
  const box = document.querySelector('[class*="AudioBorealisDemo_caption__"]');
  const said =
    box?.querySelector('[class*="AudioBorealisDemo_cap_text__"] > span')
      ?.textContent ?? "";
  const next =
    box?.querySelector('[class*="AudioBorealisDemo_tentative__"]')
      ?.textContent ?? "";
  const who =
    box?.querySelector('[class*="AudioBorealisDemo_cap_name__"]')
      ?.textContent ?? "";
  return {
    said: said.trim(),
    next: next.trim(),
    who: who.trim(),
    opaque: box ? getComputedStyle(box).opacity === "1" : false,
  };
};

/**
 * Pick the recording, from the bar isolate() has hidden, which a dispatched
 * click does not mind, and wait until it is what the box is showing. The
 * box is let fade all the way in on the mock voice's first word before the
 * pick, so that the clip's opening frame, the recording's second word, is
 * on a box that is already opaque, as it is when that word comes round
 * again a loop later.
 */
const startRecording = async (page) => {
  const opaqueBy = Date.now() + 15000;
  while (Date.now() < opaqueBy) {
    if ((await page.evaluate(captionState)).opaque) {
      break;
    }
    await wait(10);
  }
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Recording"
    );
    if (!button) {
      throw new Error("there is no Recording button on the page");
    }
    button.click();
  });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(captionState);
    if (state.who === "Recording") {
      return;
    }
    await wait(10);
  }
  throw new Error("the recording never started: is autoplay allowed?");
};

/** Whether the glow has painted anything: a canvas with a lit pixel in it. */
const glowing = () => {
  const canvas = document.querySelector(
    '[class*="AudioBorealisDemo_caption__"] canvas'
  );
  if (!canvas) {
    return false;
  }
  const ctx = canvas.getContext("2d");
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4 * 97) {
    if (data[i] > 8) {
      return true;
    }
  }
  return false;
};

const open = async (browser, viewport, theme) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: "networkidle" });
  await page.waitForSelector('[class*="AudioBorealisDemo_caption__"] canvas');
  await page.evaluate(isolate);
  await wait(300);
  const box = await page.evaluate(verify);
  console.log(`${theme}: ${Math.round(box.width)}×${Math.round(box.height)}`);
  // The demo restarts its line when it comes on screen; give the first word
  // time to land and the glow time to come up, then check that it did.
  await wait(1500);
  if (!(await page.evaluate(glowing))) {
    await context.close();
    throw new Error("the glow never painted: is the page interactive?");
  }
  return { context, page };
};

/** The still: the first line just said in full, glow up. */
const captureOg = async (browser, theme) => {
  const { context, page } = await open(browser, OG, theme);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[class*="AudioBorealisDemo_caption__"] canvas');
  await page.evaluate(isolate);
  await startRecording(page);
  await waitForFirstLine(page);

  const work = mkdtempSync(join(tmpdir(), "borealis-og-"));
  const shot = join(work, "shot.png");
  await page.screenshot({ path: shot });
  await context.close();

  // Shot at 2×, filed at the 1200×630 the page metas declare.
  ffmpeg([
    "-i",
    shot,
    "-vf",
    `scale=${OG.width}:${OG.height}:flags=lanczos`,
    join(OUT, `og-audio-borealis-${theme}.png`),
  ]);
  rmSync(work, { recursive: true, force: true });
  console.log(`og-audio-borealis-${theme}.png`);
};

/** The card clip's source: a screen recording of a real window, one round
    of the recording with the marks in it, kept under SOURCES. */
const recordClip = async (theme) => {
  const { width, height } = CARD;
  const { inset } = WINDOW;
  // The window's chrome is measured, not assumed: the page is placed under
  // it wherever it ends up.
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: [
      `--window-position=${WINDOW.x},${WINDOW.y}`,
      `--window-size=${width + inset * 2 + 2},${
        height + MARK_HEIGHT + inset * 2 + 90
      }`,
      "--autoplay-policy=no-user-gesture-required",
      "--hide-scrollbars",
    ],
  });
  const context = await browser.newContext({
    viewport: null,
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: "networkidle" });
  await page.waitForSelector('[class*="AudioBorealisDemo_caption__"] canvas');
  await page.bringToFront();
  await page.evaluate(isolateForScreen, {
    width,
    height,
    inset,
    mark: MARK_HEIGHT,
  });
  await wait(600);
  const geo = await page.evaluate(() => ({
    x: window.screenX,
    y: window.screenY + (window.outerHeight - window.innerHeight),
    scale: window.devicePixelRatio,
  }));
  if (geo.scale !== 2) {
    await browser.close();
    throw new Error(
      `the display is at ${geo.scale}x and the cards want 2x: film on the Retina display`
    );
  }
  const rect = `${geo.x + inset},${geo.y + inset},${width},${
    height + MARK_HEIGHT
  }`;

  mkdirSync(SOURCES, { recursive: true });
  const movie = join(SOURCES, `screen-${theme}.mov`);
  rmSync(movie, { force: true });
  const recorder = spawn(
    "screencapture",
    ["-V", String(RECORD_S), "-R", rect, "-x", movie],
    {
      stdio: "ignore",
    }
  );
  const recorded = new Promise((done, fail) => {
    recorder.on("exit", (code) =>
      code === 0 ? done() : fail(new Error(`screencapture exited with ${code}`))
    );
  });
  await wait(1000);
  await startRecording(page);
  await page.evaluate(markRound);
  console.log(`${theme}: round marked, waiting for the recorder to finish`);
  await recorded;
  await browser.close();
  console.log(`the recording is kept at ${movie}`);
};

/** The card clip, cut from the kept recording on its marks so it loops
    without a seam, and its first frame as the poster. */
const cutClip = (theme) => {
  const { width, height } = CARD;
  const movie = join(SOURCES, `screen-${theme}.mov`);
  const scale = 2;

  const { count, groups } = markedFrames(
    movie,
    scale,
    width,
    height,
    MARK_HEIGHT
  );
  if (groups.length < 2) {
    throw new Error(
      `found ${groups.length} mark(s) in ${count} frames, and the cut needs two`
    );
  }
  const [first, close] = groups;
  console.log(
    `${theme}: ${close - first} of ${count} frames kept, from frame ${first}`
  );

  const clip = join(OUT, `audio-borealis-overview-${theme}.mp4`);
  // Cut on the frames, the strip cropped off, the recording's own colour
  // tags carried through so the clip is shown as the display showed it.
  // The recorder's H.264 has no quality setting and flattens the wallpaper's
  // soft gradient into bands, three luma levels fewer than the display
  // shows: deband, at a threshold that only touches differences that small,
  // smooths the plateaus back into a slope before the final encode.
  const tags = execFileSync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=color_primaries,color_transfer,color_space",
    "-of",
    "csv=p=0",
    movie,
  ])
    .toString()
    .trim()
    .split(",");
  const colour =
    tags.length === 3 && tags.every((t) => t && t !== "unknown")
      ? [
          "-color_primaries",
          tags[0],
          "-color_trc",
          tags[1],
          "-colorspace",
          tags[2],
        ]
      : [];
  ffmpeg([
    "-i",
    movie,
    "-vf",
    `fps=60,select='between(n,${first},${close - 1})',setpts=N/60/TB,crop=${
      width * scale
    }:${
      height * scale
    }:0:0,deband=1thr=0.02:2thr=0.02:3thr=0.02:range=16:blur=1`,
    "-r",
    "60",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    ...colour,
    "-movflags",
    "+faststart",
    clip,
  ]);
  const seconds = ((close - first) / 60).toFixed(3);
  console.log(
    `audio-borealis-overview-${theme}.mp4, ${seconds}s: that is videoDuration in ` +
      "constants/design-engineering/components.ts"
  );

  // The poster is the clip's own first frame, at the clip's own size, so the
  // still and the first painted frame are the same image.
  ffmpeg([
    "-i",
    clip,
    "-frames:v",
    "1",
    "-c:v",
    "libwebp",
    "-quality",
    "82",
    join(OUT, `audio-borealis-overview-${theme}-poster.webp`),
  ]);
  console.log(`audio-borealis-overview-${theme}-poster.webp`);

  // The same cut as an animated WebP, straight from the recording rather
  // than from the clip, for a README that cannot hold a video: twenty
  // frames a second at the card's own width, looping.
  const webp = process.env.BOREALIS_WEBP_OUT;
  if (webp) {
    ffmpeg([
      "-i",
      movie,
      "-vf",
      `fps=60,select='between(n,${first},${close - 1})',setpts=N/60/TB,crop=${
        width * scale
      }:${
        height * scale
      }:0:0,deband=1thr=0.02:2thr=0.02:3thr=0.02:range=16:blur=1,fps=20,scale=${width}:-1:flags=lanczos`,
      "-loop",
      "0",
      "-c:v",
      "libwebp",
      "-quality",
      "55",
      "-compression_level",
      "6",
      webp,
    ]);
    console.log(`animated WebP of the cut at ${webp}`);
  }
};

const run = async () => {
  mkdirSync(OUT, { recursive: true });

  for (const theme of THEMES) {
    if (MODE === "video" || MODE === "both") {
      await recordClip(theme);
    }
    if (MODE !== "og") {
      cutClip(theme);
    }
  }

  if (MODE === "og" || MODE === "both") {
    const browser = await chromium.launch({
      channel: "chrome",
      // The recording plays from a click the bar never sees, so the page must
      // be allowed to play sound on its own.
      args: ["--autoplay-policy=no-user-gesture-required"],
    });
    for (const theme of THEMES) {
      await captureOg(browser, theme);
    }
    await browser.close();
  }
};

run();
