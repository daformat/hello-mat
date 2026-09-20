// Regenerates the gallery card clips, their posters and the OG stills for the
// audio borealis page (/design-engineering/audio-borealis).
//
//   node scripts/capture-audio-borealis-media.mjs            # everything
//   node scripts/capture-audio-borealis-media.mjs light      # one theme
//   node scripts/capture-audio-borealis-media.mjs light og   # one theme, stills only
//   node scripts/capture-audio-borealis-media.mjs dark video # one theme, clip and poster
//
// Needs ffmpeg on the PATH, Chrome installed, and the site running: the demo
// is a React component and only exists once the page is served. Point
// BOREALIS_SITE at whichever origin is running it.
//
// What it films is the stage, full bleed: the desk and the caption box on it,
// playing the recording, since the recording loops and the mock voice does
// not. The clip is one round of it, cut so that it loops without a seam: the
// screencast rolls while the recording is picked, every change of caption is
// logged against the clock, and the frames are cut afterwards, from the box
// faded in with "Audio Borealis" written, to the frame most like it a round
// later. The poster is the clip's own first frame, so the card's still and
// its first painted frame are the same image, and the OG still is the first
// line just said in full with the glow still up under it.
//
// The stage is drawn at the card's own proportions, so nothing has to be
// restyled to fill the frame beyond hiding the rest of the page and taking
// the boxes off the ancestors between the stage and the body.
//
// Frames come off a CDP screencast as PNG rather than through Playwright's own
// recorder: the recorder needs a bundled ffmpeg that isn't installed here, and
// PNG keeps the pixels lossless until the single h264 pass at the end.

import { execFileSync, spawnSync } from "node:child_process";
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

const THEMES = process.argv[2] ? [process.argv[2]] : ["light", "dark"];
/** "og", "video", or neither for both. */
const MODE = process.argv[3] ?? "both";

const CARD = { width: 990, height: 500 }; // ×2 for the 1980×1000 the cards use
const OG = { width: 1200, height: 630 };

/** The most a round of the recording may take before the capture gives up. */
const ROUND_TIMEOUT_MS = 90000;
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

/**
 * Watch the recording play, and say when the clip opens and when it closes:
 * it opens on the box faded all the way in with "Audio Borealis" written,
 * and it closes when that same caption comes round again after the last
 * line. Both are clock times, matched to the screencast's frames after.
 */
const watchRound = async (page) => {
  const deadline = Date.now() + ROUND_TIMEOUT_MS;
  let opening = null;
  let movedOn = false;
  let lastLineSeen = false;
  while (Date.now() < deadline) {
    const now = Date.now() / 1000;
    const state = await page.evaluate(captionState);
    if (!opening) {
      if (
        state.who === "Recording" &&
        state.said.startsWith("Audio Borealis") &&
        state.opaque
      ) {
        opening = { ...state, at: now };
      }
    } else {
      const same = state.said === opening.said && state.next === opening.next;
      if (!movedOn) {
        movedOn = !same;
      } else if (!lastLineSeen) {
        lastLineSeen = state.said.startsWith("Now available");
      } else if (same) {
        return { opensAt: opening.at, closesAt: now };
      }
    }
    await wait(10);
  }
  throw new Error("the recording never came round to its opening again");
};

