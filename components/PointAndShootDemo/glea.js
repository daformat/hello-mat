// Ported from glea-site/assets/glea/glea.js: Glea's journal window as the app
// draws it, from the same Markdown. The site's prototype, unchanged but for
// being a module (the classes are exported rather than set on window) and the
// symbols' path, which is this site's media folder.
// Glea's journal as the app renders it, from the same Markdown: live
// Markdown with the syntax hidden, folding sections, collapsible media and
// the contents rail, with the app's own timings (glea/src/app). Prototype.
//
//   const view = new GleaView(element, { markdown, title: 'Today', assets: '/assets/glea/' });
//   view.setMarkdown(markdown);   // re-renders, keeping folds and collapsed media

const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Curves -------------------------------------------------------------
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const x = (t) => ((ax * t + bx) * t + cx) * t;
  const y = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (p) => {
    let t = p;
    for (let i = 0; i < 8; i++) {
      const e = x(t) - p,
        d = dx(t);
      if (Math.abs(e) < 1e-6 || !d) break;
      t -= e / d;
    }
    return y(Math.min(1, Math.max(0, t)));
  };
}
const FOLD = "cubic-bezier(0.33, 1, 0.68, 1)"; // Motion.foldDuration curve
const MEDIA = "cubic-bezier(0.42, 0, 0.25, 1)"; // CubicBezier.media
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)"; // Motion.easeOut
const EASE_IN_OUT = "cubic-bezier(0.42, 0, 0.58, 1)";
const easeOut = bezier(0.16, 1, 0.3, 1);

// --- Markdown -------------------------------------------------------------
const esc = (t) =>
  t.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
