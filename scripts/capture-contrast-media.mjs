// Regenerates the gallery card clips, their posters and the OG stills for the
// contrast page (/design-engineering/contrast-colors).
//
//   node scripts/capture-contrast-media.mjs            # everything
//   node scripts/capture-contrast-media.mjs light      # one theme
//   node scripts/capture-contrast-media.mjs light og   # one theme, stills only
//   node scripts/capture-contrast-media.mjs dark video # one theme, clip and poster
//
// Needs ffmpeg on the PATH, Chrome installed, and the site running: unlike the
// Subtitles capture, which drives a standalone HTML file, this demo is a React
// component and only exists once the page is served. Point CONTRAST_SITE at
// whichever origin is running it.
//
// What it films is the lab's four panes, full bleed, while the lab walks its
// presets underneath them, the first of them recoloured for the card (see
// OPENING). Four answers to the same question, side by side, each one rendered
// in the colour it is arguing for: that is the page in one frame, and it is the
// only part of it that survives being scaled to a thumbnail. The rest of the
// lab, and the six cases, make a stiller and busier card.
//
// What the capture changes, and why none of it belongs in the page: everything
// but the panes is hidden, every ancestor between them and the page is stripped
// of its own box so the grid can reach all four edges, each pane centres its
// contents because it is now four times the height it was designed for, and
// every readout is boxed to the shortest so the four titles share a line.
// Nothing is restructured, only styled, because the component is still running
// and still has to handle the clicks this script makes.
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
 * The pair the clip opens on, one per theme, in place of the lab's first
 * preset. That preset is an orange, and full bleed on a card between the other
 * demos' pale grounds it shouts: the page keeps it, since the note it exists
 * for is on the page and not in the clip, and the card opens on the site's
 * own background instead, under a tint of it too faint to read on it, so the
 * card sits in the grid like a piece of the page. It is a plainer beat than the
 * preset's: the typed colour fails at about 2:1, the shift takes it to the
 * theme's text colour give or take a step, and the two CSS expressions agree
 * on black or white and both pass. The disagreement the preset exists to show
 * needs a background in the grey band, which is a mid-tone by definition, and
 * a mid-tone block is what the card is being spared.
 */
const OPENING = {
  // --color-background, under $light-ivory-5 halfway to $light-ivory-4
  light: { bg: "#feefe7", fg: "#bda293" },
  // --color-background, under $dark-ivory-5 halfway to $dark-ivory-4
  dark: { bg: "#110c17", fg: "#4b455b" },
};

/**
 * One beat per entry: a pair fed to the lab's own pickers, or one of its
 * presets by position in the row. The clip opens on the pair above and ends on
 * the one the lab loads with, which is also the still. Every change of pair is
 * a hard cut, so the loop's own cut back to the opening is one more of them.
 */
const beatsFor = (theme) => [OPENING[theme], 1, 3, 4, 2];
const STILL_PRESET = 2;
const BEAT_MS = 1700;

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });

/** "#rrggbb" as the "rgb(r, g, b)" a computed style reports it. */
const cssRgb = (hex) =>
  `rgb(${[1, 3, 5]
    .map((at) => parseInt(hex.slice(at, at + 2), 16))
    .join(", ")})`;

