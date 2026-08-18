// Regenerates the gallery card clips and the OG stills for the contrast page
// (/design-engineering/contrast-colors).
//
//   node scripts/capture-contrast-media.mjs            # everything
//   node scripts/capture-contrast-media.mjs light      # one theme
//   node scripts/capture-contrast-media.mjs light og   # one theme, stills only
//   node scripts/capture-contrast-media.mjs dark video # one theme, clip only
//
// Needs ffmpeg on the PATH, Chrome installed, and the site running: unlike the
// Subtitles capture, which drives a standalone HTML file, this demo is a React
// component and only exists once the page is served. Point CONTRAST_SITE at
// whichever origin is running it.
//
// What it films is the lab's five panes, full bleed, while the lab walks its own
// presets underneath them. Five answers to the same question, side by side, each
// one rendered in the colour it is arguing for: that is the page in one frame,
// and it is the only part of it that survives being scaled to a thumbnail. The
// rest of the lab, and the six cases, make a stiller and busier card.
//
// What the capture changes, and why none of it belongs in the page: everything
// but the panes is hidden, every ancestor between them and the page is stripped
// of its own box so the grid can reach all four edges, and each pane centres its
// contents because it is now four times the height it was designed for. Nothing
// is restructured, only styled, because the component is still running and still
// has to handle the clicks this script makes.
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

const SITE =
  process.env.CONTRAST_SITE ??
  "http://localhost:3000/design-engineering/contrast-colors";

const OUT =
  process.env.CONTRAST_MEDIA_OUT ??
  join(ROOT, "public", "media", "design-engineering", "contrast");

const THEMES = process.argv[2] ? [process.argv[2]] : ["light", "dark"];
/** "og", "video", or neither for both. */
const MODE = process.argv[3] ?? "both";

const CARD = { width: 990, height: 500 }; // ×2 for the 1980×1000 the cards use
const OG = { width: 1200, height: 630 };

/**
 * One preset per beat. The clip opens and closes on the same one, so it loops
 * without a seam, and the still is taken on the pair the lab loads with.
 */
const PRESET_ORDER = [0, 1, 3, 4, 2];
const STILL_PRESET = 2;
const BEAT_MS = 1700;

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });

/**
 * Keep the five panes and nothing else, filling the frame edge to edge.
 *
 * Inline styles rather than a rewritten DOM: the component is live for the rest
 * of the capture and has to keep handling the preset clicks, which a reparented
 * tree would not.
 */
const isolate = () => {
  const panes = document.querySelector('[class*="ContrastDemo_panes"]');
  if (!panes) {
    throw new Error("the panes grid isn't on the page");
  }

  // One rule, stated once: keep the panes, keep what they sit inside, hide the
  // rest. Written as a walk down from .prose.page it kept assuming a shape the
  // page is free to change, and the day a wrapper appeared between the two it
  // hid the demo and filmed an empty screen without complaining.
  document.querySelectorAll("body *").forEach((node) => {
    if (!node.contains(panes) && !panes.contains(node)) {
      node.style.display = "none";
    }
  });

  // Every ancestor is flattened by walking up from the panes rather than by
  // naming the classes, for the same reason: the chain between the page and the
  // grid is the page's business and it has already changed once. Each one loses
  // its box so the grid can reach all four edges.
  for (
    let node = panes.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    node.style.cssText +=
      ";margin:0!important;padding:0!important;border:0!important;" +
      "border-radius:0!important;box-shadow:none!important;background:none!important;" +
      "max-width:none!important;width:100%!important;height:100%!important;" +
      "display:block!important;overflow:visible!important;";
  }

  const style = document.createElement("style");
  style.textContent = `
    html, body {
      height: 100% !important;
      margin: 0 !important;
      overflow: hidden !important;
      padding: 0 !important;
    }
    /* Five across whatever the width. The lab's own breakpoints drop to two
       columns below 900px, and the point being made is that there are five
       answers to compare, side by side. */
    [class*="ContrastDemo_panes"] {
      border: 0 !important;
      border-radius: 0 !important;
      grid-template-columns: repeat(5, 1fr) !important;
      height: 100% !important;
      margin: 0 !important;
      width: 100% !important;
    }
    /* A pane is normally as tall as its content, with the readout pushed to the
       bottom by the specimen's auto margin. Filling the frame makes it four
       times that, so the group is centred instead: left as it is, the three
       blocks would sit at the two far ends of a mostly empty column. */
    [class*="ContrastDemo_pane__"] {
      justify-content: center !important;
      min-height: 0 !important;
    }
    [class*="ContrastDemo_sample"] {
      margin: 0 !important;
    }
  `;
  document.head.appendChild(style);
};

/**
 * The panes have to end up filling the frame. Anything much smaller means an
 * ancestor kept a box of its own, or isolate() hid the thing it was supposed to
 * keep, and either way the difference between noticing that and overwriting the
 * committed media with a blank frame is this check.
 */