function inline(src) {
  const codes = [];
  let s = esc(src).replace(
    /`([^`]+)`/g,
    (_, c) => `\u0000${codes.push(c) - 1}\u0000`
  );
  s = s
    .replace(
      /\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g,
      (_, name, head, alias) => `<a class="wiki">${alias || name || head}</a>`
    )
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, "$1")
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    )
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>")
    .replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, "$1<i>$2</i>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/==([^=]+)==/g, "<mark>$1</mark>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

// Lines become blocks: { type, depth (heading), text, ... }.
function parse(md) {
  const out = [];
  let fence = null;
  md.replace(/\r/g, "")
    .split("\n")
    .forEach((line, i) => {
      if (fence !== null) {
        if (/^\s*(```|~~~)/.test(line)) {
          out.push({
            type: "code",
            lines: fence.lines,
            line: fence.line,
            end: i + 1,
          });
          fence = null;
        } else fence.lines.push(line);
        return;
      }
      let m;
      const at = (b) => out.push({ ...b, line: i });
      if (/^\s*(```|~~~)/.test(line)) fence = { lines: [], line: i };
      else if ((m = line.match(/^(#{1,6})\s+(.*)$/)))
        at({ type: "h", level: m[1].length, text: m[2] });
      else if ((m = line.match(/^(\s*)([-*+])\s\[([ xX])\]\s?(.*)$/)))
        at({
          type: "li",
          pre: `${m[1]}${m[2]} [${m[3]}] `,
          bulletAt: m[1],
          task: m[3] !== " ",
          text: m[4],
        });
      else if ((m = line.match(/^(\s*)([-*+])\s(.*)$/)))
        at({ type: "li", pre: `${m[1]}${m[2]} `, bulletAt: m[1], text: m[3] });
      else if ((m = line.match(/^(\s*)(\d+[.)])\s(.*)$/)))
        at({
          type: "li",
          pre: `${m[1]}${m[2]} `,
          number: m[2],
          indent: m[1],
          text: m[3],
        });
      else if ((m = line.match(/^>\s?(.*)$/))) at({ type: "q", text: m[1] });
      else if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/)))
        at({ type: "media", alt: m[1], src: m[2] });
      else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) at({ type: "hr" });
      else at({ type: "p", text: line });
    });
  if (fence)
    out.push({
      type: "code",
      lines: fence.lines,
      line: fence.line,
      end: Infinity,
    });
  return out;
}

// Blocks for the grip, as MarkdownStyler.blocks(in:): a heading takes its
// section, a list item its nested items, a quote or table all of itself, a
// code block its fences; a "— source" line goes with what it credits.
// Blank lines aren't blocks. [{ start, end }] in lines, nested ones included.
const FENCE = /^\s*(```|~~~)/,
  HEAD = /^(#{1,6})\s+/,
  LIST = /^(\s*)([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/;
const isQuote = (l) => l.trim().startsWith(">"),
  isTable = (l) => l.trim().startsWith("|"),
  isCredit = (l) => l.trim().startsWith("— ");
function inFences(lines) {
  const inside = [],
    fence = [];
  let open = false;
  lines.forEach((l, i) => {
    fence[i] = FENCE.test(l);
    if (fence[i]) {
      inside[i] = false;
      open = !open;
      fence[i] = open ? "open" : "close";
    } else inside[i] = open;
  });
  return { inside, fence };
}
function blocksOf(lines) {
  const n = lines.length,
    { inside, fence } = inFences(lines);
  const blank = (i) => !lines[i].trim();
  const indent = (i) => lines[i].match(/^[ \t]*/)[0].length;
  const level = (i) =>
    (!inside[i] && !fence[i] && (lines[i].match(HEAD) || [])[1]?.length) || 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    if (fence[i] === "open") {
      let end = i + 1;
      while (end < n && fence[end] !== "close") end++;
      out.push({ start: i, end: Math.min(n, end + 1) });
      continue;
    }
    if (fence[i] || inside[i] || blank(i)) continue;
    if (isCredit(lines[i]) && i > 0 && !blank(i - 1) && !level(i - 1)) continue;
    let end = i + 1;
    const L = level(i);
    if (L) {
      while (end < n && !(level(end) && level(end) <= L)) end++;
    } else if (LIST.test(lines[i])) {
      while (end < n && !blank(end) && indent(end) > indent(i)) end++;
    } else if (isQuote(lines[i])) {
      if (i > 0 && isQuote(lines[i - 1])) continue;
      while (end < n && isQuote(lines[end])) end++;
    } else if (isTable(lines[i])) {
      if (i > 0 && isTable(lines[i - 1])) continue;
      while (end < n && isTable(lines[end])) end++;
    }
    if (!L && end < n && !inside[end] && isCredit(lines[end])) end++;
    while (end > i + 1 && blank(end - 1)) end--;
    out.push({ start: i, end });
  }
  return out;
}

// MarkdownStyler.moving: the lines with [a, b) moved before line `target`
// (null when that changes nothing). Quotes and tables that would merge
// with their new neighbours get a blank line between.
function moving(lines, a, b, target) {
  if (target >= a && target <= b) return null;
  const out = lines.slice();
  const moved = out.splice(a, b - a);
  const kind = (l) =>
    l === undefined ? null : isQuote(l) ? "q" : isTable(l) ? "t" : null;
  if (
    a > 0 &&
    a < out.length &&
    kind(out[a - 1]) &&
    kind(out[a - 1]) === kind(out[a])
  )
    out.splice(a, 0, "");
  let at = target > a ? target - (b - a) : target;
  if (at > a && out.length > lines.length - (b - a)) at += 1;
  out.splice(at, 0, ...moved);
  let start = at;
  const after = at + moved.length;
  if (kind(out[after - 1]) && kind(out[after - 1]) === kind(out[after]))
    out.splice(after, 0, "");
  if (at > 0 && kind(out[at]) && kind(out[at]) === kind(out[at - 1])) {
    out.splice(at, 0, "");
    start += 1;
  }
  const text = out.join("\n");
  return text === lines.join("\n")
    ? null
    : { lines: out, start, length: moved.length };
}

// --- Icons ----------------------------------------------------------------
// chevron.right, 12pt semibold, as the system draws it.
const CHEVRON =
  '<span class="gl-sym" style="--m:url(/media/design-engineering/point-and-shoot/glea/sym/fold.png);width:10px;height:13px"></span>';
const GRIP =
  '<svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor">' +
  [0, 1, 2]
    .flatMap((r) =>
      [0, 1].map(
        (c) => `<circle cx="${4.75 + c * 5}" cy="${4.25 + r * 5}" r="1.25"/>`
      )
    )
    .join("") +
  "</svg>";
// arrow.down.right.and.arrow.up.left / arrow.up.left.and.arrow.down.right, 10pt semibold.
const ARROWS_IN =
  '<span class="gl-sym" style="--m:url(/media/design-engineering/point-and-shoot/glea/sym/collapse.png);width:12px;height:12px"></span>';
const ARROWS_OUT =
  '<span class="gl-sym" style="--m:url(/media/design-engineering/point-and-shoot/glea/sym/expand.png);width:12px;height:12px"></span>';
const PHOTO =
  '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3" y="5" width="20" height="16" rx="3"/><circle cx="9" cy="10.5" r="1.8"/><path d="M3.5 18l5.5-5 4 3.5 3.5-3 6 5"/></svg>';

// --- The view ---------------------------------------------------------------
class GleaView {
  constructor(
    root,
    {
      markdown = "",
      title = "Today",
      date = new Date(),
      assets = "",
      resolve = null,
      onChange = null,
    } = {}
  ) {
    this.root = root;
    this.onChange = onChange; // (markdown) after the view changed it (a block moved)
    this.assets = assets;
    this.resolve = resolve; // (src) => URL, for images the page made itself
    this.folded = new Set(); // heading keys
    this.collapsed = new Set(); // media keys
    root.classList.add("gl");
    root.innerHTML = `<div class="gl-scroll"><div class="gl-col">
        <h1 class="gl-title" data-no-toc>${esc(title)}</h1>
        <div class="gl-date">${esc(
          date.toLocaleDateString(undefined, { weekday: "long" }) +
            ", " +
            date.toLocaleDateString(undefined, { dateStyle: "long" })
        )}</div>
        <div class="gl-editor"></div>
      </div></div><nav class="gl-toc" aria-label="Contents"></nav>`;
    this.scroller = root.querySelector(".gl-scroll");
    this.col = root.querySelector(".gl-col");
    this.editor = root.querySelector(".gl-editor");
    this.titleEl = root.querySelector(".gl-title");
    this.toc = new Toc(this);
    this.scroller.addEventListener("scroll", () => this.toc.update(), {
      passive: true,
    });
    new ResizeObserver(() => {
      this.layoutMedia();
      this.positionGutter();
      this.toc.layout();
    }).observe(root);
    this.drag = new BlockDrag(this);
    this.setMarkdown(markdown);
  }

  setMarkdown(md) {
    this.markdown = md;
    const blocks = parse(md);
    this.editor.textContent = "";
    this.headings = [];
    const seen = {};
    const key = (s) => {
      seen[s] = (seen[s] || 0) + 1;
      return s + "#" + seen[s];
    };

    // Sections nest: a heading holds what follows it until a heading of its
    // level or higher. Content sits 20px in per enclosing heading below the first.
    const stack = [{ level: 0, el: this.editor }];
    let quote = null;
    for (const b of blocks) {
      if (b.type === "h") {
        while (stack.length > 1 && stack[stack.length - 1].level >= b.level)
          stack.pop();
        const depth = stack.length - 1;
        const sec = document.createElement("div");
        sec.className = "gl-sec";
        const h = document.createElement("div");
        h.className = `gl-ln gl-h gl-h${b.level}`;
        h.dataset.line = b.line;
        h.style.marginLeft = depth * 20 + "px";
        h.innerHTML = `<span class="gl-ht">${inline(b.text)}</span>`;
        const body = document.createElement("div");
        body.className = "gl-sec-body";
        sec.append(h, body);
        stack[stack.length - 1].el.append(sec);
        const k = key("h:" + b.text);
        const entry = {
          el: h,
          sec,
          body,
          key: k,
          title: h.textContent,
          depth: depth + 1,
          chev: null,
        };
        this.headings.push(entry);
        stack.push({ level: b.level, el: body, entry });
        quote = null;
        continue;
      }
      const parent = stack[stack.length - 1].el;
      const indent = Math.max(0, stack.length - 2) * 20;
      let el;
      if (b.type === "q") {
        if (!quote) {
          quote = document.createElement("div");
          quote.className = "gl-quote";
          quote.style.marginLeft = indent + "px";
          quote.innerHTML = '<div class="gl-bar"></div>';
          parent.append(quote);
        }
        el = document.createElement("div");
        el.className = "gl-ln q";
        el.dataset.line = b.line;
        el.innerHTML = inline(b.text) || "";
        quote.append(el);
        continue;
      }
      quote = null;
      if (b.type === "media") el = this.media(b, key("m:" + b.src));
      else {
        el = document.createElement("div");
        if (b.type === "li") {
          el.className = "gl-ln li" + (b.task ? " done" : "");
          const pre = document.createElement("span");
          pre.className = "gl-pre";
          pre.textContent = b.pre;
          if (b.number) {
            pre.style.color = "var(--gl-tertiary)";
          } else {
            const dot = document.createElement("i");
            dot.className = "gl-dot";
            dot.dataset.at = b.bulletAt.length;
            pre.append(dot);
            if (b.pre.includes("[")) {
              const box = document.createElement("i");
              box.className = "gl-box" + (b.task ? " on" : "");
              pre.append(box);
              // At the "[", plus 1 (its offset is measured once laid out).
              box.dataset.at = b.pre.indexOf("[");
            }
          }
          const txt = document.createElement("span");
          txt.className = "gl-txt";
          txt.innerHTML = inline(b.text);
          el.append(pre, txt);
        } else if (b.type === "hr") {
          el.className = "gl-ln gl-hr";
        } else if (b.type === "code") {
          el.className = "gl-ln";
          el.innerHTML = `<code>${esc(b.lines.join("\n"))}</code>`;
        } else {
          el.className = "gl-ln";
          el.innerHTML = inline(b.text);
        }
      }
      el.style.marginLeft = indent + "px";
      el.dataset.line = b.line;
      if (b.end) el.dataset.end = b.end;
      parent.append(el);
    }

    // Chevrons for headings whose section has a body.
    for (const h of this.headings) {
      if (!h.body.childElementCount) continue;
      const chev = document.createElement("button");
      chev.className = "gl-chev";
      chev.setAttribute("aria-label", "Fold section");
      chev.innerHTML = CHEVRON;
      h.el.append(chev);
      h.chev = chev;
      h.angle = this.folded.has(h.key) ? 0 : 90;
      chev.querySelector(".gl-sym").style.rotate = h.angle + "deg";
      if (this.folded.has(h.key)) {
        h.body.style.height = "0px";
        h.body.style.overflow = "hidden";
        h.body.style.opacity = 0;
        h.sec.classList.add("folded");
      }
      chev.addEventListener("click", () => this.toggleFold(h));
    }
    this.positionGutter();
    this.layoutMedia();
    this.drag.reset();
    this.toc.setEntries([
      { title: this.titleEl.textContent, depth: 0, el: this.titleEl },
      ...this.headings.map((h) => ({
        title: h.title,
        depth: h.depth,
        el: h.el.querySelector(".gl-ht"),
        heading: h,
      })),
    ]);
  }

  // Gutter marks sit on each block's first line: the chevron's center 14px
  // left of the text, at the heading's baseline minus half its cap height.
  positionGutter() {
    for (const h of this.headings) {
      const size = parseFloat(getComputedStyle(h.el).fontSize);
      const lh = parseFloat(getComputedStyle(h.el).lineHeight);
      // The CSS line box starts 1.5 above AppKit's; the glyph box (ascent +
      // descent, ~1.193em) sits at its top in AppKit.
      const baseline = 1.5 + 0.952 * size + (lh - 3 - 1.193 * size) / 2;
      const center = baseline - (0.705 * size) / 2;
      if (h.chev) h.chev.style.top = center - 8 + "px";
      h.center = center;
    }
    // Bullets 1.5 right of the marker's place, checkboxes 1 right of the "[".
    for (const mark of this.editor.querySelectorAll(".gl-dot, .gl-box")) {
      const pre = mark.parentElement;
      const r = document.createRange();
      r.setStart(pre.firstChild, +mark.dataset.at);
      r.setEnd(pre.firstChild, +mark.dataset.at + 1);
      mark.style.left =
        (r.getBoundingClientRect().left - pre.getBoundingClientRect().left) /
          this.k() +
        (mark.classList.contains("gl-dot") ? 1.5 : 1) +
        "px";
    }
    for (const q of this.editor.querySelectorAll(".gl-quote")) {
      // From the first line's top + 2 to the last baseline + descender.
      const lines = q.querySelectorAll(".gl-ln");
      const first = lines[0].offsetTop + 1.5 + 1;
      const last = lines[lines.length - 1].offsetTop + 1.5 + 14.28 + 3.62;
      const bar = q.querySelector(".gl-bar");
      bar.style.top = first + "px";
      bar.style.height = last - first + "px";
    }
  }

  // --- Folding ----------------------------------------------------------
  toggleFold(h, open = this.folded.has(h.key)) {
    if (open === !this.folded.has(h.key)) return;
    open ? this.folded.delete(h.key) : this.folded.add(h.key);
    h.sec.classList.toggle("folded", !open);
    const d = reduce() ? 0 : 280;
    const svg = h.chev.querySelector(".gl-sym");
    const from = parseFloat(getComputedStyle(svg).rotate) || 0;
    svg.getAnimations().forEach((a) => a.cancel());
    svg.style.rotate = (open ? 90 : 0) + "deg";
    svg.animate(
      { rotate: [from + "deg", (open ? 90 : 0) + "deg"] },
      { duration: d, easing: FOLD }
    );
    const body = h.body;
    const current = parseFloat(getComputedStyle(body).height) || 0;
    const currentOpacity = getComputedStyle(body).opacity;
    body.getAnimations().forEach((a) => a.cancel());
    body.style.height = "";
    const full = body.scrollHeight;
    const to = open ? full : 0;
    body.style.overflow = "hidden";
    body.style.height = to + "px";
    body.style.opacity = open ? 1 : 0;
    const a = body.animate(
      {
        height: [current + "px", to + "px"],
        opacity: [currentOpacity, open ? 1 : 0],
      },
      { duration: d, easing: FOLD }
    );
    a.onfinish = () => {
      if (open) {
        body.style.height = "";
        body.style.overflow = "";
      }
      this.toc.update();
    };
    this.toc.update();
  }

  // --- Media ------------------------------------------------------------
  media(b, key) {
    const el = document.createElement("div");
    el.className = "gl-media";
    el.dataset.key = key;
    // resolve() may answer false: the file isn't there yet (a screenshot
    // being saved), so the block shows the loading placeholder meanwhile.
    const resolved = this.resolve?.(b.src);
    const src =
      resolved === false
        ? ""
        : resolved || b.src.replace(/^(\.\.\/)?assets\//, this.assets);
    // A video (by its extension, as Media.isPlayable; and WebM, which
    // browsers play) gets a player, paused on its first frame.
    const video = /\.(mp4|mov|m4v|webm)([?#]|$)/i.test(src || b.src);
    const title = b.alt || src.split("/").pop();
    // (Only a page's address gets the ↗ after its title.)
    el.innerHTML = `<div class="gl-row"><span class="thumb">${
      video
        ? `<video muted playsinline preload="metadata"${
            src ? ` src="${esc(src)}"` : ""
          }></video>`
        : `<img alt=""${src ? ` src="${esc(src)}"` : ""}>`
    }</span><span class="t">${esc(title)}</span>${
      /^https?:/.test(src) ? '<span class="go"> ↗</span>' : ""
    }</div>
      <div class="gl-clip">${
        video
          ? `<video playsinline controls preload="metadata"${
              src ? ` src="${esc(src)}"` : ""
            }></video>`
          : `<img alt="${esc(b.alt)}"${src ? ` src="${esc(src)}"` : ""}>`
      }</div>
      <button class="gl-toggle" type="button"></button><div class="gl-handle"></div>`;
    const img = el.querySelector(".gl-clip img, .gl-clip video");
    el._img = img;
    // (A "#2x" on the address: drawn at half its pixels, like a Retina screenshot.)
    const ratio = +(src.match(/#(\d+(?:\.\d+)?)x$/) || [0, 1])[1];
    const natural = () =>
      video
        ? [img.videoWidth, img.videoHeight]
        : [img.naturalWidth, img.naturalHeight];
    const ready = () => {
      const [w, h] = natural();
      el._w = w / ratio;
      el._h = h / ratio;
      this.layoutMedia();
    };
    if (video ? img.readyState >= 1 : img.complete && img.naturalWidth) ready();
    else {
      // Loading: the app's placeholder, the image hidden until it arrives.
      el.querySelector(".gl-clip").insertAdjacentHTML(
        "beforeend",
        `<div class="gl-ph">${PHOTO}</div>`
      );
      el._w = 224;
      el._h = 56;
      img.style.visibility = "hidden";
      // Loaded: the block grows from the loading box to the media's size
      // (relayout, 0.3s on the media curve; the media scaled to the box
      // from its top-left) while the content fades in (0.3s ease-out).
      img.addEventListener(video ? "loadedmetadata" : "load", () => {
        img.style.visibility = "";
        el.querySelector(".gl-ph")?.remove();
        ready();
        const { w, h } = this.size(el);
        if (this.collapsed.has(key) || reduce() || !w || !h) return;
        const clip = el.querySelector(".gl-clip");
        const o = { duration: 300, easing: MEDIA };
        clip.animate(
          { width: ["224px", w + "px"], height: ["56px", h + "px"] },
          o
        );
        el.animate({ height: ["56px", h + "px"] }, o);
        img.animate({ scale: [Math.min(224 / w, 56 / h), 1] }, o);
        clip.animate({ opacity: [0, 1] }, { duration: 300, easing: EASE_OUT });
        setTimeout(() => this.toc.update(), 300);
      });
    }
    const toggle = () => this.setCollapsed(el, !this.collapsed.has(key));
    el.querySelector(".gl-toggle").addEventListener("click", toggle);
    el.querySelector(".gl-row .thumb").addEventListener("click", toggle);
    el.querySelector(".gl-row .t").addEventListener("click", () =>
      window.open(src, "_blank", "noopener")
    );
    this.resizable(el);
    return el;
  }

  // The media's shown size: its own, fitted to the column (or a dragged
  // width) and at most 520 tall.
  size(el) {
    const max = el.parentElement
      ? el.parentElement.clientWidth - parseFloat(el.style.marginLeft || 0)
      : 700;
    let w = Math.min(el._w, el._width || Infinity, max),
      h = el._h * (w / el._w);
    if (h > 520) {
      w *= 520 / h;
      h = 520;
    }
    return { w: Math.round(w), h: Math.round(h) };
  }

  layoutMedia() {
    for (const el of this.editor.querySelectorAll(".gl-media")) {
      if (el._animating) continue;
      const { w, h } = this.size(el);
      const c = this.collapsed.has(el.dataset.key);
      const clip = el.querySelector(".gl-clip");
      el._img.style.width = w + "px";
      el._img.style.height = h + "px";
      el._img.style.scale = c ? 0 : 1;
      clip.style.width = (c ? 0.4 * w : w) + "px";
      clip.style.height = (c ? 0 : h) + "px";
      clip.style.opacity = c ? 0 : 1;
      el.style.height = (c ? 26 : h) + "px";
      el.classList.toggle("collapsed", c);
      el.querySelector(".gl-row").style.opacity = c ? 1 : 0;
      const t = el.querySelector(".gl-toggle");
      t.innerHTML = (c ? ARROWS_OUT : ARROWS_IN) + (c ? "expand" : "collapse");
      t.style.left =
        this.editor.clientWidth -
        parseFloat(el.style.marginLeft || 0) +
        14 +
        "px";
      t.style.top = (26 - 16) / 2 - 1 + "px";
      const handle = el.querySelector(".gl-handle");
      const len = Math.min(44, h - 4);
      handle.style.left = w + 5 - 6 + "px";
      handle.style.height = Math.max(24, len) + "px";
      handle.style.top = h / 2 - Math.max(24, len) / 2 + "px";
      handle.style.setProperty("--len", len + "px");
    }
  }

  setCollapsed(el, c) {
    const key = el.dataset.key;
    if (c === this.collapsed.has(key)) return;
    c ? this.collapsed.add(key) : this.collapsed.delete(key);
    const { w, h } = this.size(el);
    const d = reduce() ? 0 : 300;
    const clip = el.querySelector(".gl-clip");
    const row = el.querySelector(".gl-row");
    const now = (node, p) => getComputedStyle(node)[p];
    const from = {
      cw: now(clip, "width"),
      ch: now(clip, "height"),
      co: now(clip, "opacity"),
      s: now(el._img, "scale"),
      bh: now(el, "height"),
      ro: now(row, "opacity"),
      io: now(el._img, "opacity"),
    };
    [el, clip, row, el._img].forEach((n) =>
      n.getAnimations().forEach((a) => a.cancel())
    );
    this.layoutMedia();
    const o = { duration: d, easing: MEDIA };
    clip.animate(
      {
        width: [from.cw, (c ? 0.4 * w : w) + "px"],
        height: [from.ch, (c ? 0 : h) + "px"],
        opacity: [from.co, c ? 0 : 1],
      },
      o
    );
    el._img.animate({ scale: [from.s === "none" ? 1 : from.s, c ? 0 : 1] }, o);
    el._img.animate(
      c ? { opacity: [from.io, 0] } : { opacity: [0, 1] },
      c
        ? {
            duration: reduce() ? 0 : 200,
            easing: EASE_IN_OUT,
            fill: "forwards",
          }
        : { duration: reduce() ? 0 : 250, easing: EASE_OUT }
    );
    el.animate({ height: [from.bh, (c ? 26 : h) + "px"] }, o);
    row.animate(
      { opacity: [from.ro, c ? 1 : 0] },
      { duration: d, easing: c ? "cubic-bezier(0.7, 0, 0.84, 0)" : EASE_OUT }
    );
    setTimeout(() => this.toc.update(), d);
  }

  // Drag the bar right of the media to resize it (min 48, max the column).
  resizable(el) {
    const handle = el.querySelector(".gl-handle");
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      handle.classList.add("drag");
      const start = e.clientX,
        w0 = this.size(el).w;
      const move = (ev) => {
        el._width = Math.max(48, w0 + (ev.clientX - start) / this.k());
        this.layoutMedia();
      };
      const up = () => {
        handle.classList.remove("drag");
        handle.removeEventListener("pointermove", move);
        this.toc.update();
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up, { once: true });
    });
  }

  // Screen pixels per CSS pixel, when the view is drawn scaled (CSS zoom).
  k() {
    return (
      this.root.getBoundingClientRect().width / (this.root.offsetWidth || 1) ||
      1
    );
  }

  // --- Scrolling to a heading (from the rail) ---------------------------
  reveal(entry) {
    // Folded sections around it open first, at once.
    for (const h of this.headings) {
      if (this.folded.has(h.key) && h.body.contains(entry.el)) {
        this.folded.delete(h.key);
        h.body.style.height = "";
        h.body.style.overflow = "";
        h.body.style.opacity = "";
        h.chev.querySelector(".gl-sym").style.rotate = "90deg";
        h.sec.classList.remove("folded");
      }
    }
  }

  scrollTo(entry, done) {
    this.reveal(entry);
    const top = (el) =>
      (el.getBoundingClientRect().top -
        this.scroller.getBoundingClientRect().top) /
        this.k() +
      this.scroller.scrollTop;
    const max = this.scroller.scrollHeight - this.scroller.clientHeight;
    const target = Math.max(0, Math.min(max, top(entry.el) - 40));
    const start = this.scroller.scrollTop,
      t0 = performance.now(),
      d = reduce() ? 0 : 500;
    cancelAnimationFrame(this.scrollFrame);
    const step = (now) => {
      const p = d ? Math.min(1, (now - t0) / d) : 1;
      this.scroller.scrollTop = start + (target - start) * easeOut(p);
      if (p < 1) this.scrollFrame = requestAnimationFrame(step);
      else done?.();
    };
    this.scrollFrame = requestAnimationFrame(step);
    this.highlight(entry.el);
  }

  // The destination's text, washed in the accent, fading after 0.5s.
  highlight(el) {
    const r = el.getBoundingClientRect(),
      c = this.col.getBoundingClientRect(),
      k = this.k();
    const hl = document.createElement("div");
    hl.className = "gl-hl";
    Object.assign(hl.style, {
      position: "absolute",
      left: (r.left - c.left) / k - 8 + "px",
      top: (r.top - c.top) / k - 2 + "px",
      width: r.width / k + 16 + "px",
      height: r.height / k + 4 + "px",
      borderRadius: "8px",
      background: "var(--gl-wash)",
      pointerEvents: "none",
      zIndex: 0,
    });
    this.col.prepend(hl);
    hl.animate(
      { opacity: [1, 0] },
      {
        delay: 500,
        duration: reduce() ? 0 : 1100,
        easing: EASE_IN_OUT,
        fill: "forwards",
      }
    ).onfinish = () => hl.remove();
  }

  // Scrolls the page's end into view (after a capture).
  scrollToEnd() {
    this.scroller.scrollTo({
      top: this.scroller.scrollHeight,
      behavior: reduce() ? "auto" : "smooth",
    });
  }
}

// --- Dragging blocks by their grip (NoteGutterView, MarkdownEditor.swift) ---
// The gutter is 48 wide, left of the text. Coordinates below are relative
// to the editor's top-left, in CSS pixels (the view may be zoomed).
const EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)"; // Motion.standard
class BlockDrag {
  constructor(view) {
    this.view = view;
    const col = view.col;
    this.grip = document.createElement("div");
    this.grip.className = "gl-dgrip";
    this.grip.innerHTML = GRIP;
    this.grip.hidden = true;
    col.append(this.grip);
    this.grip.addEventListener("pointerdown", (e) => this.lift(e));
    view.root.addEventListener("pointermove", (e) => {
      this.pointer = e;
      if (!this.dragging) this.hover();
    });
    view.root.addEventListener("pointerleave", () => {
      this.pointer = null;
      if (!this.dragging) this.show(null);
    });
    view.scroller.addEventListener(
      "scroll",
      () => {
        if (!this.dragging) this.hover();
      },
      { passive: true }
    );
  }

  reset() {
    this.handles = null;
    if (!this.dragging) this.show(null);
  }

  // The editor's top in the column, unrounded (offsetTop rounds, and a
  // half-pixel off shows an image's edge past the blank).
  edTop() {
    return (
      (this.view.editor.getBoundingClientRect().top -
        this.view.col.getBoundingClientRect().top) /
      this.view.k()
    );
  }

  // A point in editor coordinates.
  local(e) {
    const r = this.view.editor.getBoundingClientRect(),
      k = this.view.k();
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  }
  rectOf(el) {
    const r = el.getBoundingClientRect(),
      e = this.view.editor.getBoundingClientRect(),
      k = this.view.k();
    return {
      top: (r.top - e.top) / k,
      bottom: (r.bottom - e.top) / k,
      left: (r.left - e.left) / k,
      width: r.width / k,
      height: r.height / k,
    };
  }
  // Elements drawn for source lines [a, b) that are showing (not in a folded section).
  elements(a, b) {
    return [...this.view.editor.querySelectorAll("[data-line]")].filter(
      (el) => {
        const l = +el.dataset.line;
        return l >= a && l < b && !el.closest(".gl-sec.folded > .gl-sec-body");
      }
    );
  }

  // One handle per block whose first line shows: its band (the union of
  // its lines) and the y of the grip's center (the first line's cap height).
  compute() {
    const lines = this.view.markdown.replace(/\r/g, "").split("\n");
    this.lines = lines;
    this.blocks = blocksOf(lines);
    this.handles = [];
    for (const b of this.blocks) {
      const els = this.elements(b.start, b.end);
      const first = els.find((el) => +el.dataset.line === b.start);
      if (!first) continue;
      const rects = els.map((el) => this.rectOf(el));
      const band = {
        top: Math.min(...rects.map((r) => r.top)),
        bottom: Math.max(...rects.map((r) => r.bottom)),
      };
      const fr = this.rectOf(first);
      // Text lines are drawn 1.5px above AppKit's line top (see glea.css).
      let center = fr.top + 1.5 + 14.28 - 5.3;
      if (first.classList.contains("gl-h"))
        center = fr.top + this.view.headings.find((h) => h.el === first).center;
      else if (first.classList.contains("gl-media")) center = fr.top + 17.5;
      this.handles.push({ ...b, els, band, center });
    }
  }

  // The pointer anywhere across the text, or the gutter to its left, shows
  // the grip of the innermost block at its height; the gaps between show none.
  hover() {
    if (!this.pointer) return this.show(null);
    if (!this.handles) this.compute();
    const p = this.local(this.pointer);
    const width = this.view.editor.clientWidth;
    const sr = this.view.scroller.getBoundingClientRect();
    const inView =
      this.pointer.clientY >= sr.top && this.pointer.clientY <= sr.bottom;
    let hit = null;
    if (inView && p.x >= -48 && p.x <= width) {
      for (const h of this.handles) {
        if (
          p.y >= h.band.top &&
          p.y <= h.band.bottom &&
          (!hit || h.band.bottom - h.band.top < hit.band.bottom - hit.band.top)
        )
          hit = h;
      }
    }
    this.show(hit, p);
  }

  show(h, p) {
    this.current = h;
    this.grip.hidden = !h;
    if (!h) return;
    const top = this.edTop();
    this.grip.style.top = top + h.center - 9 + "px";
    // Secondary over the grip (its 20 × 24 hit area), tertiary otherwise.
    const over =
      p && p.x >= -45 && p.x <= -25 && Math.abs(p.y - h.center) <= 12;
    this.grip.classList.toggle("over", !!over);
  }

  // Lifting: a copy of the block (with its gutter) scales to 1.06 and fades
  // to 0.5 around the grab point; its place is blanked; nothing else moves.
  lift(e) {
    const h = this.current;
    if (!h || e.button !== 0) return;
    e.preventDefault();
    this.dragging = h;
    const col = this.view.col,
      edTop = this.edTop(),
      width = this.view.editor.clientWidth;
    const rect = { top: h.band.top, height: h.band.bottom - h.band.top };
    const p = this.local(e);
    this.grab = Math.min(Math.max(p.y - rect.top, 0), rect.height);
    this.rect = rect;

    // Drop slots, fixed at lift: before each block start or blank line not
    // inside another block (headings aside), and the end of the note.
    const starts = new Set(this.blocks.map((b) => b.start));
    const inside = new Set();
    for (const b of this.blocks) {
      if (/^#{1,6}\s/.test(this.lines[b.start])) continue;
      for (let i = b.start + 1; i < b.end; i++) inside.add(i);
    }
    const lineEl = new Map();
    for (const el of this.elements(0, Infinity))
      if (!lineEl.has(+el.dataset.line)) lineEl.set(+el.dataset.line, el);
    this.targets = [];
    let last = 0;
    for (const [line, el] of lineEl) {
      const r = this.rectOf(el);
      last = Math.max(last, r.bottom);
      if (inside.has(line) && !starts.has(line)) continue;
      if (!starts.has(line) && this.lines[line].trim()) continue;
      const lineTop = el.classList.contains("gl-media")
        ? r.top - 4
        : r.top + 1.5;
      if (moving(this.lines, h.start, h.end, line))
        this.targets.push({ line, y: lineTop - 2 });
    }
    const endLine = this.lines.length;
    if (moving(this.lines, h.start, h.end, endLine))
      this.targets.push({ line: endLine, y: last + 2 });

    // The blank over its place, gutter included, and the copy above it.
    this.cover = document.createElement("div");
    this.cover.className = "gl-dcover";
    // (A pixel over each edge: on fractional positions, an image's
    // antialiased edge would show past it.)
    Object.assign(this.cover.style, {
      top: edTop + rect.top - 1 + "px",
      height: rect.height + 2 + "px",
      width: width + 48 + "px",
    });
    this.copy = document.createElement("div");
    this.copy.className = "gl-dcopy";
    Object.assign(this.copy.style, {
      top: edTop + rect.top + "px",
      height: rect.height + "px",
      width: width + 48 + "px",
      transformOrigin: `0 ${this.grab}px`,
    });
    const tops = new Set(),
      pairs = [];
    for (const el of h.els) {
      // Whole sections and quotes travel as themselves.
      let node = el.classList.contains("gl-h")
        ? el.parentElement
        : el.closest(".gl-quote") || el;
      if (tops.has(node) || [...tops].some((t) => t.contains(node))) continue;
      tops.add(node);
    }
    for (const node of tops) {
      const r = this.rectOf(node);
      const clone = node.cloneNode(true);
      // Margins that depend on where a line sits (the first line of the
      // note loses its spacing before) are kept as they are now.
      const originals = node.querySelectorAll(
        ".gl-ln, .gl-media, .gl-quote, .gl-sec, .gl-sec-body"
      );
      clone
        .querySelectorAll(".gl-ln, .gl-media, .gl-quote, .gl-sec, .gl-sec-body")
        .forEach((c, i) => {
          const cs = getComputedStyle(originals[i]);
          c.style.margin = `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`;
        });
      Object.assign(clone.style, {
        position: "absolute",
        margin: 0,
        left: 48 + r.left + "px",
        top: r.top - rect.top + "px",
        width: r.width + "px",
        height: r.height + "px",
      });
      this.copy.append(clone);
      pairs.push([node, clone]);
    }
    const grip = document.createElement("div");
    grip.className = "gl-dgrip over";
    grip.innerHTML = GRIP;
    grip.style.cssText = `left: 6px; top: ${h.center - rect.top - 9}px`;
    this.copy.append(grip);
    col.append(this.cover, this.copy);
    // Then each copy is nudged onto its original (margins collapse
    // differently once a section is lifted out of the page).
    const lineOf = (n) =>
      n.matches("[data-line]") ? n : n.querySelector("[data-line]");
    for (const [node, clone] of pairs) {
      const a = lineOf(node),
        b = lineOf(clone);
      if (!a || !b) continue;
      const k = this.view.k();
      const dy =
        (a.getBoundingClientRect().top - b.getBoundingClientRect().top) / k;
      const dx =
        (a.getBoundingClientRect().left - b.getBoundingClientRect().left) / k;
      clone.style.top = parseFloat(clone.style.top) + dy + "px";
      clone.style.left = parseFloat(clone.style.left) + dx + "px";
    }
    this.copy.animate(
      { scale: [1, 1.06], opacity: [1, 0.5] },
      { duration: BlockDragDebug.lift, easing: EASE, fill: "forwards" }
    );
    this.grip.hidden = true;
    this.view.root.classList.add("gl-dragging");

    this.indicator = document.createElement("div");
    this.indicator.className = "gl-drop";
    this.indicator.hidden = true;
    col.append(this.indicator);

    // Followed on the window: the hover grip hides now, and an element that
    // hides drops its pointer capture (and with it the drag's events).
    const move = (ev) => {
      if (ev.pointerId === e.pointerId) {
        this.pointer = ev;
        this.move();
      }
    };
    const up = (ev) => {
      if (ev.pointerId !== undefined && ev.pointerId !== e.pointerId) return;
      removeEventListener("pointermove", move, true);
      removeEventListener("pointerup", up, true);
      removeEventListener("pointercancel", up, true);
      removeEventListener("blur", up);
      cancelAnimationFrame(this.scrollFrame);
      this.drop();
    };
    addEventListener("pointermove", move, true);
    addEventListener("pointerup", up, true);
    addEventListener("pointercancel", up, true);
    addEventListener("blur", up);
    this.lastTick = performance.now();
    this.scrollFrame = requestAnimationFrame((t) => this.autoscroll(t));
    this.move();
  }

  // y only: the copy's top follows the pointer; the slot nearest that top
  // wins, unless the copy is nearer its own place (then no line, no move).
  move() {
    const p = this.local(this.pointer);
    const top = p.y - this.grab;
    this.copy.style.top = this.edTop() + top + "px";
    let nearest = null;
    for (const t of this.targets)
      if (!nearest || Math.abs(t.y - top) < Math.abs(nearest.y - top))
        nearest = t;
    const stay =
      !nearest || Math.abs(top - this.rect.top) < Math.abs(nearest.y - top);
    this.target = stay ? null : nearest;
    this.indicator.hidden = stay;
    if (!stay) {
      this.indicator.style.top = this.edTop() + nearest.y - 3 + "px";
      this.indicator.style.width = this.view.editor.clientWidth + 7 + "px";
    }
  }

  // Near the top or bottom (min(56, a quarter of the view)), the page
  // scrolls at up to 1400px/s, quadratically, while the pointer rests.
  autoscroll(now) {
    const dt = Math.min(0.05, (now - this.lastTick) / 1000);
    this.lastTick = now;
    const s = this.view.scroller,
      r = s.getBoundingClientRect(),
      k = this.view.k();
    const zone = Math.min(56, r.height / k / 4);
    const y = (this.pointer.clientY - r.top) / k,
      h = r.height / k;
    let pull = 0;
    if (y < zone) pull = -Math.min(1, (zone - y) / zone);
    else if (y > h - zone) pull = Math.min(1, (y - (h - zone)) / zone);
    if (pull) {
      const before = s.scrollTop;
      s.scrollTop += pull * Math.abs(pull) * 1400 * dt;
      if (s.scrollTop !== before) this.move();
    }
    this.scrollFrame = requestAnimationFrame((t) => this.autoscroll(t));
  }

  // Dropping: the lines move, the page re-lays out at once, the blank moves
  // to the block's new place, and the copy glides there (0.25s).
  drop() {
    const h = this.dragging;
    this.indicator.remove();
    let landing = this.rect.top;
    const result =
      this.target && moving(this.lines, h.start, h.end, this.target.line);
    if (result) {
      const md = result.lines.join("\n");
      const scroll = this.view.scroller.scrollTop;
      this.dragging = "landing";
      this.view.setMarkdown(md);
      this.view.scroller.scrollTop = scroll;
      this.view.onChange?.(md);
      this.compute();
      const moved = this.handles.find((x) => x.start === result.start);
      if (moved) {
        landing = moved.band.top;
        this.cover.style.top = this.edTop() + landing - 1 + "px";
        this.cover.style.height = moved.band.bottom - moved.band.top + 2 + "px";
      }
    }
    const copy = this.copy,
      cover = this.cover;
    const from = getComputedStyle(copy);
    copy.getAnimations().forEach((a) => a.cancel());
    copy.style.scale = 1;
    const glide = copy.animate(
      {
        top: [from.top, this.edTop() + landing + "px"],
        scale: [from.scale === "none" ? 1.06 : from.scale, 1],
        opacity: [from.opacity, 1],
      },
      { duration: BlockDragDebug.lift * 1.25, easing: EASE }
    );
    copy.style.top = this.edTop() + landing + "px";
    glide.onfinish = () => {
      copy.remove();
      cover.remove();
      this.dragging = null;
      this.view.root.classList.remove("gl-dragging");
      this.handles = null;
      this.hover();
    };
  }
}
const BlockDragDebug = { lift: 200 };

// --- The contents rail (TableOfContents.swift) ------------------------------
class Toc {
  constructor(view) {
    this.view = view;
    this.el = view.root.querySelector(".gl-toc");
    this.entries = [];
    this.rows = new Map();
    this.active = 0;
    this.hover = null;
    this.open = false;
    const page = view.root;
    page.addEventListener("pointermove", (e) => this.pointer(e));
    page.addEventListener("pointerleave", () => this.setHover(null, false));
    page.addEventListener("click", (e) => {
      if (this.hover === null) return;
      const entry = this.entries[this.hover];
      if (!entry) return;
      e.preventDefault();
      this.pinned = { index: this.hover, scroll: null };
      view.scrollTo(entry, () => {
        this.pinned.scroll = view.scroller.scrollTop;
        this.update();
      });
      this.active = this.hover;
      this.paint(true);
    });
  }

  setEntries(entries) {
    const before = new Map(this.rows);
    this.rows = new Map();
    this.entries = entries;
    entries.forEach((entry, i) => {
      const id = entry.depth + ":" + entry.title;
      let row = before.get(id);
      if (row) before.delete(id);
      else {
        row = document.createElement("div");
        row.className = "row" + (this.initialized ? " enter" : "");
        row.innerHTML = '<div class="dash"></div><div class="label"></div>';
        this.el.append(row);
        if (this.initialized)
          requestAnimationFrame(() =>
            requestAnimationFrame(() => row.classList.remove("enter"))
          );
      }
      row.querySelector(".label").textContent = entry.title;
      this.rows.set(id, row);
      entry.row = row;
    });
    for (const row of before.values()) {
      row.classList.add("enter");
      setTimeout(() => row.remove(), 280);
    }
    const changed = this.initialized;
    this.initialized = true;
    this.layout(changed);
  }

  // Geometry applies at once (a resize, or the view being shown); only
  // headings coming and going animate, as in the app.
  layout(animated = false) {
    const W = this.view.root.clientWidth,
      H = this.view.root.clientHeight;
    if (!W || !H) return;
    if (!animated || !this.sized) this.el.classList.add("static");
    this.sized = true;
    const colX = this.view.col.offsetLeft;
    const n = this.entries.length;
    const maxDepth = Math.max(0, ...this.entries.map((e) => e.depth));
    this.labelRoom = colX - 26 - 28;
    this.canOpen = this.labelRoom >= 70;
    this.markerScale = Math.min(1, Math.max(0, (colX - 16) / 56));
    this.el.style.display = n < 2 ? "none" : "";
    this.el.classList.toggle("tucked", colX - 48 < 26 + maxDepth * 10 + 30 + 8);
    this.listTop = n * 24 + 48 > H ? 24 : (H - n * 24) / 2;
    this.entries.forEach((e, i) => {
      e.row.style.top = this.listTop + i * 24 + "px";
      const dash = e.row.querySelector(".dash");
      dash.style.left = 26 * this.markerScale + "px";
      const label = e.row.querySelector(".label");
      const box = Math.max(10, this.labelRoom - e.depth * 10 - 8);
      label.style.left = 26 + e.depth * 10 + "px";
      label.style.width = box + "px";
      label.style.translate = -Math.min(box, 120) * 1.2 + "px 0";
    });
    this.update();
    if (this.el.classList.contains("static")) {
      void this.el.offsetWidth;
      this.el.classList.remove("static");
    }
  }

  // Active: the last heading at or above 72px below the top of the view.
  update() {
    const s = this.view.scroller;
    if (
      this.pinned &&
      this.pinned.scroll !== null &&
      Math.abs(s.scrollTop - this.pinned.scroll) > 1
    )
      this.pinned = null;
    if (!this.pinned) {
      const top = s.getBoundingClientRect().top,
        k = this.view.k();
      let a = 0;
      this.entries.forEach((e, i) => {
        if (!e.el.isConnected || !e.el.offsetParent) return;
        if (i && (e.el.getBoundingClientRect().top - top) / k <= 72) a = i;
      });
      this.active = a;
    }
    this.paint();
  }

  paint() {
    const widths = [
      [26, 30],
      [20, 28],
      [14, 24],
    ];
    this.entries.forEach((e, i) => {
      const lvl = Math.min(2, e.depth);
      const on = i === this.active || (!this.canOpen && i === this.hover);
      e.row.classList.toggle("on", on);
      e.row.querySelector(".dash").style.width =
        Math.max(1, widths[lvl][on ? 1 : 0] * this.markerScale) + "px";
      const emph = this.hover !== null ? i === this.hover : i === this.active;
      e.row.querySelector(".label").classList.toggle("emph", emph);
    });
    this.el.classList.toggle("open", this.open);
  }

  pointer(e) {
    const r = this.view.root.getBoundingClientRect(),
      k = this.view.k();
    const x = (e.clientX - r.left) / k,
      y = (e.clientY - r.top) / k;
    const n = this.entries.length;
    if (n < 2 || this.el.classList.contains("tucked"))
      return this.setHover(null, false);
    const inRows = y >= this.listTop - 4 && y <= this.listTop + n * 24 + 4;
    let reach = 26 + 44 + 8;
    if (this.open) {
      reach = 0;
      for (const entry of this.entries) {
        const label = entry.row.querySelector(".label");
        const text = Math.min(label.scrollWidth, label.clientWidth);
        reach = Math.max(reach, 26 + entry.depth * 10 + text + 8);
      }
    }
    const inside = (inRows && x <= reach) || (!this.open && x <= 10);
    const row = inside && inRows ? Math.floor((y - this.listTop) / 24) : null;
    this.setHover(
      row !== null && row >= 0 && row < n ? row : null,
      inside && this.canOpen
    );
  }

  setHover(row, open) {
    if (row === this.hover && open === this.open) return;
    this.hover = row;
    this.open = open;
    this.view.root.style.cursor = row !== null ? "pointer" : "";
    this.paint();
  }
}

// --- The window around it (TopBar.swift) -----------------------------------
// SF Symbols, rendered from the system at the app's sizes: [file, width, height].
const SYM = {
  back: ["back", 10, 14],
  forward: ["forward", 10, 14],
  newNote: ["new-note", 17, 19],
  search: ["search", 16, 15],
  globe: ["globe", 17, 17],
};
class GleaWindow {
  constructor(root, opts = {}) {
    const base =
      opts.symbols || "/media/design-engineering/point-and-shoot/glea/sym/";
    const sym = (k, drop = 0) =>
      `<span class="glw-sym" style="--m:url(${base}${SYM[k][0]}.png);width:${
        SYM[k][1]
      }px;height:${SYM[k][2]}px${drop ? `;margin-top:${drop}px` : ""}"></span>`;
    root.classList.add("glw");
    root.innerHTML = `<div class="glw-bar">
        <div class="glw-lights" aria-hidden="true"><i></i><i></i><i></i></div>
        <button class="glw-btn" data-x="86" disabled title="Back (⌘[)">${sym(
          "back"
        )}</button>
        <button class="glw-btn" data-x="114" disabled title="Forward (⌘])">${sym(
          "forward"
        )}</button>
        <button class="glw-seg" aria-current="page" title="Journal (⇧⌘J)">Journal</button>
        <button class="glw-seg" title="All Notes (⇧⌘H)">All Notes</button>
        <button class="glw-btn" data-r="106" title="New Note (⌥⌘N)">${sym(
          "newNote",
          1.5
        )}</button>
        <button class="glw-btn" data-r="74" title="Search (⌘T)">${sym(
          "search"
        )}</button>
        <button class="glw-btn" data-r="42" title="Switch to Web (⌘D)">${sym(
          "globe"
        )}</button>
      </div><div class="glw-page"></div>`;
    this.root = root;
    this.bar = root.querySelector(".glw-bar");
    this.view = new GleaView(root.querySelector(".glw-page"), opts);
    // Pressed buttons spring back (stiffness 480, damping 20-22).
    for (const b of root.querySelectorAll(".glw-btn, .glw-seg")) {
      b.addEventListener("pointerup", () => {
        const el = b.classList.contains("glw-seg")
          ? b
          : b.querySelector(".glw-sym");
        if (b.disabled || reduce()) return;
        el.animate(
          { scale: [b.classList.contains("glw-seg") ? 0.96 : 0.86, 1] },
          {
            duration: 450,
            easing:
              "linear(0, .14, .45, .78, 1.02, 1.13, 1.14, 1.09, 1.03, .99, .97, .97, .98, .99, 1, 1)",
          }
        );
      });
    }
    new ResizeObserver(() => this.layout()).observe(this.bar);
    document.fonts?.ready.then(() => this.layout());
  }

  layout() {
    const W = this.bar.clientWidth;
    for (const b of this.bar.querySelectorAll(".glw-btn")) {
      b.style.left = (b.dataset.x ? +b.dataset.x : W - +b.dataset.r) + "px";
    }
    // The pair is centered, kept clear of the buttons on either side.
    const [j, a] = this.bar.querySelectorAll(".glw-seg");
    const textWidth = (b) => {
      const r = document.createRange();
      r.selectNodeContents(b);
      return r.getBoundingClientRect().width / this.view.k();
    };
    // (AppKit sets SF a touch tighter than Chrome: about 1.5%.)
    const wj = Math.ceil(textWidth(j) * 0.985) + 24,
      wa = Math.ceil(textWidth(a) * 0.985) + 24;
    j.style.width = wj + "px";
    a.style.width = wa + "px";
    const pair = wj + 2 + wa;
    const right = W - 106 - 12;
    const x = Math.min(Math.max(Math.round(W - pair) / 2, 152), right - pair);
    j.style.left = x + "px";
    a.style.left = x + wj + 2 + "px";
  }
}

export { GleaView, GleaWindow };
