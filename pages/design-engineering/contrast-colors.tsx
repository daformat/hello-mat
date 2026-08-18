import { readFileSync } from "node:fs";
import { join } from "node:path";

import { GetStaticProps } from "next";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { codeToHtml } from "shiki";

import { CodeBlock } from "@/components/CodeBlock/CodeBlock";
import { ContrastDemo } from "@/components/ContrastDemo/ContrastDemo";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Tabs } from "@/components/Tabs/Tabs";
import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";
import styles from "@/styles/ContrastColors.module.scss";

const componentId: ComponentId = "contrast-colors";

interface CodeBlocks {
  source: string;
  usage: string;
  css: string;
}

const USAGE = `
import { contrastShift } from "./contrast-shift";

// WCAG 2.1, body text on a blue background
contrastShift("#1e3a8a", "#3b82f6", { target: 4.5 });
// -> { hex: "#041262", score: 4.5, direction: "darker", reached: true }

// APCA, same pair, Lc 60
contrastShift("#1e3a8a", "#3b82f6", { target: 60, metric: "apca" });

// Let it desaturate when the gamut runs out
contrastShift("#fde047", "#ffffff", { target: 4.5, preserveChroma: false });

// reached: false means no colour at this hue clears the target.
// What comes back is the best available, so check it before shipping.
const result = contrastShift(fg, bg, { target: 75, metric: "apca" });
if (!result.reached) {
  console.warn("unreachable, best is", result.score);
}
`.trim();

const CSS_SNIPPET = `
/* 1. The native function, and the end of the story for black-or-white ink.

   It returns black or white, whichever contrasts more with the input, white on
   a tie. That is bit for bit what you get by thresholding relative luminance at
   sqrt(0.0525) - 0.05, and it costs nothing: no bundle, no main thread, decided
   in the style engine before paint. */

.card {
  background: var(--bg);

  /* older browsers: white text, with a shadow to keep it legible */
  color: #fff;
  text-shadow: 0 0 4px rgb(0 0 0 / 0.8);
}

@supports (color: contrast-color(red)) {
  .card {
    color: contrast-color(var(--bg));
    text-shadow: none;
  }
}

/* 2. The YIQ expression that circulates, with its two bugs.

   The first is the comma after the origin colour: relative colour syntax is
   space separated only, so the declaration is a parse error and the text
   silently inherits whatever it was going to inherit anyway.

   The second is quieter. clamp() only saturates once the difference exceeds
   0.255, so any background whose luma lands inside that window returns a mid
   grey instead of black or white. That is 28,358 colours, 0.169%, about one
   background in six hundred. On #e25d32 it emits #878787, which is 1.00:1.

   --yiq is the threshold, not the luma. The luma is the sum written out three
   times, and it is written out three times because r, g and b only exist inside
   the colour function's own scope: there is nowhere outside rgb(from ...) where
   they mean anything, so the repetition is forced by the language rather than
   chosen. */

.ink-yiq-broken {
  color: rgb(from var(--background-color),
    clamp(0, (((r * .299) + (g * .587) + (b * .114)) - var(--yiq, 128)) * -1000, 255)
    clamp(0, (((r * .299) + (g * .587) + (b * .114)) - var(--yiq, 128)) * -1000, 255)
    clamp(0, (((r * .299) + (g * .587) + (b * .114)) - var(--yiq, 128)) * -1000, 255));
}

/* 3. The same expression, fixed: comma gone, multiplier steepened.

   The grey band is now 0.00255 luma units wide, narrower than the 0.001
   quantisation of 8 bit luma, so no sRGB colour can land in it. Correct as
   written, and still wrong as designed: the same 14.7% ink error as any YIQ
   threshold, because the number being thresholded is still NTSC coefficients on
   gamma encoded channels. */

.ink-yiq-fixed {
  color: rgb(from var(--background-color)
    clamp(0, (((r * .299) + (g * .587) + (b * .114)) - var(--yiq, 128)) * -100000, 255)
    clamp(0, (((r * .299) + (g * .587) + (b * .114)) - var(--yiq, 128)) * -100000, 255)
    clamp(0, (((r * .299) + (g * .587) + (b * .114)) - var(--yiq, 128)) * -100000, 255));
}

/* 4. Real relative luminance via pow(), thresholded where black and white
   contrast equally:

     (1 + .05) / (Y + .05) = (Y + .05) / .05   ->   Y = sqrt(.0525) - .05

   Use 0.1791288 rather than 0.179: the rounded form disagrees with the
   greater-of-black-or-white rule on about 0.03% of sRGB colours. pow(x, 2.2)
   approximates sRGB's piecewise curve closely enough for a threshold. */

.ink-luminance {
  color: rgb(from var(--background-color)
    clamp(0, (0.2126 * pow(r / 255, 2.2) + 0.7152 * pow(g / 255, 2.2)
              + 0.0722 * pow(b / 255, 2.2) - var(--thr, 0.1791288)) * -100000, 255)
    clamp(0, (0.2126 * pow(r / 255, 2.2) + 0.7152 * pow(g / 255, 2.2)
              + 0.0722 * pow(b / 255, 2.2) - var(--thr, 0.1791288)) * -100000, 255)
    clamp(0, (0.2126 * pow(r / 255, 2.2) + 0.7152 * pow(g / 255, 2.2)
              + 0.0722 * pow(b / 255, 2.2) - var(--thr, 0.1791288)) * -100000, 255));
}
`.trim();

