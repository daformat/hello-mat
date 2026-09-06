// Regenerates the gallery card clips and the OG images for the Subtitles demo
// (/design-engineering/subtitles-app).
//
//   node scripts/capture-subtitles-media.mjs            # everything
//   node scripts/capture-subtitles-media.mjs light      # one theme
//   node scripts/capture-subtitles-media.mjs light og   # one theme, stills only
//   node scripts/capture-subtitles-media.mjs dark video # one theme, clip only
//   node scripts/capture-subtitles-media.mjs preview    # the clip's page, in a browser
//   node scripts/capture-subtitles-media.mjs preview quiet   # written, not opened
//
// `preview` writes the page the clip is recorded from, at the clip's own size
// and with the epilogue on, one file per theme, and opens the light one: what
// the recording will show, to be looked at before it is made.
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
//   · the stage keeps the demo's own proportions and scale: it is sized to
//     the frame's height at its 16/9.6 ratio and centred, with the unit every
//     piece of chrome is drawn in taken from that width, exactly as the site
//     derives it. The frame is wider than the demo is, so the difference is
//     more desktop either side of the windows rather than wider windows;
//   · the clip is cut at the wrap-around back to the meeting, so one loop
//     plays on repeat without a seam, and then rotated by a few frames so it
//     opens on the meeting window rather than on the tail of the ⌘-tab fade.
//
// Frames come off a CDP screencast as PNG rather than through Playwright's own
// recorder: the recorder needs a bundled ffmpeg that isn't installed here, and
// PNG keeps the pixels lossless until the single h264 pass at the end.

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

const PREVIEW = process.argv[2] === "preview";
const THEMES =
  process.argv[2] && !PREVIEW ? [process.argv[2]] : ["light", "dark"];
/** "og", "video", or neither for both. */
const MODE = process.argv[3] ?? "both";

/** The line the still is taken on, once it has committed. */
const OPENER = "Universal subtitles for any app, live on your Mac.";

// Said before the podcast's last line, in the clip only: the demo raises the
// stack as ⌥ is said in the first, opens the field and types "meeting" as ⌥F
// is said in the second, and lets both go under "none of it leaves the Mac",
// which closes the clip as it always did. The demo's own loop plays them, from
// window.SUBTITLES_EPILOGUE; on the site itself the epilogue is off.
const EPILOGUE = [
  "Missed a line? Hold ⌥ and every caption that closed stacks back up.",
  "Press ⌥F and type: the stack narrows to the boxes that match.",
];

const CARD = { width: 990, height: 500 }; // ×2 for the 1980×1000 the cards use
const OG = { width: 1200, height: 630 };

// The loop is cut a beat after the meeting window fronts, not on the instant it
// does: that instant is also when the ⌘-tab panel starts its 160ms fade, so a
// clip starting there opens on the tail of a fading panel. 200ms is past the
// fade and still short of the 220ms the demo waits before the first caption, so
// the clip opens on a clean meeting window with nothing on top of it.
//
// The same offset is applied at both ends, so the clip is still exactly one
// period and still loops without a seam, and, unlike rotating the frames
// afterwards, it costs no second encode.
const CUT_OFFSET_MS = 200;

// The site measures everything inside the screen against the screen's own
// width. Here the screen is the whole frame and the stage is narrower than it,
// so the stage becomes the container instead: the windows' insets, in cqw, then
// resolve against the stage they sit in, and land where they do on the site.
const STAGE_RULES = `
  /* The screen's frame is a page detail; the recording is the screen itself. */
  .demo-screen::after { display: none; }
  .demo-stage { container-type: inline-size; }
`;

/** Fills the frame with the fake screen, and marks every wrap-around. With a
 *  `frame`, the screen is that size and centred in the window instead, which
 *  is how the preview page shows the clip at the clip's own dimensions. */
