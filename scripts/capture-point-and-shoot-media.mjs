// Regenerates the gallery card clips, their posters and the OG stills for the
// point-and-shoot page (/design-engineering/point-and-shoot).
//
//   node scripts/capture-point-and-shoot-media.mjs            # everything
//   node scripts/capture-point-and-shoot-media.mjs light      # one theme
//   node scripts/capture-point-and-shoot-media.mjs light og   # one theme, still only
//   node scripts/capture-point-and-shoot-media.mjs dark video # one theme, clip and poster
//
// Needs ffmpeg on the PATH, Chrome installed, and the site running (the scene
// takes the site's own Inter and the Glea demo's photo from it). Point
// POINT_AND_SHOOT_SITE at whichever origin is serving.
//
// What it films is not the page's demo. The page is an essay with a journal
// window in it, and at a card's size its type is a smudge, so the card is a
// scene of its own, drawn at the size a thumbnail can still read: a page of
// four big blocks on the left, Today's journal on the right, the ⌥ key in the
// corner. The real library runs it, with its default spotlight, and the
// pointer is a drawn cursor driven through Playwright's mouse, so everything
// the clip shows is what the package does: the dot, the morph, the press and
// the flash on a click, the drawn area on a drag, a selection's lines lit and
// collected the moment ⌥ goes down. Each capture lands in the journal. The
// clip ends where it starts, so the card loops without a seam.
//
// Frames come off a CDP screencast as PNG, as in the other captures: the
// recorder needs a bundled ffmpeg that isn't installed here, and PNG keeps
// the pixels lossless until the single h264 pass at the end.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SITE = process.env.POINT_AND_SHOOT_SITE ?? "http://localhost:3000";

const OUT =
  process.env.POINT_AND_SHOOT_MEDIA_OUT ??
  join(ROOT, "public", "media", "design-engineering", "point-and-shoot");

// PNS_IIFE: another build of it (a local one, before it's published).
const LIBRARY = process.env.PNS_IIFE ?? join(
  ROOT,
  "node_modules",
  "@daformat",
  "point-and-shoot",
  "dist",
  "point-and-shoot.iife.js"
);

const THEMES = process.argv[2] ? [process.argv[2]] : ["light", "dark"];
/** "og", "video", or neither for both. */
const MODE = process.argv[3] ?? "both";

const CARD = { width: 990, height: 500 }; // ×2 for the 1980×1000 the cards use
const OG = { width: 1200, height: 630 };

/** The site's palette (styles/lib/palette.scss), per theme. */
const PALETTE = {
  light: {
    bg: "#feefe7",
    surface: "#fff5f0",
    ink: "#3f2f27",
    text: "#594439",
    muted: "#9d7d6c",
    line: "rgba(157, 125, 108, 0.28)",
    key: "#fffaf5",
    shadow: "rgba(102, 27, 33, 0.08)",
  },
  dark: {
    bg: "#110c17",
    surface: "#151020",
    ink: "#d5d4d9",
    text: "#9f99ad",
    muted: "#665f77",
    line: "rgba(102, 95, 119, 0.4)",
    key: "#1f182f",
    shadow: "rgba(0, 0, 0, 0.45)",
  },
};

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

const ffmpeg = (args) =>
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], {
    stdio: "inherit",
  });