const verify = () => {
  const panes = document.querySelector('[class*="ContrastDemo_panes"]');
  const { width, height } = panes.getBoundingClientRect();
  if (width < window.innerWidth * 0.98 || height < window.innerHeight * 0.98) {
    throw new Error(
      `the panes measured ${Math.round(width)}×${Math.round(height)} in a ` +
        `${window.innerWidth}×${window.innerHeight} frame, so something is still boxing them in`
    );
  }
  return { width, height };
};

/**
 * Every readout's height, with any levelling taken back off first.
 *
 * The panes centre their contents, and the shifted pane carries two lines the
 * others don't: a delta and a direction. Centring a taller stack starts it
 * higher, so the five tags and the five specimens each sat on their own line.
 */
const readoutHeights = () => {
  const readouts = [
    ...document.querySelectorAll('[class*="ContrastDemo_readout"]'),
  ];
  readouts.forEach((readout) => {
    readout.style.minHeight = "";
  });
  return readouts.map((readout) => readout.getBoundingClientRect().height);
};

/** Give every readout the same height, so centring puts every pane on the same
    lines. One value for the whole clip, not one per preset: a floor that moved
    between beats would make the titles jump on every preset change instead. */
const levelReadouts = (px) => {
  document
    .querySelectorAll('[class*="ContrastDemo_readout"]')
    .forEach((readout) => {
      readout.style.minHeight = `${px}px`;
    });
};

/** Click one of the lab's own presets, by position in the row. */
const pickPreset = (index) => {
  const buttons = document.querySelectorAll(
    '[class*="ContrastDemo_presets"] button'
  );
  buttons[index].click();
};

/**
 * Walk the presets once, off camera, and level every readout to the tallest any
 * of them ever gets. Measured rather than guessed, so a preset whose verdict
 * runs to an extra line cannot push a pane out of line mid-clip.
 */
const levelAcross = async (page, presets) => {
  let tallest = 0;
  for (const preset of presets) {
    await page.evaluate(pickPreset, preset);
    await wait(250);
    const heights = await page.evaluate(readoutHeights);
    tallest = Math.max(tallest, ...heights);
  }
  await page.evaluate(levelReadouts, tallest);
  return tallest;
};

const open = async (browser, viewport, theme) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: "networkidle" });
  await page.waitForSelector('[class*="ContrastDemo_panes"] [data-pane]');
  await page.evaluate(isolate);
  await wait(300);
  const box = await page.evaluate(verify);
  console.log(`${theme}: ${Math.round(box.width)}×${Math.round(box.height)}`);
  return { context, page };
};

/** The still: the pair the lab loads with, where the two metrics disagree. */
const captureOg = async (browser, theme) => {
  const { context, page } = await open(browser, OG, theme);
  await levelAcross(page, [STILL_PRESET]);
  await wait(400);

  const work = mkdtempSync(join(tmpdir(), "contrast-og-"));
  const shot = join(work, "shot.png");
  await page.screenshot({ path: shot });
  await context.close();

  // Shot at 2×, filed at the 1200×630 the page metas declare.
  ffmpeg([
    "-i",
    shot,
    "-vf",
    `scale=${OG.width}:${OG.height}:flags=lanczos`,
    join(OUT, `og-contrast-${theme}.png`),
  ]);
  rmSync(work, { recursive: true, force: true });
  console.log(`og-contrast-${theme}.png`);
};

/** The card clip: one pass through the presets, ending where it started. */
const captureClip = async (browser, theme) => {
  const { context, page } = await open(browser, CARD, theme);
  // levelAcross leaves the lab on the last preset it looked at, which is the
  // one the clip opens and closes on, so it loops without a seam.
  const tallest = await levelAcross(page, PRESET_ORDER);
  console.log(`${theme}: readouts levelled at ${Math.round(tallest)}px`);
  await wait(500);

  const work = mkdtempSync(join(tmpdir(), `contrast-${theme}-`));
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

  await session.send("Page.startScreencast", {
    format: "png",
    maxWidth: CARD.width * 2,
    maxHeight: CARD.height * 2,
    everyNthFrame: 1,
  });

  for (const preset of PRESET_ORDER) {
    await page.evaluate(pickPreset, preset);
    await wait(BEAT_MS);
  }

  await session.send("Page.stopScreencast");
  await wait(200);
  await context.close();
  console.log(`${theme}: ${frames.length} frames`);

  // The compositor only sends a frame when something changed, so one frame for
  // five preset clicks means the clicks did nothing: the page is served but not
  // interactive. Encoding that would file a still under a video's name.
  if (frames.length <= PRESET_ORDER.length) {
    rmSync(work, { recursive: true, force: true });
    throw new Error(
      `only ${frames.length} frame(s) for ${PRESET_ORDER.length} presets, so the demo never moved`
    );
  }

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
    join(OUT, `contrast-overview-${theme}.mp4`),
  ]);

  rmSync(work, { recursive: true, force: true });
  console.log(`contrast-overview-${theme}.mp4`);
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