const isolate = (stageRules, frame) => {
  // The whole .demo, not just the screen inside it: the palette is declared on
  // .demo, so lifting the screen out on its own left every token undefined and
  // the capture came back as windows with no surfaces on no wallpaper.
  const demo = document.querySelector(".demo");
  const screen = demo.querySelector(".demo-screen");
  const menubar = demo.querySelector(".demo-menubar");
  const stage = demo.querySelector(".demo-stage");
  for (const child of [...document.body.children]) {
    child.remove();
  }
  document.body.append(demo);
  document.body.style.cssText =
    "margin:0;height:100vh;overflow:hidden;background:#0c0d11" +
    (frame ? ";display:grid;place-items:center" : "");
  demo.style.cssText += ";margin:0";
  // The controls and the sentence under the screen belong to the page, not to
  // the recording.
  demo.querySelector(".demo-scenes")?.remove();
  demo.querySelectorAll(".demo-caption").forEach((el) => el.remove());
  const size = frame
    ? `width:${frame.width}px;height:${frame.height}px`
    : "width:100vw;height:100vh";
  screen.style.cssText += `;${size};max-width:none;border:0;border-radius:0;box-shadow:none;margin:0`;

  const overrides = document.createElement("style");
  overrides.textContent = stageRules;
  document.head.append(overrides);

  // The stage at the demo's own proportions, as tall as the frame allows and
  // centred, with the unit taken from the width that gives. The menu bar's
  // height is in that unit and the stage's height depends on the menu bar's,
  // so it settles over a few passes; the fifth is already the fourth.
  let unit = 8;
  for (let pass = 0; pass < 5; pass += 1) {
    menubar.style.setProperty("--u", `${unit}px`);
    stage.style.setProperty("--u", `${unit}px`);
    const height =
      (frame ? frame.height : window.innerHeight) - menubar.offsetHeight;
    const width = (height * 16) / 9.6;
    stage.style.cssText += `;aspect-ratio:auto;height:${height}px;width:${width}px;margin-inline:auto`;
    // The site's own unit, clamp(4px, 0.91cqw, 8px), off the stage's width.
    // Spelled out here because this whole function runs inside the page.
    unit = Math.min(8, Math.max(4, 0.0091 * width));
  }

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
  await page.evaluate(isolate, STAGE_RULES);
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
  await page.addInitScript((lines) => {
    window.SUBTITLES_EPILOGUE = lines;
  }, EPILOGUE);
  await page.goto(SITE);
  await page.evaluate(isolate, STAGE_RULES);

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

  // One pass, straight from the lossless frames to the file that ships. CRF 16
  // is a step short of transparent for flat UI like this, and about 60% larger
  // than the 20 it used to be; 4:2:0 chroma stays, because Safari will not
  // play anything else, and it is only the coloured edges that pay for it.
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
    "16",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    join(OUT, `subtitles-overview-${theme}.mp4`),
  ]);

  rmSync(work, { recursive: true, force: true });
  console.log(`subtitles-overview-${theme}.mp4`);
};

/** The clip's page as a file, one per theme, and the light one opened. */
const preview = () => {
  if (!SITE.startsWith("file://")) {
    throw new Error("preview needs the site as a file, see SITE");
  }
  const siteFile = fileURLToPath(SITE);
  const html = readFileSync(siteFile, "utf8");
  const dir = mkdtempSync(join(tmpdir(), "subtitles-preview-"));
  const files = ["light", "dark"].map((theme) => {
    const page = html
      // Relative assets resolve against the site, wherever this file lives.
      .replace("<head>", `<head><base href="${SITE.replace(/[^/]*$/, "")}">`)
      .replace(
        '<script src="script.min.js"></script>',
        `<script>window.SUBTITLES_EPILOGUE = ${JSON.stringify(
          EPILOGUE
        )};</script>\n` + '<script src="script.min.js"></script>'
      )
      .replace(
        "</body>",
        // On load, as the capture does it: after every script on the page has
        // run, so none of them is left looking for an element this removed.
        `<script>document.documentElement.dataset.theme = ${JSON.stringify(
          theme
        )};` +
          `window.addEventListener("load", () => (${isolate.toString()})(${JSON.stringify(
            STAGE_RULES
          )}, ${JSON.stringify(CARD)}));</script></body>`
      );
    const file = join(dir, `subtitles-clip-${theme}.html`);
    writeFileSync(file, page);
    return file;
  });
  files.forEach((file) => console.log(file));
  // `preview quiet` writes the files and leaves the browser alone.
  if (process.argv[3] !== "quiet") {
    execFileSync("open", [files[0]]);
  }
};

const run = async () => {
  if (PREVIEW) {
    preview();
    return;
  }
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
