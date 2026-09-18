// Regenerates the gallery card clips, their posters and the OG stills for the
// beam demo page (/design-engineering/beam-demo).
//
//   node scripts/capture-beam-media.mjs            # everything
//   node scripts/capture-beam-media.mjs light      # one theme
//   node scripts/capture-beam-media.mjs light og   # one theme, stills only
//   node scripts/capture-beam-media.mjs dark video # one theme, clip and poster
//   node scripts/capture-beam-media.mjs preview    # one frame per theme, to /tmp
//
// Needs ffmpeg on the PATH, Chrome installed, and the site running: like the
// contrast capture, this demo is a React component and only exists once the
// page is served. Point BEAM_SITE at whichever origin is running it.
//
// What it films is the demo's title and window, and nothing else of the page:
// one loop of the script, from the moment the notes chapter begins to the
// moment it begins again, so the clip plays on repeat without a seam. The
// still is the capture pose, the browser tilted with the journal behind it,
// which is the one frame that says what the demo is about.
//
// What the capture changes, and why none of it belongs in the page: everything
// but the demo is hidden, every ancestor between it and the page loses its box
// so the demo can be sized to the frame, the chapter bar and the help line
// under the window go (they are the page's, not the demo's), and the window's
// em is pinned so the title and the window together fit the frame's height.
// Nothing is restructured, only styled: the component is still running its
// loop and still has to handle the wrap-around this script waits for.
//
// Frames come off a CDP screencast rather than through Playwright's own
// recorder, which needs a bundled ffmpeg that isn't installed here. They are
// JPEG at the top quality, which keeps up with the compositor where PNG did
// not on the Subtitles capture, and costs less than the h264 pass at the end.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SITE =
  process.env.BEAM_SITE ?? "http://localhost:3000/design-engineering/beam-demo";

const OUT =
  process.env.BEAM_MEDIA_OUT ??
  join(ROOT, "public", "media", "design-engineering", "beam");

const PREVIEW = process.argv[2] === "preview";
const THEMES =
  process.argv[2] && !PREVIEW ? [process.argv[2]] : ["light", "dark"];
/** "og", "video", or neither for both. */
const MODE = process.argv[3] ?? "both";

const CARD = { width: 990, height: 500 }; // ×2 for the 1980×1000 the cards use
const OG = { width: 1200, height: 630 };

// The loop is cut a beat after the notes chapter begins, not on the instant
// it does: that instant is also when the note page fades into the browser
// and the closing title into the opening one, all of it 0.2s of crossfade,
// so a clip cut there opens, and its poster is, a frame of two pages ghosted
// over each other. 0.4s is past every fade and well short of the 1.35s the
// opening title holds, so the clip opens on a clean browser under it.
//
// The same offset is applied at both ends, so the clip is still exactly one
// period and still loops without a seam.
const CUT_OFFSET = 0.4;

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });

/**
 * Keep the demo and nothing else, sized to the frame.
 *
 * Inline styles rather than a rewritten DOM: the component is live for the
 * rest of the capture and has to keep running its loop, which a reparented
 * tree would not.
 */
