// Regenerates the gallery card clips and the OG images for the Subtitles demo
// (/design-engineering/component/subtitles-app).
//
//   node scripts/capture-subtitles-media.mjs            # everything
//   node scripts/capture-subtitles-media.mjs light      # one theme
//   node scripts/capture-subtitles-media.mjs light og   # one theme, stills only
//   node scripts/capture-subtitles-media.mjs dark video # one theme, clip only
//
// Needs ffmpeg on the PATH, and Chrome installed (Playwright drives the real
// browser rather than its own download, which this machine doesn't have).
//
// It does NOT capture the React component on the page. It drives the original
// demo on the app's landing page, over file://, so no dev server has to be
// running for either project. The two are the same demo, and the plain HTML one
// can be stretched and re-proportioned for a capture without any of that
// leaking into the component the gallery ships.
//
// What the capture changes, and why none of it belongs in the component:
//
//   · the fake screen is stretched edge to edge, with its radius, border and
//     shadow removed, so the frame is all demo and no background;
//   · the windows are narrowed to 84% of their width on the site, each about
//     its own centre, because at full bleed the site's proportions read as
//     cramped;
//   · the clip is cut at the wrap-around back to the meeting, so one loop
//     plays on repeat without a seam, and then rotated by a few frames so it
//     opens on the meeting window rather than on the tail of the ⌘-tab fade.
//
// Frames come off a CDP screencast as PNG rather than through Playwright's own
// recorder: the recorder needs a bundled ffmpeg that isn't installed here, and
// PNG keeps the pixels lossless until the single h264 pass at the end.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The landing page carrying the demo. Override with SUBTITLES_SITE. */
const SITE =
  process.env.SUBTITLES_SITE ??
  `file://${resolve(ROOT, "..", "subtitles-site", "index.html")}`;

const OUT =
  process.env.SUBTITLES_MEDIA_OUT ??
  join(ROOT, "public", "media", "design-engineering", "subtitles");

const THEMES = process.argv[2] ? [process.argv[2]] : ["light", "dark"];
/** "og", "video", or neither for both. */
const MODE = process.argv[3] ?? "both";

/** The line the still is taken on, once it has committed. */
const OPENER = "Universal subtitles for any app, live on your Mac.";

const CARD = { width: 990, height: 500 }; // ×2 for the 1980×1000 the cards use
const OG = { width: 1200, height: 630 };

// The loop is cut a beat after the meeting window fronts, not on the instant it
// does: that instant is also when the ⌘-tab panel starts its 160ms fade, so a
// clip starting there opens on the tail of a fading panel. 200ms is past the
// fade and still short of the 220ms the demo waits before the first caption, so
// the clip opens on a clean meeting window with nothing on top of it.
//
// The same offset is applied at both ends, so the clip is still exactly one
// period and still loops without a seam — and, unlike rotating the frames
// afterwards, it costs no second encode.
const CUT_OFFSET_MS = 200;

// The windows are 86% of the stage wide on the site, which is right for a page
// but too wide once the screen is stretched edge to edge. These are the same
// three windows at 84% of that width, each shrunk about its own centre so the
// stack keeps its offsets: 86 × 0.84 = 72.24, half of it 36.12 either side of
// centres that sit at 50%, 54% and 46%.
const NARROWER_WINDOWS = `
  .win-meeting { inset: 5% 13.88% 13.5%; }
  .win-notes   { inset: 8% 9.88% 13.5% 17.88%; }
  .win-player  { inset: 3% 17.88% 13.5% 9.88%; }
`;

