import { GetStaticProps } from "next";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { codeToHtml } from "shiki";

import { CodeBlock } from "@/components/CodeBlock/CodeBlock";
import { ArticleDates } from "@/components/Navigation/ArticleDates";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { ComponentPageMetas } from "@/components/PageMetas/ComponentPageMetas";
import { PointAndShootDemo } from "@/components/PointAndShootDemo/PointAndShootDemo";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Tabs } from "@/components/Tabs/Tabs";
import { ComponentId } from "@/constants/design-engineering/components";
import styles from "@/styles/PointAndShoot.module.scss";

const componentId: ComponentId = "point-and-shoot";

interface CodeBlocks {
  usage: string;
  hold: string;
  targets: string;
  areas: string;
  styling: string;
  installNpm: string;
  installYarn: string;
  installPnpm: string;
  installBun: string;
  installDeno: string;
}

const USAGE = `
import { createPointAndShoot } from "@daformat/point-and-shoot";
import { toMarkdown } from "@daformat/point-and-shoot/markdown";

const pns = createPointAndShoot({
  // Resolve to keep it, throw to shake. The node is an Element or a Range.
  onShoot: async (target) => save(toMarkdown(target.node)),
});

button.addEventListener("click", () => pns.toggle());

// The confirmation is yours to draw: the library flashes, and that's all
pns.on("shot", (result) => result.ok && toast("Saved"));
`.trim();

const HOLD = `
// Hold Option alone for a moment and it's on, let go and it's off
let timer = 0;
addEventListener("keydown", (e) => {
  if (e.key !== "Alt" || e.repeat || e.metaKey || e.ctrlKey) return;
  timer = setTimeout(() => pns.activate({ at: pointer }), 120);
});
addEventListener("keyup", (e) => {
  if (e.key !== "Alt") return;
  clearTimeout(timer);
  pns.deactivate();
});

// A release can go unseen when focus goes elsewhere: the real key state
// decides, and returning false lets the event through and leaves the mode
pns.configure({ guard: (e) => e.altKey, after: "stay" });
`.trim();

const TARGETS = `
import { defaultTargets, match } from "@daformat/point-and-shoot";

// Your own markup, ahead of the defaults: anything under the pointer
// inside a card targets the whole card
const cards = match("[data-card-id]", (el) => ({
  kind: "card",
  whole: true,
  data: { id: el.dataset.cardId },
}));

createPointAndShoot({ targets: [cards, ...defaultTargets] });
`.trim();

const AREAS = `
import { elementsInRect } from "@daformat/point-and-shoot";

createPointAndShoot({
  area: {
    onCapture: async (rect, ctx) => {
      // What's inside, native and custom in one pass, nothing filtered
      const found = elementsInRect(rect.viewport, ["svg", cards]);

      // Or a picture: hide the overlay, take the pixels your way, give it back
      const shown = await ctx.hideOverlay();
      const png = await takeScreenshot(rect);
      shown();
      return { found, png };
    },
  },
});
`.trim();

const STYLING = `
point-and-shoot {
  --pns-color: rgb(0 0 0 / 0.08);
  --pns-radius: 2px;
  --pns-border: 1px solid currentColor;
}

@media (prefers-color-scheme: dark) {
  point-and-shoot {
    --pns-color: rgb(255 255 255 / 0.12);
  }
}
`.trim();

const PACKAGE = "@daformat/point-and-shoot";

const INSTALL = {
  npm: `npm install ${PACKAGE}`,
  yarn: `yarn add ${PACKAGE}`,
  pnpm: `pnpm add ${PACKAGE}`,
  bun: `bun add ${PACKAGE}`,
  deno: `deno add npm:${PACKAGE}`,
};

const REPO = "https://github.com/daformat/point-and-shoot";