const isolate = ({ frame, windowEm }) => {
  const demo = document.querySelector('[class*="BeamDemo_demo__"]');
  if (!demo) {
    throw new Error("the demo isn't on the page");
  }

  // One rule, stated once: keep the demo, keep what it sits inside, hide the
  // rest. A walk down from .prose.page would assume a shape the page is free
  // to change.
  // The marker stays: it is what the reveal, and the script's own sense of
  // being in view, are measured off.
  document.querySelectorAll("body *").forEach((node) => {
    if (
      !node.contains(demo) &&
      !demo.contains(node) &&
      !/BeamDemo_marker__/.test(node.className)
    ) {
      node.style.display = "none";
    }
  });

  // Every ancestor loses its box, walking up rather than naming classes, so
  // the demo can be sized to the frame.
  for (
    let node = demo.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    node.style.cssText +=
      ";margin:0!important;padding:0!important;border:0!important;" +
      "max-width:none!important;width:100%!important;display:block!important;";
  }

  // The chapter bar and the help line belong to the page, not to the film.
  demo
    .querySelectorAll(
      '[class*="BeamDemo_chapters__"], [class*="BeamDemo_caption__"]'
    )
    .forEach((node) => {
      node.style.display = "none";
    });

  const style = document.createElement("style");
  style.textContent = `
    html, body {
      height: 100% !important;
      margin: 0 !important;
      overflow: hidden !important;
      padding: 0 !important;
    }
    [class*="BeamDemo_demo__"] {
      display: flex !important;
      flex-direction: column !important;
      height: ${frame.height}px !important;
      justify-content: center !important;
      margin: 0 auto !important;
      width: ${frame.width}px !important;
    }
    /* The title sits closer to the window than it does on the page, where
       the gap is the page's rhythm; the frame has less room. */
    [class*="BeamDemo_title__"] {
      font-size: 26px !important;
      margin-bottom: 1em !important;
      min-height: 0 !important;
    }
    /* The stage is the window at the frame's em with a quarter of the
       stage round it, a little more than the 15% the page gives it, so
       the glow, which is drawn in the stage's box, has a little more room
       in the frame than on the page: left at the frame's width it spread
       across the whole frame round a window that was two thirds of it. */
    [class*="BeamDemo_stage__"] {
      --window-em: ${windowEm}px !important;
      margin-inline: auto !important;
      padding: 0.5em 0 1.5em !important;
      width: ${Math.round((windowEm * 52.5) / 0.75)}px !important;
    }
    /* The reveal on scroll, done: the frame is the revealed page. */
    [class*="BeamDemo_scroll_reveal__"] {
      --window-scale: 1 !important;
      --title-t: 1 !important;
      --slide-t: 1 !important;
    }
    [class*="BeamDemo_room__"] {
      --gap: 0px !important;
    }
    /* The marker is what the script watches to know it is in view, sized
       on the page to the stage at the page's own em. The frame is the
       demo, so the marker is the frame: in view, and the loop plays. */
    [class*="BeamDemo_marker__"] {
      height: 100% !important;
      top: 0 !important;
    }
    [class*="BeamDemo_window__"],
    [class*="BeamDemo_title__"],
    [class*="BeamDemo_slide__"] {
      animation: none !important;
    }
  `;
  document.head.appendChild(style);

  // The loop comes back round when the notes chapter is current again. One
  // mark per wrap-around: a chapter change is two attribute mutations, the
  // old button's and the new one's, and both see the new one current.
  window.__marks = [];
  const bar = demo.querySelector('[class*="BeamDemo_chapters__"]');
  let last = "Notes";
  new MutationObserver(() => {
    const current =
      bar.querySelector("[aria-current]")?.textContent.trim() ?? last;
    if (current === "Notes" && last !== "Notes") {
      // On the epoch clock, which is the one the screencast's frames are
      // stamped in, so the clip can be held to the wrap-around.
      window.__marks.push(Date.now() / 1000);
    }
    last = current;
  }).observe(bar, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-current"],
  });
};

/**
 * The demo has to end up the size of the frame. Anything much smaller means an
 * ancestor kept a box of its own, or isolate() hid the thing it was supposed to
 * keep, and either way the difference between noticing that and overwriting
 * the committed media with a blank frame is this check.
 */
const verify = () => {
  const demo = document.querySelector('[class*="BeamDemo_demo__"]');
  const { width, height } = demo.getBoundingClientRect();
  if (width < window.innerWidth * 0.98 || height < window.innerHeight * 0.98) {
    throw new Error(
      `the demo measured ${Math.round(width)}×${Math.round(height)} in a ` +
        `${window.innerWidth}×${window.innerHeight} frame, so something is still boxing it in`
    );
  }
  return { width, height };
};

/**
 * Resolves, with the moment it happened in seconds on the epoch clock, when
 * the page's `count`th wrap-around has happened. The loop's own first beat
 * is a title fading in, so there is nothing to offset for: the clip cut on
 * the mark opens on the title arriving.
 */
const waitForMark = async (page, count) => {
  for (;;) {
    const marks = await page.evaluate(() => window.__marks);
    if (marks.length >= count) {
      return marks[count - 1];
    }
    await wait(25);
  }
};

/** The window's em for a frame: the title's line and the 33em window, plus
 *  the stage's padding, have to fit the frame's height with a little air. */
const windowEmFor = (frame) => Math.floor((frame.height - 80) / 34);

const open = async (browser, frame, theme, scale = 2) => {
  const context = await browser.newContext({
    viewport: frame,
    deviceScaleFactor: scale,
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: "networkidle" });
  await page.waitForSelector('[class*="BeamDemo_chapters__"] button');
  await page.evaluate(isolate, { frame, windowEm: windowEmFor(frame) });
  await wait(300);
  const box = await page.evaluate(verify);
  console.log(`${theme}: ${Math.round(box.width)}×${Math.round(box.height)}`);
  return { context, page };
};