/** The scene, at the card's size: its own page, styled from the palette. */
const scene = (theme) => {
  const c = PALETTE[theme];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Inter"; font-weight: 100 900; src: url("${SITE}/fonts/inter/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2") format("woff2"); }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: ${c.bg}; color: ${c.text}; overflow: hidden; }
body { font: 400 22px/1.4 "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
#stage { position: absolute; left: 0; top: 0; width: ${CARD.width}px; height: ${CARD.height}px; transform-origin: 0 0; }
.page { position: absolute; left: 46px; top: 40px; bottom: 83px; width: 500px; display: flex; flex-direction: column; } /* down to the key's top, so the row centers between the quote and the key */
h1 { margin: 0 0 20px; font: 600 46px/1.08 "Inter", system-ui, sans-serif; color: ${c.ink}; letter-spacing: -0.02em; }
blockquote { margin: 0; padding-left: 20px; border-left: 4px solid ${c.line}; font-size: 22px; line-height: 1.25; color: ${c.ink}; }
.row { display: flex; gap: 22px; align-items: center; margin-block: auto; }
.photo { width: 236px; height: 164px; border-radius: 14px; background: url("${SITE}/media/design-engineering/point-and-shoot/glea/bush.jpg") center 22% / cover; flex: none; }
.row p { margin: 0; font-size: 21px; line-height: 1.36; }
.journal { position: absolute; right: 40px; top: 32px; bottom: 32px; width: 372px; padding: 26px 26px 0; border-radius: 18px; background: ${c.surface}; box-shadow: 0 0 0 1px ${c.line}, 0 24px 60px -30px ${c.shadow}; overflow: hidden; }
.journal h2 { margin: 0; font: 600 34px/1.1 "Inter", system-ui, sans-serif; color: ${c.ink}; letter-spacing: -0.02em; }
.journal .date { margin: 4px 0 16px; font-size: 16px; color: ${c.muted}; }
.entry { margin-bottom: 14px; padding: 8px 10px; border-radius: 10px; animation: arrive 900ms cubic-bezier(0.16, 1, 0.3, 1) both; }
.entry.quote { border-left: 4px solid ${c.line}; border-radius: 0 10px 10px 0; font-size: 22px; line-height: 1.25; color: ${c.ink}; }
.entry .src { display: block; margin-top: 4px; font-size: 15px; color: ${c.muted}; }
.entry.shot div { width: 170px; height: 92px; border-radius: 8px; background: url("${SITE}/media/design-engineering/point-and-shoot/glea/bush.jpg") no-repeat; }
.entry.text { font-size: 19px; line-height: 1.3; }
@keyframes arrive { 0% { opacity: 0; translate: 0 10px; background: rgba(112, 88, 255, 0.28); } 30% { opacity: 1; translate: 0 0; } 100% { background: transparent; } }
.journal.clearing .entry { transition: opacity 500ms ease, translate 500ms ease; opacity: 0; translate: 0 -8px; }
.key { position: absolute; left: 46px; bottom: 32px; display: flex; align-items: center; gap: 14px; font-size: 19px; color: ${c.muted}; }
.key b { display: grid; place-items: center; width: 52px; height: 48px; border-radius: 11px; background: ${c.key}; box-shadow: 0 0 0 1px ${c.line}, 0 3px 0 ${c.line}; font: 500 28px/1 system-ui, sans-serif; color: ${c.ink}; transition: translate 120ms ease, box-shadow 120ms ease, background 160ms ease; }
.key span { translate: 0 0; transition: translate 120ms ease; }
.key.held b { translate: 0 3px; box-shadow: 0 0 0 1px rgba(112, 88, 255, 0.6), 0 0 0 ${c.line}; background: rgba(112, 88, 255, 0.18); }
.key.held span { translate: 0 3px; } /* and the label goes down with it, so the pair stays centered on each other */
#cursor { position: fixed; left: 0; top: 0; width: 26px; height: 32px; pointer-events: none; z-index: 2147483647; translate: -100px -100px; }
::selection { background: rgba(112, 88, 255, 0.28); }
</style></head><body>
<div id="stage">
  <div class="page">
    <h1 id="title">As We May Think</h1>
    <blockquote id="quote">The human mind operates by association.</blockquote>
    <div class="row">
      <div class="photo" id="photo"></div>
      <p id="para">With one item in its grasp, it snaps instantly to the next that is suggested by the association of thoughts.</p>
    </div>
  </div>
  <div class="journal" id="journal"><h2>Today</h2><div class="date">Friday, 9 October</div><div id="entries"></div></div>
  <div class="key" id="key"><b>⌥</b><span>Hold, then click or drag</span></div>
</div>
<svg id="cursor" viewBox="0 0 26 32"><path d="M3 2 L3 25 L9 19.5 L13.2 29 L17.4 27.2 L13.3 17.8 L21.5 17.8 Z" fill="#000" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>
</body></html>`;
};

/** In the page: the controller, the cursor, and the journal it fills. */
const wire = () => {
  const { createPointAndShoot } = window.PointAndShoot;
  const entries = document.getElementById("entries");
  const cursor = document.getElementById("cursor");
  addEventListener(
    "pointermove",
    (e) => (cursor.style.translate = `${e.clientX - 3}px ${e.clientY - 2}px`),
    true
  );
  const add = (className, html) => {
    const el = document.createElement("div");
    el.className = `entry ${className}`;
    el.innerHTML = html;
    entries.appendChild(el);
  };
  // The answer a beat later, as Glea's comes: the flash plays on what was
  // shot before the spotlight moves on.
  const later = () => new Promise((done) => setTimeout(done, 450));
  // The photo itself, for its size.
  const photo = new Image();
  photo.src = getComputedStyle(
    document.getElementById("photo")
  ).backgroundImage.slice(5, -2);
  const pns = createPointAndShoot({
    selection: "shoot",
    after: "stay",
    cursor: false,
    feedback: { announce: false },
    onShoot: (target) => {
      if (target.node instanceof Range) {
        add("text", `“${target.node.toString().trim()}”`);
        getSelection().removeAllRanges();
      } else {
        add(
          "quote",
          `${target.node.textContent.trim()}<span class="src">— As We May Think, The Atlantic</span>`
        );
      }
      return later();
    },
    area: {
      onCapture: (rect) => {
        // The part of the photo under the area, as the journal's picture:
        // the photo as the page draws it (cover, 22% down), scaled to the
        // journal's width.
        const box = document.getElementById("photo").getBoundingClientRect();
        const s = Math.max(
          box.width / photo.naturalWidth,
          box.height / photo.naturalHeight
        );
        const w = photo.naturalWidth * s;
        const h = photo.naturalHeight * s;
        const left = box.left + (box.width - w) * 0.5;
        const top = box.top + (box.height - h) * 0.22;
        const k = 170 / rect.viewport.width;
        add(
          "shot",
          `<div style="background-size:${w * k}px ${
            h * k
          }px;background-position:${(left - rect.viewport.x) * k}px ${
            (top - rect.viewport.y) * k
          }px;height:${rect.viewport.height * k}px"></div>`
        );
        return later();
      },
    },
  });
  window.pns = pns;
};