export const getStaticProps: GetStaticProps<CodeBlocks> = async () => {
  const themes = { light: "vitesse-light", dark: "houston" } as const;
  const ts = { lang: "ts", themes, tabindex: false } as const;
  const css = { lang: "css", themes, tabindex: false } as const;
  const bash = { lang: "bash", themes, tabindex: false } as const;

  const [
    usage,
    hold,
    targets,
    areas,
    styling,
    installNpm,
    installYarn,
    installPnpm,
    installBun,
    installDeno,
  ] = await Promise.all([
    codeToHtml(USAGE, ts),
    codeToHtml(HOLD, ts),
    codeToHtml(TARGETS, ts),
    codeToHtml(AREAS, ts),
    codeToHtml(STYLING, css),
    codeToHtml(INSTALL.npm, bash),
    codeToHtml(INSTALL.yarn, bash),
    codeToHtml(INSTALL.pnpm, bash),
    codeToHtml(INSTALL.bun, bash),
    codeToHtml(INSTALL.deno, bash),
  ]);

  return {
    props: {
      usage,
      hold,
      targets,
      areas,
      styling,
      installNpm,
      installYarn,
      installPnpm,
      installBun,
      installDeno,
    },
  };
};

const PointAndShootPage = (props: CodeBlocks) => {
  return (
    <>
      <ComponentPageMetas componentId={componentId} />
      <TableOfContents.Provider>
        <PointAndShootPageContent {...props} />
      </TableOfContents.Provider>
    </>
  );
};