export const getStaticProps: GetStaticProps<CodeBlocks> = async () => {
  // The module the page imports, read off disk rather than transcribed, so the
  // listing cannot drift away from the thing running above it.
  const sourcePath = join(
    process.cwd(),
    "components",
    "ContrastDemo",
    "contrast-shift.ts"
  );
  const themes = { light: "vitesse-light", dark: "houston" } as const;

  const [source, usage, css] = await Promise.all([
    codeToHtml(readFileSync(sourcePath, "utf8").trim(), {
      lang: "ts",
      themes,
      tabindex: false,
    }),
    codeToHtml(USAGE, { lang: "ts", themes, tabindex: false }),
    codeToHtml(CSS_SNIPPET, { lang: "css", themes, tabindex: false }),
  ]);

  return { props: { source, usage, css } };
};

const ContrastColorsPage = (props: CodeBlocks) => {
  const component = COMPONENTS[componentId];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <ContrastColorsPageContent {...props} />
      </TableOfContents.Provider>
    </>
  );
};

const ContrastColorsPageContent = (props: CodeBlocks) => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className={`prose page ${styles.contrast_page}`}>
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <p className={styles.eyebrow}>
          OKLCh<span>/</span>WCAG 2.1<span>/</span>APCA<span>/</span>hue
          preserved
        </p>
        <h1 id="design-engineering-contrast-colours">
          Keep the colour. <em>Move the lightness.</em>
        </h1>
        <p>
          Every few months I need the same thing, and every few months the web
          offers me something else. I have a colour I chose, it sits on a
          background I chose, and it is not readable. What I want back is that
          colour, still recognisably itself, moved exactly as far as it has to
          be. What I get offered is black or white.
        </p>
        <p>
          Black or white is the easy half of contrast. The harder half is taking
          a colour you actually chose and finding the nearest version of it that
          stays readable: same hue, same chroma where the gamut allows, only the
          lightness moved, and only as far as it needs to go.
        </p>

        <div className={styles.wide}>
          <ContrastDemo.Provider>
            <ContrastDemo.Bench>
              <div className={styles.sec_head}>
                <h2 id="five-ways">Five ways to pick ink</h2>
              </div>
              <p>
                The last three panes carry CSS declarations, the browser
                resolves them, and the numbers underneath are read back off what
                it painted. Move the background around and watch the{" "}
                <code>×−1000</code> pane fall into its grey band, which is a
                thing I would not have believed from a table and which{" "}
                <a href="#by-hand">rolling it by hand</a> gets to below.
              </p>
              <ContrastDemo.Toolbar />
              <ContrastDemo.Lab />
            </ContrastDemo.Bench>
            <div className={styles.sec_head}>
              <h2 id="two-questions">Two different questions</h2>
            </div>
            <p>
              Almost every contrast snippet on the web answers one question:{" "}
              <em>given a background, should the text be black or white?</em>{" "}
              That question has a tidy shape.
            </p>
            <p className={styles.formula}>
              <code>(background) → black | white</code>
            </p>
            <p>
              But the question I actually ask, and the one I hear designers ask,
              is a different one:{" "}
              <em>
                I picked this colour, it isn&rsquo;t readable on that
                background, give me the nearest version of it that is.
              </em>
            </p>
            <p className={styles.formula}>
              <code>(foreground, background, target) → foreground&prime;</code>
            </p>
            <p>
              The second signature takes the foreground as an argument. The
              first one does not. That is the whole difficulty in one line, and
              it took me an embarrassingly long time to see it: no amount of
              improving the first function ever turns it into the second,
              because the colour you are trying to keep is not even in the room.
              This page works through both, in order, the easy one first and
              honestly labelled as easy.
            </p>
            <p>
              Everything on it is live. The swatches, the six cases and the five
              approaches in the lab all compute against whatever the controls
              say, and the panes that demonstrate CSS carry the real
              declarations rather than a drawing of them.
            </p>

            <div className={styles.sec_head}>
              <h2 id="contrast-color">
                <code>contrast-color()</code>
              </h2>
              <p>CSS does this natively now, and gets it exactly right.</p>
            </div>
            <p>
              It takes a colour and returns black or white, whichever contrasts
              more, white on a tie. I checked it against the exact luminance
              threshold, the one part one derives below, over 1.89 million
              colours and found <strong>zero mismatches</strong>, which is
              unsurprising once you see it: it is that formula, in C++, running
              in the style engine before paint. That makes it strictly better
              than anything I could hand-roll. No main-thread work, no bundle,
              no reimplementation of mine to get wrong. If ink is genuinely all
              you need, stop reading and use it.
            </p>
            <p>
              The last line of each swatch is the one nothing above it can
              produce: the colour itself, moved until it is readable on itself.
              Same hue, same chroma, only the lightness changed, and still
              recognisably the colour you started with rather than the black or
              white that replaced it three lines up. That is the whole point of
              this page, and part two is how it is done.
            </p>

            <ContrastDemo.Swatches />

            <div className={`${styles.callout} ${styles.warn}`}>
              <p className={styles.callout_label}>The catch</p>
              <p>
                It has YIQ&rsquo;s <em>shape</em>. One argument in, two colours
                out. It fixes the arithmetic and nothing else, and it still
                cannot take a colour you chose and keep it. That limitation is
                the whole of part two, and it is the reason this page does not
                end here.
              </p>
            </div>

            <div className={styles.sec_head}>
              <h2 id="picking-ink">Part one: picking ink</h2>
              <p>
                Black or white. Four ways to decide, three of which are wrong
                about 15% of the time.
              </p>
            </div>

            <h3 id="yiq">What the YIQ formula actually is</h3>
            <p>
              The snippet everybody has pasted at least once computes this, and
              compares it to 128.
            </p>
            <p className={styles.formula}>
              <code>(r × 299 + g × 587 + b × 114) / 1000</code>
            </p>
            <p>
              It is worth being precise about what that number is, because it is
              not luminance and it never was. It is the Y channel of
              NTSC&rsquo;s YIQ colour space, a 1953 broadcast trick that let one
              signal serve colour and black-and-white sets at once, on analogue
              hardware where a squaring circuit was an expensive thing to ask
              for. Three consequences follow, and they compound rather than
              cancel. It is applied to gamma-encoded values, with no
              linearisation step, so what comes out is neither physical light
              nor perceptual lightness but a number in between that is neither.
              The coefficients are for the wrong primaries: 0.299, 0.587 and
              0.114 are Rec.601, tuned for 1953 phosphors, where sRGB is Rec.709
              and wants 0.2126, 0.7152 and 0.0722. And 128 is the midpoint of
              the <em>encoding</em> rather than of contrast, since it is simply
              255 divided by two; for neutrals the real crossover sits at a code
              value nearer 118.
            </p>
            <p>
              None of that would matter if the answers came out the same, and
              the reason to care is that they do not. Ask YIQ to order two
              random colours and it gets them backwards <strong>7.5%</strong> of
              the time; ask it to pick ink and it chooses the lower-contrast
              option on <strong>14.7%</strong> of colours. That is not a tail of
              pathological cases either. Tailwind&rsquo;s blue-500, red-500 and
              violet-500 all sit in the disagreement zone, as do{" "}
              <code>steelblue</code>, <code>chocolate</code> and{" "}
              <code>indianred</code>, which is to say: exactly where user
              interface palettes actually live. A formula from the era of vacuum
              tubes, shipping today, on the colours we use most.
            </p>

            <h3 id="the-threshold">
              The correct threshold, and where it comes from
            </h3>
            <p>
              You do not need a lookup table for this, and you do not need to
              try both and compare. Solve for the luminance at which black and
              white contrast <em>equally</em> under WCAG:
            </p>
            <p className={styles.formula}>
              <code>
                (1 + 0.05)/(Y + 0.05) = (Y + 0.05)/0.05 → Y = √0.0525 − 0.05 =
                0.1791288
              </code>
            </p>
            <p>
              Above that value black wins, below it white does. Use the exact
              number rather than 0.179, because the rounded form disagrees with
              the greater-of-black-or-white rule on about 0.03% of sRGB colours,
              and if you are going to bother being right you may as well be
              right everywhere. It is also not the same thing as L*=50, which
              lands at Y=0.184. Neighbours, not synonyms.
            </p>

            <h3 id="by-hand">Rolling it by hand, and why you might have to</h3>
            <p>
              Before the native function, people built this out of relative
              colour syntax, and those expressions are still worth
              understanding: for older browsers, and because their failure modes
              are a good lesson in how a correct-looking declaration can be
              silently useless.
            </p>
            <p>
              The version that circulates has two bugs. The first is a comma
              after the origin colour, which is a parse error, since relative
              colour syntax is space-separated only. The declaration is dropped,
              the text inherits, and nothing anywhere tells you. The second is
              subtler.
            </p>
            <p className={styles.formula}>
              <code>clamp(0, (luma − 128) × −1000, 255)</code>
            </p>
            <p>
              That only saturates once the difference exceeds 0.255, and inside
              that window it returns a <em>grey</em>. It is 28,358 colours, or{" "}
              <strong>0.169%</strong>, about one background in six hundred. On{" "}
              <code>#e25d32</code> it emits <code>#878787</code>, which is
              1.00:1 against its own background. Invisible text, from a
              declaration that parses and looks fine.
            </p>
            <p>
              The fix is one character: <code>−100000</code> instead of{" "}
              <code>−1000</code>, which narrows the grey band to 0.00255, below
              the 0.001 quantisation of 8-bit luma, so nothing can land in it.
              It is still YIQ though. Correct as written, wrong as designed. To
              fix the maths as well you need <code>pow()</code>, which lets CSS
              compute real relative luminance and threshold it at 0.1791288.
              Both are in the lab at the top of the page, computing live rather
              than being described, and both are in the code at the end.
            </p>

            <div className={styles.sec_head}>
              <h2 id="shifting-a-colour">Part two: shifting a colour</h2>
              <p>The question none of the above can answer.</p>
            </div>
            <p>
              Here is why this one feels hard:{" "}
              <strong>RGB has no lightness axis</strong>. There is no direction
              you can move in that means &ldquo;lighter&rdquo; without dragging
              hue and saturation along with it. Scaling the channels towards
              white desaturates, adding a constant shifts hue, and every naive
              attempt turns the colour into mush. Which is why people conclude
              it cannot be done and fall back to black or white, and I did that
              for years too.
            </p>
            <p>
              Switch to a perceptual polar space and the problem collapses. In
              OKLCh a colour is lightness, chroma and hue, three axes that move
              independently. So:
            </p>
            <ol>
              <li>
                Hold <strong>H</strong> and <strong>C</strong>, which is what
                keeps the colour recognisably itself.
              </li>
              <li>
                Move <strong>L</strong> away from the background&rsquo;s
                lightness.
              </li>
              <li>
                Contrast is monotonic in L on either side of the background, so{" "}
                <strong>bisect</strong> for the smallest move that hits the
                target.
              </li>
            </ol>
            <p>
              Monotonic is the load-bearing word there. It is the difference
              between a fifteen-line binary search and a pile of heuristics with
              magic numbers in them. I checked that it holds for APCA as well,
              across three thousand random sweeps, and found no non-unimodal
              case.
            </p>

            <h3 id="what-goes-wrong">The two things that go wrong</h3>
            <p>
              <strong>The gamut runs out.</strong> Saturated colours hit the
              edge of sRGB before they run out of lightness, since a vivid
              yellow simply cannot get dark at full chroma, so either the chroma
              gets clipped or the colour is allowed to desaturate.{" "}
              <strong>The target is unreachable.</strong> Sometimes no colour at
              that hue clears the bar at all, and when that happens a
              plausible-looking wrong answer is worse than an admission, so the
              result carries <code>reached: false</code> and returns its best
              effort rather than pretending.
            </p>
            <p>
              Both show up below. <code>#fde047</code> on white comes back
              olive, which is the gamut telling you that this yellow wants to be
              a background and not text.
            </p>

            <ContrastDemo.Bench>
              <div className={styles.sec_head}>
                <h3 id="six-cases">Six cases</h3>
                <p>
                  Your colour, the shifted version, and the black-or-white
                  answer, on the same background at the same target.
                </p>
              </div>
              <ContrastDemo.Toolbar />
              <ContrastDemo.Examples />
            </ContrastDemo.Bench>
          </ContrastDemo.Provider>

          <div className={styles.sec_head}>
            <h2 id="wins-and-fails">Where each one wins and fails</h2>
            <p>
              The same five approaches, judged on what they can and cannot do.
            </p>
          </div>
          <div className={styles.matrix_scroll}>
            <table className={styles.matrix}>
              <caption>Approach comparison</caption>
              <thead>
                <tr>
                  <th>Approach</th>
                  <th>Maths right</th>
                  <th>Keeps your colour</th>
                  <th>Wins when</th>
                  <th>Fails when</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>YIQ ≥ 128</th>
                  <td className={styles.no}>No</td>
                  <td className={styles.no}>No</td>
                  <td>
                    Debug overlays and logging, anywhere a 15% miss rate costs
                    nothing and you want one multiply-add.
                  </td>
                  <td>
                    Shipped text. It picks the worse ink on 14.7% of colours,
                    clustered exactly where UI palettes live.
                  </td>
                </tr>
                <tr>
                  <th>CSS YIQ ×−1000</th>
                  <td className={styles.no}>No</td>
                  <td className={styles.no}>No</td>
                  <td>Nothing. It is strictly worse than the ×−100000 form.</td>
                  <td>
                    All of YIQ&rsquo;s problems, plus a grey band on 0.169% of
                    backgrounds that can return 1.00:1 text, plus a comma that
                    drops the declaration.
                  </td>
                </tr>
                <tr>
                  <th>CSS YIQ ×−100000</th>
                  <td className={styles.no}>No</td>
                  <td className={styles.no}>No</td>
                  <td>
                    Legacy browsers where you need pure CSS and cannot use{" "}
                    <code>pow()</code>.
                  </td>
                  <td>
                    The same 14.7% ink error as any YIQ threshold. Correct as
                    written, wrong as designed.
                  </td>
                </tr>
                <tr>
                  <th>
                    CSS luminance via <code>pow()</code>
                  </th>
                  <td className={styles.yes}>Yes</td>
                  <td className={styles.no}>No</td>
                  <td>
                    Pure CSS, no <code>contrast-color()</code> support, and you
                    want the right answer.
                  </td>
                  <td>
                    Verbose. The expression cannot be hoisted into a custom
                    property, so it repeats three times, and the native function
                    supersedes it anyway.
                  </td>
                </tr>
                <tr>
                  <th>
                    <code>contrast-color()</code>
                  </th>
                  <td className={styles.yes}>Yes</td>
                  <td className={styles.no}>No</td>
                  <td>
                    Any time black-or-white ink is genuinely the answer. Zero
                    JS, zero bundle, native speed, exactly correct.
                  </td>
                  <td>
                    You wanted to keep your brand colour. It only ever returns
                    black or white.
                  </td>
                </tr>
                <tr>
                  <th>OKLCh shift</th>
                  <td className={styles.yes}>Yes</td>
                  <td className={styles.yes}>Yes</td>
                  <td>
                    The colour carries meaning, whether that is brand, semantics
                    or a data encoding, and it has to survive being made
                    readable.
                  </td>
                  <td>
                    It needs JS at runtime, and when the gamut cannot reach the
                    target it degrades towards exactly what{" "}
                    <code>contrast-color()</code> would have handed you anyway.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className={styles.callout}>
            <p className={styles.callout_label}>The honest comparison</p>
            <p>
              On maximum contrast, black-or-white wins and it is not close: 21:1
              against a shift&rsquo;s 4.5:1. That is not a point being hidden,
              it is the wrong yardstick. The shift solves a <em>constrained</em>{" "}
              problem, which is to keep this colour and spend the minimum to
              make it legible. <code>contrast-color()</code> does not solve that
              problem worse, it discards the constraint. The question is which
              one still has your design in it afterwards, not which number is
              bigger.
            </p>
          </div>

          <div className={styles.sec_head}>
            <h2 id="css-or-js">CSS only, or JavaScript?</h2>
            <p>What each platform can actually do, as of August 2026.</p>
          </div>
          <div className={styles.matrix_scroll}>
            <table className={styles.matrix}>
              <caption>Capability by platform</caption>
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>CSS only</th>
                  <th>JS</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Pick black or white ink</th>
                  <td className={styles.yes}>Yes</td>
                  <td className={styles.yes}>Yes</td>
                  <td>
                    <code>contrast-color()</code> beats the JS version: native,
                    pre-paint, no bundle.
                  </td>
                </tr>
                <tr>
                  <th>Correct relative luminance</th>
                  <td className={styles.yes}>Yes</td>
                  <td className={styles.yes}>Yes</td>
                  <td>
                    <code>pow()</code> made this possible in CSS. It
                    approximates the piecewise curve, which is fine for a
                    threshold.
                  </td>
                </tr>
                <tr>
                  <th>Read a computed contrast ratio</th>
                  <td className={styles.no}>No</td>
                  <td className={styles.yes}>Yes</td>
                  <td>
                    CSS can branch on a value but cannot hand you the number.
                  </td>
                </tr>
                <tr>
                  <th>Shift a colour, hue preserved</th>
                  <td className={styles.part}>Partly</td>
                  <td className={styles.yes}>Yes</td>
                  <td>
                    You can nudge L in <code>oklch(from …)</code>, but by a
                    fixed amount you picked, not solved against a target.
                  </td>
                </tr>
                <tr>
                  <th>Search for the minimum change</th>
                  <td className={styles.no}>No</td>
                  <td className={styles.yes}>Yes</td>
                  <td>Bisection needs iteration, and CSS has no loops.</td>
                </tr>
                <tr>
                  <th>Detect gamut clipping</th>
                  <td className={styles.no}>No</td>
                  <td className={styles.yes}>Yes</td>
                  <td>
                    CSS clips silently, and you cannot tell that it happened.
                  </td>
                </tr>
                <tr>
                  <th>Know the target was unreachable</th>
                  <td className={styles.no}>No</td>
                  <td className={styles.yes}>Yes</td>
                  <td>
                    The most important row here. CSS always returns{" "}
                    <em>something</em>.
                  </td>
                </tr>
                <tr>
                  <th>APCA scoring</th>
                  <td className={styles.part}>Partly</td>
                  <td className={styles.yes}>Yes</td>
                  <td>
                    <code>pow()</code> can compute Lc, but comparing both
                    polarities needs branching that CSS does not have.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The dividing line is not really CSS against JS. It is{" "}
            <strong>evaluation against search</strong>. CSS evaluates an
            expression per element, extremely fast, and that is genuinely all it
            does: it cannot iterate towards an answer, and it cannot report that
            it failed. Every &ldquo;no&rdquo; in that table is one of those two.
            So the practical split is to use <code>contrast-color()</code> for
            ink, always, and to reach for JS only when the colour itself has to
            survive. Run it at build time if you can, since the shift is
            deterministic and a design token pipeline is a much better home for
            it than the main thread.
          </p>

          <div className={styles.sec_head}>
            <h2 id="which-metric">Which metric?</h2>
            <p>
              WCAG 2.1 and APCA disagree, sometimes about which colour is
              better.
            </p>
          </div>
          <p>
            WCAG 2.1&rsquo;s ratio is a legal standard and very often the thing
            you are actually required to meet. It is also a poor perceptual
            model: it ignores polarity, ignores font weight and size, and is
            unreliable at the dark end. Black on white and white on black both
            score 21:1, which anybody who has stared at both knows is not true
            of how they read.
          </p>
          <p>
            APCA scores those two as Lc 106.0 and Lc −107.9. Signed, asymmetric,
            polarity-aware, and built for text legibility rather than as a
            general colour-difference metric. Flip the metric toggle in the lab
            above and watch every number move.
          </p>
          <p>
            They do not just differ in precision, they pick{" "}
            <strong>different colours</strong>. On <code>#3b82f6</code> WCAG
            prefers black, at 5.71:1 against white&rsquo;s 3.68:1, and APCA
            prefers white, at Lc 69.4 against black&rsquo;s 40.2. Same
            background, opposite answers, and the same thing happens on{" "}
            <code>#787878</code> and <code>#ef4444</code>. APCA is also far
            stricter about mid-tone backgrounds: at Lc 75, its body-text
            minimum, nothing at any hue clears the bar against{" "}
            <code>#3b82f6</code>, because white itself only reaches 69.4. The
            honest reading of that is that a saturated mid-blue cannot host body
            text at all, which WCAG will cheerfully let you ship.
          </p>
          <div className={`${styles.callout} ${styles.warn}`}>
            <p className={styles.callout_label}>Don&rsquo;t just swap</p>
            <p>
              APCA is not a drop-in substitute for WCAG 2.x conformance. If you
              have a legal or contractual obligation, that obligation is almost
              certainly to WCAG. Use APCA to design well, and check WCAG to
              ship.
            </p>
          </div>

          <div className={styles.sec_head}>
            <h2 id="take-it-with-you">Take it with you</h2>
            <p>
              The TypeScript below is the same source this page runs on, not a
              transcription of it.
            </p>
          </div>
          <p>
            The module is read off disk when the page is built rather than
            copied into it, so the listing cannot quietly drift away from the
            thing running above. It has no dependencies and nothing in it is
            React, which is what lets it run just as happily in a token pipeline
            at build time as it does under your cursor here.
          </p>
          <div className={styles.code_panel}>
            <Tabs
              defaultValue="source"
              tabs={[
                {
                  id: "source",
                  trigger: "contrast-shift.ts",
                  content: <CodeBlock html={props.source} />,
                },
                {
                  id: "usage",
                  trigger: "Usage",
                  content: <CodeBlock html={props.usage} />,
                },
                {
                  id: "css",
                  trigger: "The CSS approaches",
                  content: <CodeBlock html={props.css} />,
                },
              ]}
            />
          </div>
          <p className={styles.footnote}>
            OKLab conversions: Björn Ottosson. APCA: SA98G constants from
            apca-w3 0.1.9, checked numerically against the reference
            implementation.
            <br />
            APCA is not a drop-in substitute for WCAG 2.x conformance, so check
            what your project is actually required to meet.
          </p>
        </div>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default ContrastColorsPage;