/** A mouse move as a hand makes it: eased, one event a frame. */
const glide = async (page, from, to, ms) => {
  const steps = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    await page.mouse.move(
      from.x + (to.x - from.x) * e,
      from.y + (to.y - from.y) * e
    );
    await wait(16);
  }
  return to;
};

const center = async (page, id, dx = 0.5, dy = 0.5) => {
  const b = await page.locator(`#${id}`).boundingBox();
  return { x: b.x + b.width * dx, y: b.y + b.height * dy };
};

const setAfter = (page, after) =>
  page.evaluate((after) => window.pns.configure({ after }), after);

const hold = (page, on) =>
  page.evaluate((on) => {
    document.getElementById("key").classList.toggle("held", on);
    if (on) window.pns.activate();
    else window.pns.deactivate();
  }, on);

/**
 * The beats: ⌥ down, the spotlight across the title onto the quote, a click;
 * a drag over the photo; ⌥ up, a selection made by hand, ⌥ down and it's
 * collected at once; then the journal clears and the cursor goes home.
 */
const perform = async (page) => {
  const home = await center(page, "stage", 0.47, 0.62);
  await page.mouse.move(home.x, home.y);
  let at = home;
  await wait(400);

  // On after the click, so the spotlight carries on to the photo.
  await setAfter(page, "stay");
  await hold(page, true);
  await wait(250);
  at = await glide(page, at, await center(page, "title", 0.3, 0.5), 650);
  await wait(450);
  at = await glide(page, at, await center(page, "quote", 0.45, 0.5), 450);
  await wait(400);
  await page.mouse.down();
  await wait(140);
  await page.mouse.up();
  await wait(750);

  const photo = await page.locator("#photo").boundingBox();
  // Nearly the whole photo: in just enough to stay clear of its rounded corners.
  const a = { x: photo.x + 6, y: photo.y + 6 };
  const b = { x: photo.x + photo.width - 6, y: photo.y + photo.height - 6 };
  at = await glide(page, at, a, 600);
  await wait(250);
  // Off once the area is in, rather than lighting the photo under the
  // pointer; ⌥ comes up as it goes.
  await setAfter(page, "deactivate");
  await page.mouse.down();
  at = await glide(page, at, b, 700);
  await wait(200);
  await page.mouse.up();
  await wait(500);
  await hold(page, false);
  await wait(500);

  // A selection, by hand, then ⌥: collected at once, its lines lit.
  const para = await page.locator("#para").boundingBox();
  const s0 = { x: para.x + 2, y: para.y + 14 };
  const s1 = { x: para.x + para.width * 0.62, y: para.y + 66 };
  at = await glide(page, at, s0, 550);
  await page.mouse.down();
  at = await glide(page, at, s1, 650);
  await page.mouse.up();
  await wait(450);
  // Off once it's in, as for the area, rather than lighting the paragraph.
  await hold(page, true);
  await wait(550);
  await hold(page, false);
  await wait(1050);

  // Back to the opening frame: the journal empties, the cursor goes home.
  await page.evaluate(() =>
    document.getElementById("journal").classList.add("clearing")
  );
  at = await glide(page, at, home, 700);
  await wait(200);
  await page.evaluate(() => {
    document.getElementById("entries").replaceChildren();
    document.getElementById("journal").classList.remove("clearing");
  });
  await wait(400);
};