const PointAndShootPageContent = (props: CodeBlocks) => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  const install = (["npm", "yarn", "pnpm", "bun", "deno"] as const).map(
    (manager) => {
      const key = `install${manager[0]?.toUpperCase()}${manager.slice(
        1
      )}` as keyof CodeBlocks;
      return {
        id: `install-${manager}`,
        trigger: (
          <h4 id={`install-${manager}`} data-no-toc={""}>
            {manager}
          </h4>
        ),
        content: <CodeBlock html={props[key]} />,
      };
    }
  );

  return (
    <>
      <TableOfContents.Root />
      <PointAndShootDemo.Provider>
        <div
          ref={contentRef}
          className={`prose page ${styles.pns_page}`}
          data-pns-screenshot-root=""
        >
          <Link href="/design-engineering" className="back_link">
            Back to gallery
          </Link>
          <h1 id="design-engineering-point-and-shoot">
            Point and shoot: capture anything on a page.
          </h1>
          <ArticleDates componentId={componentId} />
          <p>
            Introducing{" "}
            <a href={REPO} target="_blank" rel="noopener">
              point-and-shoot
            </a>
            , a small open source library with no dependencies for pointing at
            something on a web page and keeping it. A spotlight follows the
            pointer from block to block, a click shoots whatever it&rsquo;s on,
            and a drag draws an area. What a shot does is up to you: save it,
            send it, turn it into Markdown, or collect every icon in a
            rectangle.
          </p>
          <p>
            It comes out of{" "}
            <a href="https://glea.app" target="_blank" rel="noopener">
              Glea
            </a>
            , a Mac browser of mine with a journal built in, where holding{" "}
            <kbd>⌥</kbd> lights up the page and a click puts what&rsquo;s under
            the pointer in today&rsquo;s entry. And it is the third time I have
            built point and shoot: first at{" "}
            <Link href="/design-engineering/beam-demo">beam</Link>, the browser
            I worked on, where pressing <kbd>⌥</kbd> to capture anything on the
            web first felt like magic, then at{" "}
            <a href="https://www.kosmik.app" target="_blank" rel="noopener">
              Kosmik
            </a>
            , and now in Glea. Three times is enough to know which parts are the
            same every time and which parts belong to the app, so this time I
            pulled the parts that are the same out into a library, and open
            sourced it, so there won&rsquo;t be a fourth.
          </p>
          <p>
            This page is the library&rsquo;s demo and its manual, and everything
            on it is capturable: hold <kbd>⌥</kbd>, or press the button, and
            click anything.
          </p>

          <div className={styles.wide}>
            <PointAndShootDemo.Stage />
            <h2 id="settings">Settings</h2>
            <PointAndShootDemo.Toolbar />

            <h2 id="take-it-with-you">Take it with you</h2>
            <p>
              Everything above runs on{" "}
              <a href={REPO} target="_blank" rel="noopener">
                <code>@daformat/point-and-shoot</code>
              </a>
              : the pointing, the spotlight, the press, the drag, the flash and
              the shake. What the demo adds on top is what Glea adds on top: the{" "}
              <kbd>⌥</kbd> key, the Markdown, the journal entry, and the picture
              of an area. Glea itself, its browser extensions and{" "}
              <a href="https://glea.app" target="_blank" rel="noopener">
                glea.app
              </a>{" "}
              all run on the same package, so the thing you are holding here is
              the thing that ships.
            </p>

            <h3 id="install">Install</h3>
            <p>
              Open the repo on{" "}
              <a href={REPO} target="_blank" rel="noopener">
                Github
              </a>{" "}
              (and drop a star if you like it!)
            </p>
            <div className={styles.code_panel}>
              <Tabs defaultValue="install-npm" tabs={install} />
            </div>

            <h3 id="usage">Usage</h3>
            <div className={styles.code_panel}>
              <CodeBlock html={props.usage} />
            </div>

            <h2 id="no-hotkeys">No hotkeys</h2>
            <p>The library never decides when it&rsquo;s on. You do.</p>
            <p>
              Glea turns the mode on while <kbd>⌥</kbd> is held, the extensions
              do the same from a content script, and this page does it from a
              key handler and a button. Those are three different answers to
              when, so the library has none of its own: it has{" "}
              <code>activate</code>, <code>deactivate</code> and{" "}
              <code>toggle</code>, and you call them from wherever your answer
              lives. The only key it listens to is Escape, which leaves the mode
              and cancels a shot still waiting on your handler, because
              that&rsquo;s what Escape means everywhere, and even that one can
              be turned off.
            </p>
            <div className={styles.code_panel}>
              <CodeBlock html={props.hold} />
            </div>
            <p>
              Two details in there came from getting it wrong. The 120
              milliseconds are there because <kbd>⌥</kbd> is also the first key
              of a dozen shortcuts, and a spotlight flashing up every time you
              switch tabs with <kbd>⌥⌘→</kbd> is exactly as annoying as it
              sounds. The guard is there because a key release is not
              guaranteed: switch apps with <kbd>⌥</kbd> held and the page never
              hears it go up. Every pointer event while the mode is on asks the
              guard first, and the event&rsquo;s own <code>altKey</code> is the
              truth.
            </p>

            <h2 id="worth-pointing-at">What&rsquo;s worth pointing at</h2>
            <p>The rules that tell a block from the box around it.</p>
            <p>
              Point at a page and the browser will tell you every element under
              the pointer, innermost first, and almost none of them are what you
              meant. There is the span around a word, the paragraph around the
              span, three wrappers with no content of their own, a grid, the
              main column and the body. The default targeter walks that stack
              and keeps an element only if it is visible, has a box at all, and
              has something of its own to show:
            </p>
            <p className={styles.formula}>
              <code>
                meaningful = visible ∧ area ≤ 1.5 viewports ∧ height ≤ 4
                viewports ∧ (text ∨ media)
              </code>
            </p>
            <p>
              Text counts once it has a letter or a digit in any script, so a
              row of bullets, pipes and middle dots is decoration and not
              content. Text that is hidden, or squeezed into a one pixel box for
              screen readers, doesn&rsquo;t count either. The size limits are
              what stop a wrapper from winning: something that covers more than
              one and a half screens lights up most of the page, which is no
              help in picking anything, but a long article column still passes,
              because four screens tall is a lot of article.
            </p>
            <p>
              Then images go first, an <code>&lt;img&gt;</code> ahead of a
              background image, then media, then the innermost block. A word
              inside a link inside a paragraph targets the paragraph, because
              inline elements are walked up to the block they sit in, and part
              of a drawing targets the whole <code>&lt;svg&gt;</code>.
            </p>
            <p>
              The spotlight doesn&rsquo;t take the element&rsquo;s box, though.
              It takes the extent of what is rendered inside it: its text runs,
              each measured with a range, and its media. A heading in a padded
              hero section lights up around the words and not around the hero,
              and the box is cut down to whatever its ancestors&rsquo; overflow
              lets show, so the half of a carousel slide that&rsquo;s off to the
              side isn&rsquo;t lit. All of this walks the tree with a budget,
              three hundred nodes to decide if something has text and six
              hundred to measure it, so a pointer move over a huge subtree costs
              the same as one over a paragraph.
            </p>
            <p>
              Two places the browser doesn&rsquo;t look, it has to be told to.
              Open shadow roots are searched, since{" "}
              <code>elementsFromPoint</code> stops at their door. And frames: an
              iframe keeps the pointer&rsquo;s events to its own document, so
              the page never hears the pointer arrive over a video player. While
              the mode is on, frames let the pointer through to the page, and
              they are found by their box instead.
            </p>

            <h2 id="holding-still">Holding still</h2>
            <p>Why it doesn&rsquo;t flicker between small things.</p>
            <p>
              Move the pointer across a row of icons and in between each one it
              lands on the row itself, for a frame or two. A naive spotlight
              balloons out to the whole row and snaps back, again and again, and
              it looks broken. So when the next target is a container of the
              current one, it only wins once the pointer has rested on it for
              180 milliseconds, and leaving a target for nothing at all keeps it
              lit within 20 pixels. Both are options, <code>dwell</code> and{" "}
              <code>grace</code>.
            </p>
            <p>
              The spotlight also leans a few pixels toward the pointer,
              something I carried over from Kosmik, which makes it feel held
              rather than placed:
            </p>
            <p className={styles.formula}>
              <code>
                lean = sign(d) × min(√|d|, 1) × 4px, d = (pointer − center) /
                (half size + 5), half that vertically
              </code>
            </p>
            <p>
              The square root is what makes it soft: the first few pixels away
              from the center lean the most, and the edges barely more than
              that.
            </p>

            <h2 id="your-own-markup">Your own markup</h2>
            <p>Targeters, and what to do when a selector isn&rsquo;t enough.</p>
            <p>
              Whatever the heuristics think, you know your page better. A
              targeter is a function from what&rsquo;s under the pointer to a
              target, and they are tried in order, so yours go ahead of the
              defaults. <code>match</code> covers the common case, the closest
              ancestor matching a selector, and the same targeter collects
              matches inside an area too.
            </p>
            <div className={styles.code_panel}>
              <CodeBlock html={props.targets} />
            </div>
            <p>
              Glea&rsquo;s own is a targeter of this kind: pointing anywhere
              over a post on X or Bluesky, or a YouTube video, lights the whole
              post and keeps its address, so the note embeds it again. Holding{" "}
              <kbd>⌘</kbd> as well turns that off and collects the post as text,
              and that switch is a flag, free-form state the targeters read and
              that re-resolves the target when it changes.
            </p>

            <h2 id="shooting">Shooting</h2>
            <p>A promise, a pending state, and a way out.</p>
            <p>
              A shot is your handler, and your handler can take its time. While
              it runs, the spotlight holds on its target and follows it as the
              page scrolls, and the page&rsquo;s clicks are swallowed, so a
              second click doesn&rsquo;t follow a link the first one was meant
              to capture. In Glea that pending state lasts as long as the
              collect panel is open, which can be a while. Resolve and it
              flashes; throw and it shakes and stays on for another try; Escape
              aborts the signal it handed you and lets go.
            </p>
            <p>
              The flash, the shake and the screen reader announcements are the
              library&rsquo;s, and each can be changed or turned off. A badge or
              a toast is not: what &ldquo;saved&rdquo; looks like on your page
              is yours to draw, from the <code>shot</code> event, which is what
              the hint at the bottom of this page does.
            </p>

            <h2 id="areas">Areas</h2>
            <p>Drag a rectangle, and decide what it means.</p>
            <p>
              Dragging is off unless you give it a handler, because a drag can
              mean anything: collect the cards inside it, copy the icons, or
              take a picture.
            </p>
            <div className={styles.code_panel}>
              <CodeBlock html={props.areas} />
            </div>
            <p>
              The picture is the one the library can&rsquo;t take for you. No
              web API reads a page&rsquo;s own pixels, so Glea asks Chromium for
              a screenshot and the extensions ask the browser, and both hide the
              overlay for two frames first so it isn&rsquo;t in the shot. This
              page has neither, so it draws itself into a canvas with{" "}
              <a
                href="https://github.com/qq15725/modern-screenshot"
                target="_blank"
                rel="noopener"
              >
                modern-screenshot
              </a>
              , loaded on your first drag, and only the smallest element that
              holds the whole area is drawn, since the page at large has every
              code sample on it to encode.
            </p>

            <h2 id="selections">Selections</h2>
            <p>One shape around all of it, rounded, and quick.</p>
            <p>
              Select some text and hold <kbd>⌥</kbd>, and the selection is
              collected at once, with its lines lit as it goes, the way Glea
              does it. The bar has the other ways to treat a selection: lit
              wherever the pointer is and collected on a click, lit only while
              you point at it, or left alone. When it&rsquo;s lit, it&rsquo;s
              lit line by line.
            </p>
            <p>
              Asking the browser for a selection&rsquo;s boxes gives you a box
              for every element wholly inside it on top of its text, so select a
              whole page and you get every card and column back, stacked, the
              overlaps darker. The library walks the selection instead and keeps
              only text lines and media, merges the pieces of a line that are
              within a word&rsquo;s space of each other so two columns stay
              apart, and draws the union of all of them as one path:
            </p>
            <p className={styles.formula}>
              <code>
                edges → a compressed grid → cells filled from a 2D difference
                array → the boundary walked into loops
              </code>
            </p>
            <p>
              The rects&rsquo; edges make a grid with as many columns as there
              are distinct x positions, every cell is filled or not in one pass,
              and the border between filled and empty cells is walked into
              loops, clockwise around shapes and the other way around holes.
              Where two shapes only touch at a corner, the walk turns right, so
              they stay two shapes. Every corner is then rounded, by at most
              half of its shorter edge:
            </p>
            <p className={styles.formula}>
              <code>r = min(6px, in / 2, out / 2)</code>
            </p>
            <p>
              A selection can be huge, so every step has a way out. Gathering
              the lines stops at four thousand nodes, two thousand boxes or 24
              milliseconds, whichever comes first, and the outline at 160
              thousand grid cells; past any of them it draws one rounded box
              around the lot, which on a page that heavy is what you would have
              wanted anyway. The lines are cached and moved along as the page
              scrolls, so pointing at a selection costs nothing after the first
              frame.
            </p>
            <p>
              While the shape is drawn, the browser&rsquo;s own highlight is
              hidden with a <code>::selection</code> rule, and it comes back the
              moment the shape goes, with the selection itself never touched.
              Text selected inside a shadow root works too, which took asking
              the right question: Chrome and Safari show the page only a
              collapsed range where the host is, and{" "}
              <code>getComposedRanges</code> has the real one.
            </p>

            <h2 id="looks">Looks</h2>
            <p>Every number is a custom property.</p>
            <p>
              The spotlight is the dot under the pointer, the highlight it
              morphs into, and a selection&rsquo;s shape, drawn in a closed
              shadow root so the page&rsquo;s styles can&rsquo;t reach in and
              built node by node for pages with Trusted Types. Its color,
              border, padding, radius, press and lean are options, and each
              option is also a <code>--pns-*</code> property on the host
              element, so a stylesheet can theme it without any JavaScript. The
              color picker in the bar above is doing exactly that.
            </p>
            <div className={styles.code_panel}>
              <CodeBlock html={props.styling} />
            </div>
            <p>
              With reduced motion, the spotlight jumps instead of gliding, the
              press doesn&rsquo;t shrink it, the shake becomes a short pulse,
              and the flash is quicker. And if none of it is what you want, pass
              a renderer of your own, or none at all, and draw the whole thing
              from the events.
            </p>

            <p className={styles.footnote}>
              Glea&rsquo;s point and shoot, in the app, in Glea Clipper for
              Chrome, Firefox and Safari, and on glea.app, runs on this package,
              with Glea&rsquo;s own posts, embeds and Markdown on top.
              <br />
              Nothing you capture on this page leaves it: the window above is a
              mock of Glea&rsquo;s journal, drawn in your browser, and gone when
              you reload.
            </p>
          </div>
          <PrevNextNavigation currentComponentId={componentId} />
        </div>
        <PointAndShootDemo.Hint />
      </PointAndShootDemo.Provider>
    </>
  );
};

export default PointAndShootPage;