/**
 * Keep the four panes and nothing else, filling the frame edge to edge.
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
    /* Four across whatever the width. The lab's own breakpoints drop to two
       columns below 900px, and the point being made is that there are four
       answers to compare, side by side. */
    [class*="ContrastDemo_panes"] {
      border: 0 !important;
      border-radius: 0 !important;
      grid-template-columns: repeat(4, 1fr) !important;
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
 * Every readout's height, with any boxing taken back off first.
 *
 * The panes centre their contents, and the shifted pane carries two lines the
 * others don't: a delta and a direction. Centring a taller stack starts it
 * higher, so its tag and its specimen sat a line above the other three.
 */
const readoutHeights = () => {
  const readouts = [
    ...document.querySelectorAll('[class*="ContrastDemo_readout"]'),
  ];
  readouts.forEach((readout) => {
    readout.style.height = "";
  });
  return readouts.map((readout) => readout.getBoundingClientRect().height);
};

/** Box every readout to the same height, so centring puts every pane on the
    same lines. The shortest, not the tallest: boxed to the tallest, the three
    plain panes grew to meet the shifted one, and it was them that moved. Boxed
    to the shortest, the shifted pane's two extra lines overflow below its box,
    which nothing clips, and its title comes down to the others. One value for
    the whole clip, not one per beat: a box that changed size between beats
    would make the titles jump on every change of pair instead. */
const boxReadouts = (px) => {
  document
    .querySelectorAll('[class*="ContrastDemo_readout"]')
    .forEach((readout) => {
      readout.style.height = `${px}px`;
    });
};

/** What the first pane is painting behind its specimen. */
const paintedBg = () =>
  getComputedStyle(document.querySelector('[class*="ContrastDemo_pane__"]'))
    .backgroundColor;

/**
 * Play one beat: click one of the lab's presets, by position in the row, or
 * feed a pair of this script's own through its two colour pickers.
 */
const play = (beat) => {
  if (typeof beat === "number") {
    const buttons = document.querySelectorAll(
      '[class*="ContrastDemo_presets"] button'
    );
    buttons[beat].click();
    return;
  }
  // The pickers are controlled inputs, and React only notices a value it did
  // not set itself when it arrives through the native setter and an input
  // event, the way a real pick does. isolate() has hidden them, which a
  // dispatched event does not mind and a Playwright fill() would refuse.
  const set = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  ).set;
  const feed = (label, value) => {
    const input = document.querySelector(`input[aria-label="${label}"]`);
    if (!input) {
      throw new Error(`there is no "${label}" on the page`);
    }
    set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  feed("Background color picker", beat.bg);
  feed("Text color picker", beat.fg);
};

/**
 * Walk the beats once, off camera, and box every readout to the shortest any of
 * them ever is. Measured rather than guessed, so a verdict that runs to an
 * extra line cannot push a pane out of line mid-clip. A fed pair is checked
 * against what the panes then paint: a picker React did not hear would leave
 * the lab on whatever it showed before, and the clip would open on that.
 */
const boxAcross = async (page, beats) => {
  let shortest = Infinity;
  for (const beat of beats) {
    await page.evaluate(play, beat);
    await wait(250);
    if (typeof beat !== "number") {
      const painted = await page.evaluate(paintedBg);
      if (painted !== cssRgb(beat.bg)) {
        throw new Error(
          `fed ${beat.bg} to the lab but the panes are painting ${painted}`
        );
      }
    }
    const heights = await page.evaluate(readoutHeights);
    shortest = Math.min(shortest, ...heights);
  }
  await page.evaluate(boxReadouts, shortest);
  return shortest;
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
  await boxAcross(page, [STILL_PRESET]);
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

/** The card clip: one pass through the beats, and its first frame as the
    poster. */
const captureClip = async (browser, theme) => {
  const beats = beatsFor(theme);
  const { context, page } = await open(browser, CARD, theme);
  const shortest = await boxAcross(page, beats);
  console.log(`${theme}: readouts boxed at ${Math.round(shortest)}px`);
  await wait(500);

  const work = mkdtempSync(join(tmpdir(), `contrast-${theme}-`));
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

  await session.send("Page.startScreencast", {
    format: "png",
    maxWidth: CARD.width * 2,
    maxHeight: CARD.height * 2,
    everyNthFrame: 1,
  });

  // On the epoch clock, which is the one the screencast stamps its frames on.
  // The compositor sends nothing until something changes, so the first frame
  // is the opening beat's paint and not whatever boxAcross left showing; the
  // frames are cut at the first beat all the same, in case it ever does. The
  // last beat changes nothing after its own paint, so it sends nothing, and
  // holds until the end instead.
  const start = Date.now() / 1000;
  for (const beat of beats) {
    await page.evaluate(play, beat);
    await wait(BEAT_MS);
  }
  const end = Date.now() / 1000;

  await session.send("Page.stopScreencast");
  await wait(200);
  await context.close();

  const kept = frames
    .map((timestamp, index) => ({ timestamp, index }))
    .filter(({ timestamp }) => timestamp >= start && timestamp < end);
  console.log(`${theme}: ${kept.length} of ${frames.length} frames kept`);

  // The compositor only sends a frame when something changed, so fewer frames
  // than beats means at least one beat did nothing: the page is served but not
  // interactive. Encoding that would file a still under a video's name.
  if (kept.length < beats.length) {
    rmSync(work, { recursive: true, force: true });
    throw new Error(
      `only ${kept.length} frame(s) for ${beats.length} beats, so the demo never moved`
    );
  }

  // One line per frame, with the gap to the next as its duration: the frames
  // arrive when the compositor has something new, not on a fixed clock, so
  // their own timestamps are the only thing that keeps the pacing honest. The
  // last one stands to the end, for its whole beat: given a frame's worth, as
  // it was, the clip closed on a flash of the pair it was meant to end on.
  const list = kept
    .map(({ timestamp, index }, at) => {
      const next = kept[at + 1]?.timestamp ?? end;
      return `file '${name(index)}'\nduration ${(next - timestamp).toFixed(4)}`;
    })
    .join("\n");
  const listFile = join(work, "frames.txt");
  // The concat demuxer takes the last file twice, once for its duration.
  writeFileSync(listFile, `${list}\nfile '${name(kept.at(-1).index)}'\n`);

  const clip = join(OUT, `contrast-overview-${theme}.mp4`);
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
    `contrast-overview-${theme}.mp4, ${seconds}s: that is videoDuration in ` +
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
    join(OUT, `contrast-overview-${theme}-poster.webp`),
  ]);
  console.log(`contrast-overview-${theme}-poster.webp`);

  rmSync(work, { recursive: true, force: true });
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