/** The still: the capture pose, a beat after the window has leaned back. */
const captureOg = async (browser, theme) => {
  const { context, page } = await open(browser, OG, theme);
  await page.waitForFunction(
    () =>
      document
        .querySelector('[class*="BeamDemo_windows__"]')
        .className.includes("is_rotated"),
    null,
    { timeout: 60000, polling: 50 }
  );
  await wait(1200);

  const work = mkdtempSync(join(tmpdir(), "beam-og-"));
  const shot = join(work, "shot.png");
  await page.screenshot({ path: shot });
  await context.close();

  // Shot at 2×, filed at the 1200×630 the page metas declare.
  ffmpeg([
    "-i",
    shot,
    "-vf",
    `scale=${OG.width}:${OG.height}:flags=lanczos`,
    join(OUT, `og-beam-${theme}.png`),
  ]);
  rmSync(work, { recursive: true, force: true });
  console.log(`og-beam-${theme}.png`);
};

/** The card clip: exactly one loop, from one start of the notes chapter to
 *  the next, and its first frame as the poster. */
const captureClip = async (browser, theme) => {
  // The screencast hands over frames at the page's CSS size whatever the
  // context's scale factor says: the browser itself is launched at 2×
  // below, and this context asks for 1 so the two do not compound.
  const { context, page } = await open(browser, CARD, theme, 1);

  const work = mkdtempSync(join(tmpdir(), `beam-${theme}-`));
  const name = (index) => join(work, `${String(index).padStart(5, "0")}.jpg`);
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

  // Start a beat after one wrap-around, stop the same beat after the next:
  // exactly one loop. The screencast runs from the first mark and a little
  // past the second, and the frames are cut to the beats below.
  const start = (await waitForMark(page, 1)) + CUT_OFFSET;
  await session.send("Page.startScreencast", {
    format: "jpeg",
    quality: 100,
    maxWidth: CARD.width * 2,
    maxHeight: CARD.height * 2,
    everyNthFrame: 1,
  });
  const end = (await waitForMark(page, 2)) + CUT_OFFSET;
  await wait(CUT_OFFSET * 1000 + 200);
  await session.send("Page.stopScreencast");
  await wait(200);
  await context.close();
  console.log(
    `${theme}: ${frames.length} frames over a ${(end - start).toFixed(2)}s loop`
  );

  // The compositor only sends a frame when something changed, so a handful of
  // frames for a whole loop means the demo never moved: the page is served
  // but not running. Encoding that would file a still under a video's name.
  if (frames.length < 60) {
    rmSync(work, { recursive: true, force: true });
    throw new Error(
      `only ${frames.length} frame(s) for a loop, so the demo never moved`
    );
  }

  // One line per frame, with the gap to the next as its duration: the frames
  // arrive when the compositor has something new, not on a fixed clock, so
  // their own timestamps are the only thing that keeps the pacing honest.
  // Each frame stands from its own stamp to the next frame's, cut to the
  // clip's two ends, so the frame that was showing at the start holds until
  // the first change and the last frame is held to the end: the loop ends
  // on a title holding still for three seconds, and a compositor with
  // nothing new to send sent nothing, so a clip that ended on its last
  // frame was short by the hold and jumped over it on repeat.
  const list = frames
    .map((timestamp, index) => {
      const next = frames[index + 1] ?? end;
      const from = Math.max(timestamp, start);
      const to = Math.min(next, end);
      return to > from
        ? `file '${name(index)}'\nduration ${(to - from).toFixed(4)}`
        : null;
    })
    .filter(Boolean)
    .join("\n");
  const listFile = join(work, "frames.txt");
  // The concat demuxer takes the last file twice, once for its duration.
  const lastKept = frames.filter((timestamp) => timestamp < end).length - 1;
  writeFileSync(listFile, `${list}\nfile '${name(Math.max(0, lastKept))}'\n`);

  const clip = join(OUT, `beam-overview-${theme}.mp4`);
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
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    clip,
  ]);
  console.log(`beam-overview-${theme}.mp4`);

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
    join(OUT, `beam-overview-${theme}-poster.webp`),
  ]);
  console.log(`beam-overview-${theme}-poster.webp`);

  rmSync(work, { recursive: true, force: true });
};

/** One frame per theme, of what the clip would show, written to /tmp. */
const preview = async (browser) => {
  const dir = mkdtempSync(join(tmpdir(), "beam-preview-"));
  for (const theme of ["light", "dark"]) {
    const { context, page } = await open(browser, CARD, theme, 1);
    await wait(1500);
    const file = join(dir, `beam-clip-${theme}.png`);
    await page.screenshot({ path: file });
    await context.close();
    console.log(file);
  }
};

const run = async () => {
  // The whole browser at two pixels per CSS pixel, for the clip: see open().
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--force-device-scale-factor=2"],
  });

  if (PREVIEW) {
    await preview(browser);
    await browser.close();
    return;
  }

  mkdirSync(OUT, { recursive: true });
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
