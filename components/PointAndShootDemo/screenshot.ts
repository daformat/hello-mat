/*
 * A dragged area, as a picture. Glea takes a real screenshot (the app asks
 * Chromium for one, the extensions ask the browser), but a page can't read
 * its own pixels, so this draws the page into a canvas instead, with
 * modern-screenshot, loaded on the first drag. Ported from glea.app's demo.
 */

import type { Rect } from "@daformat/point-and-shoot";

/** Never in the picture: the demo's own furniture, and the overlay. */
const HIDE = "[data-pns-ignore], point-and-shoot";

/**
 * As far up as the drawing goes: the article. Past it is the site's own
 * frame (its header, its table of contents), which modern-screenshot draws
 * blank as a whole even though each part draws on its own; any of the area
 * that is outside the article is the background.
 */
const LIMIT = "[data-pns-screenshot-root]";

/**
 * The area (viewport px) as a PNG blob URL, with its scale in the hash as
 * `#2x`, the way the Glea window reads a screenshot's density.
 */
export const screenshot = async (area: Rect): Promise<string> => {
  // Within the window.
  const x0 = Math.max(0, area.x);
  const y0 = Math.max(0, area.y);
  const rect = {
    x: x0,
    y: y0,
    width: Math.min(innerWidth, area.x + area.width) - x0,
    height: Math.min(innerHeight, area.y + area.height) - y0,
  };
  const { domToCanvas } = await import("modern-screenshot");

  // Only the smallest element holding the whole area is drawn (the page at
  // large has every code sample on it to encode).
  const at = (x: number, y: number) =>
    document
      .elementsFromPoint(x, y)
      .find((e) => !e.closest(HIDE) && !e.shadowRoot);
  const [first, last] = [
    at(rect.x + 1, rect.y + 1),
    at(rect.x + rect.width - 1, rect.y + rect.height - 1),
  ];
  const holds = (el: Element) => {
    const r = el.getBoundingClientRect();
    return (
      r.left <= rect.x &&
      r.top <= rect.y &&
      r.right >= rect.x + rect.width &&
      r.bottom >= rect.y + rect.height
    );
  };
  const limit = document.querySelector<HTMLElement>(LIMIT) ?? document.body;
  let root: HTMLElement =
    first instanceof HTMLElement && limit.contains(first) ? first : limit;
  while (root !== limit && !(last && root.contains(last) && holds(root))) {
    root = root.parentElement ?? limit;
  }
  const box = root.getBoundingClientRect();
  const scale = Math.min(2, devicePixelRatio || 1);

  // The first background behind it, so the picture isn't see-through.
  let background = "transparent";
  for (
    let e: HTMLElement | null = root;
    e && background === "transparent";
    e = e.parentElement
  ) {
    const color = getComputedStyle(e).backgroundColor;
    if (color && color !== "transparent" && color !== "rgba(0, 0, 0, 0)") {
      background = color;
    }
  }
  if (background === "transparent") {
    background = getComputedStyle(document.body).backgroundColor;
  }

  // Only the area's band of the root is drawn: the root keeps its width, so
  // its text wraps as on the page, is cut to the area's height, and its
  // content is shifted up by the area's offset. Drawing the whole root and
  // cropping after would make a canvas as tall as the root (the essay's
  // column is thousands of pixels), which browsers cap and draw blank.
  const top = rect.y - box.top;
  const bottom = rect.y + rect.height;
  const overlaps = (el: Element) => {
    const r = el.getBoundingClientRect();
    return (
      r.bottom > rect.y &&
      r.top < bottom &&
      r.right > rect.x &&
      r.left < rect.x + rect.width
    );
  };
  const picked: HTMLImageElement[] = [];
  const marked: HTMLElement[] = [];
  const band = await domToCanvas(root, {
    scale,
    backgroundColor: background,
    // Also how long it waits for its own drawing to load, which for a big
    // subtree (the essay's column) is a few hundred milliseconds: any less
    // and the picture comes back as the bare background. Not much more,
    // though, or it waits on every lazy image under the root.
    timeout: 1000,
    width: box.width,
    height: rect.height,
    // Scrolled boxes (Glea's journal) as they are on screen, not from the top.
    features: { restoreScrollPosition: true },
    style: { transform: `translateY(${-top}px)`, transformOrigin: "0 0" },
    // Left out: the overlay, which takes no room, and the videos that aren't
    // loaded or aren't in the area (cloning a video that hasn't loaded waits
    // for it forever, and a video's box is its frame's: leaving it out moves
    // nothing). Nothing else, not even what's below the area: a node left
    // out takes its room with it, and in a laid-out box (Glea's window is a
    // column that fills its height) that moves what's above it too.
    filter: (node) => {
      // Auto margins (anything centered with margin: auto) aren't always
      // copied: the clone gets the pixels they come to, measured from the
      // parent's content box (mid-capture, Chrome reports an auto margin as
      // 0).
      if (
        node instanceof HTMLElement &&
        "computedStyleMap" in node &&
        node.parentElement
      ) {
        const map = node.computedStyleMap();
        const autos = (["Left", "Right"] as const).filter(
          (side) => String(map.get(`margin-${side.toLowerCase()}`)) === "auto"
        );
        if (autos.length) {
          const r = node.getBoundingClientRect();
          const p = node.parentElement.getBoundingClientRect();
          const ps = getComputedStyle(node.parentElement);
          const k = node.offsetWidth ? r.width / node.offsetWidth : 1;
          const used = {
            Left:
              (r.left - p.left) / k -
              parseFloat(ps.borderLeftWidth) -
              parseFloat(ps.paddingLeft),
            Right:
              (p.right - r.right) / k -
              parseFloat(ps.borderRightWidth) -
              parseFloat(ps.paddingRight),
          };
          for (const side of autos) {
            node.dataset[`pnsMargin${side}`] = `${Math.max(0, used[side])}px`;
          }
          marked.push(node);
        }
      }
      // A picture's image: the clone draws the one the browser picked, as a
      // plain src (modern-screenshot inlines an image's src, not its
      // picture's sources, which then fail to load in the drawing).
      if (
        node instanceof HTMLImageElement &&
        node.parentElement?.localName === "picture" &&
        node.currentSrc
      ) {
        node.dataset.pnsSrc = node.currentSrc;
        picked.push(node);
      }
      if (
        node instanceof HTMLSourceElement &&
        node.parentElement?.localName === "picture"
      ) {
        return false;
      }
      return !(
        node instanceof Element &&
        (node.localName === "point-and-shoot" ||
          (node instanceof HTMLVideoElement &&
            (node.readyState < 2 || !overlaps(node))))
      );
    },
    // The demo's controls and the videos keep their room but aren't drawn
    // (the videos are, below, as their frame of the moment: the library would
    // fetch the whole file).
    // Last, on the finished drawing (modern-screenshot writes margins more
    // than once, the last as 0): the auto margins read above, as pixels.
    onCreateForeignObjectSvg: (svg) => {
      for (const el of Array.from(
        svg.querySelectorAll<HTMLElement>(
          "[data-pns-margin-left], [data-pns-margin-right]"
        )
      )) {
        for (const side of ["Left", "Right"] as const) {
          const value = el.dataset[`pnsMargin${side}`];
          if (value) {
            el.style.setProperty(
              `margin-${side.toLowerCase()}`,
              value,
              "important"
            );
            delete el.dataset[`pnsMargin${side}`];
          }
        }
      }
    },
    onCloneEachNode: (cloned) => {
      if (cloned instanceof HTMLImageElement && cloned.dataset.pnsSrc) {
        cloned.removeAttribute("srcset");
        cloned.removeAttribute("sizes");
        cloned.removeAttribute("loading");
        cloned.src = cloned.dataset.pnsSrc;
        delete cloned.dataset.pnsSrc;
      }
      if (
        cloned instanceof HTMLElement &&
        (cloned.matches("[data-pns-ignore]") || cloned.localName === "video")
      ) {
        cloned.style.setProperty("visibility", "hidden", "important");
      }
    },
  });
  picked.forEach((img) => delete img.dataset.pnsSrc);
  marked.forEach((el) => {
    delete el.dataset.pnsMarginLeft;
    delete el.dataset.pnsMarginRight;
  });

  // Videos are drawn here, as their frame of the moment (the library would
  // fetch the whole file).
  const ctx = band.getContext("2d");
  for (const video of Array.from(root.querySelectorAll("video"))) {
    const r = video.getBoundingClientRect();
    if (!ctx || r.bottom <= rect.y || r.top >= bottom || !video.videoWidth) {
      continue;
    }
    ctx.save();
    ctx.scale(scale, scale);
    ctx.drawImage(video, r.left - box.left, r.top - rect.y, r.width, r.height);
    ctx.restore();
  }

  // The band is the root's width: the area is a slice of it, and whatever
  // of the area is past the root's sides is the background.
  const left = rect.x - box.left;
  const shot = document.createElement("canvas");
  shot.width = Math.round(rect.width * scale);
  shot.height = Math.round(rect.height * scale);
  const out = shot.getContext("2d");
  if (out) {
    out.fillStyle = background;
    out.fillRect(0, 0, shot.width, shot.height);
    const from = Math.max(0, left);
    const to = Math.min(box.width, left + rect.width);
    if (to > from) {
      out.drawImage(
        band,
        from * scale,
        0,
        (to - from) * scale,
        shot.height,
        (from - left) * scale,
        0,
        (to - from) * scale,
        shot.height
      );
    }
  }
  // Point-sized, like the app's: half the pixels on a 2x screen.
  const blob = await new Promise<Blob | null>((done) =>
    shot.toBlob(done, "image/png")
  );
  if (!blob) {
    throw new Error("The area couldn't be drawn.");
  }
  return `${URL.createObjectURL(blob)}#${scale}x`;
};