/** Fills the frame with the fake screen, and marks every wrap-around. */
const isolate = (windowRules) => {
  const screen = document.querySelector(".demo-screen");
  const menubar = document.querySelector(".demo-menubar");
  const stage = document.querySelector(".demo-stage");
  for (const child of [...document.body.children]) {
    child.remove();
  }
  document.body.append(screen);
  document.body.style.cssText =
    "margin:0;height:100vh;overflow:hidden;background:#0c0d11";
  screen.style.cssText +=
    ";width:100vw;max-width:none;height:100vh;border:0;border-radius:0;box-shadow:none;margin:0";
  // The stage is 16/9.6 by default; letting it take whatever is left of the
  // viewport is what makes the screen fill the frame rather than sit in it.
  stage.style.aspectRatio = "auto";
  stage.style.height = `calc(100vh - ${menubar.offsetHeight}px)`;

  const overrides = document.createElement("style");
  overrides.textContent = windowRules;
  document.head.append(overrides);

  // The loop comes back round when the meeting window fronts again.
  window.__marks = [];
  new MutationObserver(() => {
    if (
      document.querySelector(".win-meeting")?.classList.contains("is-front")
    ) {
      window.__marks.push(performance.now());
    }
  }).observe(document.querySelector(".win-meeting"), {
    attributes: true,
    attributeFilter: ["class"],
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit" });

/**
 * Resolves CUT_OFFSET_MS after the page's `count`th wrap-around. The wait is
 * measured from the mark's own timestamp rather than from when the poll noticed
 * it, so the offset is the same at both ends of the clip whatever the polling
 * happened to catch.
 */
const waitForMark = async (page, count) => {
  for (;;) {
    const since = await page.evaluate(
      (n) =>
        window.__marks.length >= n
          ? performance.now() - window.__marks[n - 1]
          : null,
      count
    );
    if (since !== null) {
      if (since < CUT_OFFSET_MS) {
        await wait(CUT_OFFSET_MS - since);
      }
      return;
    }
    await wait(25);
  }
};

/** The still: the opening line, committed rather than caught mid-word. */
const captureOg = async (browser, theme) => {
  const context = await browser.newContext({
    viewport: OG,
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.goto(SITE);
  await page.evaluate(isolate, NARROWER_WINDOWS);
  await page.waitForFunction(
    (line) =>
      document.getElementById("caption-text")?.textContent === line &&
      !document.getElementById("caption-live")?.textContent,
    OPENER,
    { timeout: 120000, polling: 50 }
  );

  const work = mkdtempSync(join(tmpdir(), "subtitles-og-"));
  const shot = join(work, "shot.png");
  await page.screenshot({ path: shot });
  await context.close();

  // Shot at 2×, filed at the 1200×630 the page metas declare.
  ffmpeg([
    "-i",
    shot,
    "-vf",
    `scale=${OG.width}:${OG.height}:flags=lanczos`,
    join(OUT, `og-subtitles-${theme}.png`),
  ]);
  rmSync(work, { recursive: true, force: true });
  console.log(`og-subtitles-${theme}.png`);
};

/** The card clip: exactly one loop of the demo, cut and rotated. */
const captureClip = async (browser, theme) => {
  const context = await browser.newContext({
    viewport: CARD,
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.goto(SITE);
  await page.evaluate(isolate, NARROWER_WINDOWS);

  const work = mkdtempSync(join(tmpdir(), `subtitles-${theme}-`));
  const session = await context.newCDPSession(page);
  const frames = [];
  session.on("Page.screencastFrame", async ({ data, sessionId, metadata }) => {
    const index = frames.length;
    writeFileSync(join(work, `${String(index).padStart(5, "0")}.png`), data, {
      encoding: "base64",
    });
    frames.push(metadata.timestamp);
    try {
      await session.send("Page.screencastFrameAck", { sessionId });
    } catch {
      // the page went away between the frame and the ack
    }
  });

  // Start a beat after one wrap-around, stop the same beat after the next:
  // exactly one loop, cut where there is nothing on screen but the desktop.
  await waitForMark(page, 1);
  await session.send("Page.startScreencast", {
    format: "png",
    maxWidth: CARD.width * 2,
    maxHeight: CARD.height * 2,
    everyNthFrame: 1,
  });
  await waitForMark(page, 2);
  await session.send("Page.stopScreencast");
  await wait(200);
  await context.close();
  console.log(`${theme}: ${frames.length} frames`);

  // One line per frame, with the gap to the next as its duration: the frames
  // arrive when the compositor has something new, not on a fixed clock, so
  // their own timestamps are the only thing that keeps the pacing honest.
  const name = (index) => join(work, `${String(index).padStart(5, "0")}.png`);
  const list = frames
    .map((timestamp, index) => {
      const next = frames[index + 1] ?? timestamp + 1 / 60;
      return `file '${name(index)}'\nduration ${(next - timestamp).toFixed(4)}`;
    })
    .join("\n");
  const listFile = join(work, "frames.txt");
  writeFileSync(listFile, `${list}\nfile '${name(frames.length - 1)}'\n`);

  // One pass, straight from the lossless frames to the file that ships.
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
    join(OUT, `subtitles-overview-${theme}.mp4`),
  ]);

  rmSync(work, { recursive: true, force: true });
  console.log(`subtitles-overview-${theme}.mp4`);
};

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });

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
