/*
 * Today's entry, as glea.app's demo writes it: the Markdown Glea keeps on
 * disk, the way it formats a capture (NoteStore.format), and the file view's
 * light coloring.
 */

/** The entry the demo opens on (glea-site/assets/glea/demo.js). */
export const GLEA_DEMO = `## Morning

- Reading about [[Associative trails]]
- [x] Rename the browser
- [ ] Put up the site

> The human mind operates by association.
>
> — [As We May Think - The Atlantic](https://www.theatlantic.com/magazine/archive/1945/07/as-we-may-think/303881/)

![Vannevar Bush](../assets/bush.jpg)
— [Vannevar Bush - Wikipedia](https://en.wikipedia.org/wiki/Vannevar_Bush)

## Launch

Ideas for the [[Glea]] launch post
`;

/**
 * A capture as Glea writes it into a note: an image on its own line with
 * its source under it, anything else quoted, with the source as the quote's
 * last line.
 */
export const formatCapture = (markdown: string): string => {
  const title = document.title.replace(/[[\]]/g, (c) =>
    c === "[" ? "(" : ")"
  );
  const url = location.href
    .replace(/ /g, "%20")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
  const source = `[${title}](${url})`;
  const body = markdown.trim();
  return !body.includes("\n") && /^!\[.*\)$/.test(body)
    ? `${body}\n— ${source}`
    : body
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n") + `\n>\n> — ${source}`;
};

const escape = (text: string) =>
  text.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c)
  );

/** The file, lightly colored: headings in ink, links in the accent, quotes faint. */
export const highlight = (
  markdown: string,
  classes: { heading: string; link: string; quote: string; symbol: string }
): string =>
  markdown
    .split("\n")
    .map((line) => {
      const text = escape(line);
      if (/^#{1,6}\s/.test(line)) {
        return `<span class="${classes.heading}">${text}</span>`;
      }
      if (/^>/.test(line)) {
        return `<span class="${classes.quote}">${text}</span>`;
      }
      return text.replace(
        /\[\[[^\]]+\]\]|\[[^\]]*\]\([^)\s]+\)/g,
        `<span class="${classes.link}">$&</span>`
      );
    })
    .map((line) =>
      line.replace(/[⌘⇧⌥⌃]+/g, `<span class="${classes.symbol}">$&</span>`)
    )
    .join("\n");