/** How alike two frames are, in dB of PSNR off ffmpeg; Infinity when identical. */
const similarity = (a, b) => {
  const report = spawnSync(
    "ffmpeg",
    [
      "-loglevel",
      "info",
      "-i",
      a,
      "-i",
      b,
      "-lavfi",
      "psnr",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" }
  ).stderr;
  const value = report.match(/average:([0-9.]+|inf)/);
  if (!value) {
    return 0;
  }
  return value[1] === "inf" ? Infinity : parseFloat(value[1]);
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

/** The card clip: one round of the recording, cut to loop without a seam,
    and its first frame as the poster. */
const captureClip = async (browser, theme) => {
  const { context, page } = await open(browser, CARD, theme);
  // Start the lines over, so the first line is what the clip opens on.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[class*="AudioBorealisDemo_caption__"] canvas');
  await page.evaluate(isolate);

  const work = mkdtempSync(join(tmpdir(), `borealis-${theme}-`));
  const name = (index) => join(work, `${String(index).padStart(5, "0")}.png`);
  const session = await context.newCDPSession(page);
  const frames = [];
  session.on("Page.screencastFrame", async ({ data, sessionId, metadata }) => {
    const index = frames.length;
    writeFileSync(name(index), data, { encoding: "base64" });
    frames.push(metadata.timestamp);
    try {
      await session.send("Page.screencastFrameAck", { sessionId });
    } catch {
      // the page went away between the frame and the ack
    }
  });

  // Rolling before the recording is picked, so the opening is on film
  // whenever it comes.
  await session.send("Page.startScreencast", {
    format: "png",
    maxWidth: CARD.width * 2,
    maxHeight: CARD.height * 2,
    everyNthFrame: 1,
  });
  await startRecording(page);
  const { opensAt, closesAt } = await watchRound(page);
  await wait(400);
  await session.send("Page.stopScreencast");
  await wait(200);
  await context.close();

  // The frames on either side of the round, by the clock. The clock catches
  // a caption up to a poll late, so the close is pulled back by that much,
  // and then settled on the frame most like the opening one, among the
  // frames around it: the last frame before it is then the frame before the
  // first, give or take the eye.
  const at = (time) => frames.findIndex((timestamp) => timestamp >= time);
  const first = at(opensAt);
  const guess = at(closesAt - 0.015);
  if (first < 0 || guess < 0) {
    rmSync(work, { recursive: true, force: true });
    throw new Error("the round fell outside the frames on film");
  }
  let close = guess;
  let best = -Infinity;
  for (
    let k = Math.max(first + 60, guess - 8);
    k <= Math.min(frames.length - 1, guess + 8);
    k++
  ) {
    const score = similarity(name(first), name(k));
    if (score > best) {
      best = score;
      close = k;
    }
  }
  const kept = frames
    .map((timestamp, index) => ({ timestamp, index }))
    .slice(first, close);
  console.log(
    `${theme}: ${kept.length} of ${frames.length} frames kept, seam at ` +
      `${
        best === Infinity ? "identical" : `${best.toFixed(1)} dB`
      } against the first frame`
  );
  if (kept.length < 60) {
    rmSync(work, { recursive: true, force: true });
    throw new Error(
      `only ${kept.length} frame(s) in a round, so the demo never moved`
    );
  }

  // One line per frame, with the gap to the next as its duration: the frames
  // arrive when the compositor has something new, not on a fixed clock, so
  // their own timestamps are the only thing that keeps the pacing honest.
  // The last one stands until the frame it was cut before.
  const end = frames[close];
  const list = kept
    .map(({ timestamp, index }, i) => {
      const next = kept[i + 1]?.timestamp ?? end;
      return `file '${name(index)}'\nduration ${(next - timestamp).toFixed(4)}`;
    })
    .join("\n");
  const listFile = join(work, "frames.txt");
  // The concat demuxer takes the last file twice, once for its duration.
  writeFileSync(listFile, `${list}\nfile '${name(kept.at(-1).index)}'\n`);

  const clip = join(OUT, `audio-borealis-overview-${theme}.mp4`);
  ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-vf",
    `fps=60,scale=${CARD.width * 2}:${CARD.height * 2}:flags=lanczos`,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    clip,
  ]);
  const seconds = (end - kept[0].timestamp).toFixed(3);
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

  rmSync(work, { recursive: true, force: true });
};

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    // The recording plays from a click the bar never sees, so the page must
    // be allowed to play sound on its own.
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  for (const theme of THEMES) {
    if (MODE !== "og") {
      await captureClip(browser, theme);
    }
    if (MODE !== "video") {
      await captureOg(browser, theme);
    }
  }

  await browser.close();
};

run();