const open = async (browser, viewport, theme) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  const page = await context.newPage();
  // Served from the site's own origin, so its font and photo load: a page
  // set with setContent has no origin, and the font would be refused.
  const url = `${SITE}/__point-and-shoot-card`;
  await page.route(url, (route) =>
    route.fulfill({ body: scene(theme), contentType: "text/html" })
  );
  await page.goto(url, { waitUntil: "networkidle" });
  await page.addScriptTag({ path: LIBRARY });
  await page.evaluate(wire);
  // The stage fills the viewport: the card's own size, or, for the still,
  // scaled to its width and as tall as it needs to be to reach both edges,
  // the journal's card keeping its margins top and bottom.
  await page.evaluate(
    ({ width, height, card }) => {
      const k = width / card.width;
      const stage = document.getElementById("stage");
      stage.style.transform = `scale(${k})`;
      stage.style.height = `${height / k}px`;
    },
    { ...viewport, card: CARD }
  );
  await page.evaluate(() => document.fonts.ready);
  // Today on the same baseline as the page's title: each baseline measured
  // with an empty inline box sitting on it, the difference given to the
  // journal's top padding (in the stage's own px).
  await page.evaluate(() => {
    const baseline = (el) => {
      const mark = document.createElement("span");
      mark.style.cssText =
        "display:inline-block;width:0;height:0;vertical-align:baseline";
      el.appendChild(mark);
      const y = mark.getBoundingClientRect().top;
      mark.remove();
      return y;
    };
    const stage = document.getElementById("stage");
    const k = stage.getBoundingClientRect().width / stage.offsetWidth;
    const journal = document.getElementById("journal");
    const delta =
      (baseline(document.getElementById("title")) -
        baseline(journal.querySelector("h2"))) /
      k;
    journal.style.paddingTop = `${
      parseFloat(getComputedStyle(journal).paddingTop) + delta
    }px`;
  });
  await wait(300);
  return { context, page };
};

/** The still: the quote collected, the spotlight on the photo, ⌥ held. */
const captureOg = async (browser, theme) => {
  const { context, page } = await open(browser, OG, theme);
  const home = await center(page, "stage", 0.47, 0.62);
  await page.mouse.move(home.x, home.y);
  await hold(page, true);
  let at = await glide(page, home, await center(page, "quote", 0.45, 0.5), 400);
  await page.mouse.down();
  await page.mouse.up();
  await wait(1300);
  at = await glide(page, at, await center(page, "photo", 0.62, 0.55), 500);
  await wait(900);

  const work = mkdtempSync(join(tmpdir(), "point-and-shoot-og-"));
  const shot = join(work, "shot.png");
  await page.screenshot({ path: shot });
  await context.close();

  // Shot at 2×, filed at the 1200×630 the page metas declare.
  ffmpeg([
    "-i",
    shot,
    "-vf",
    `scale=${OG.width}:${OG.height}:flags=lanczos`,
    join(OUT, `og-point-and-shoot-${theme}.png`),
  ]);
  rmSync(work, { recursive: true, force: true });
  console.log(`og-point-and-shoot-${theme}.png`);
};

/** The card clip: one pass through the beats, and its first frame as the
    poster. */
const captureClip = async (browser, theme) => {
  const { context, page } = await open(browser, CARD, theme);
  const home = await center(page, "stage", 0.47, 0.62);
  await page.mouse.move(home.x, home.y);
  await wait(300);

  const work = mkdtempSync(join(tmpdir(), `point-and-shoot-${theme}-`));
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

  // A first paint to stamp the start on: the compositor sends nothing until
  // something changes.
  await page.evaluate(() => document.body.style.setProperty("--tick", "1"));
  await wait(100);
  const start = Date.now() / 1000;
  await perform(page);
  const end = Date.now() / 1000;

  await session.send("Page.stopScreencast");
  await wait(200);
  await context.close();

  // The frame showing at the start, then every frame up to the end.
  const before = frames.map((t, i) => ({ t, i })).filter(({ t }) => t < start);
  const kept = [
    ...(before.length ? [{ t: start, i: before.at(-1).i }] : []),
    ...frames
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t >= start && t < end),
  ];
  console.log(`${theme}: ${kept.length} of ${frames.length} frames kept`);
  if (kept.length < 20) {
    rmSync(work, { recursive: true, force: true });
    throw new Error(`only ${kept.length} frame(s): the scene never moved`);
  }

  // One line per frame, with the gap to the next as its duration: frames
  // arrive when something changed, not on a clock.
  const list = kept
    .map(({ t, i }, at) => {
      const next = kept[at + 1]?.t ?? end;
      return `file '${name(i)}'\nduration ${(next - t).toFixed(4)}`;
    })
    .join("\n");
  const listFile = join(work, "frames.txt");
  // The concat demuxer takes the last file twice, once for its duration.
  writeFileSync(listFile, `${list}\nfile '${name(kept.at(-1).i)}'\n`);

  const clip = join(OUT, `point-and-shoot-overview-${theme}.mp4`);
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
  console.log(
    `point-and-shoot-overview-${theme}.mp4, ${(end - start).toFixed(3)}s: ` +
      "that is videoDuration in constants/design-engineering/components.ts"
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
    join(OUT, `point-and-shoot-overview-${theme}-poster.webp`),
  ]);
  console.log(`point-and-shoot-overview-${theme}-poster.webp`);

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
