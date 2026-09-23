import { GetStaticProps } from "next";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { codeToHtml } from "shiki";

import { CodeBlock } from "@/components/CodeBlock/CodeBlock";
import { ArticleDates } from "@/components/Navigation/ArticleDates";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { ComponentPageMetas } from "@/components/PageMetas/ComponentPageMetas";
import { RollingStackedCards } from "@/components/RollingStackedCards/RollingStackedCards";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { Tabs } from "@/components/Tabs/Tabs";
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer";
import { ComponentId } from "@/constants/design-engineering/components";
import { describePreview } from "@/utils/media-alt";

const componentId: ComponentId = "stacking-cards";

const GITHUB_SOURCE =
  "https://github.com/daformat/hello-mat/blob/master/components/RollingStackedCards";

const htmlSource = `
<div class="wrapper">
  <div class="card" style="--index0: 0">
    <div class="layer" style="--depth0: 0">
      <div class="layer" style="--depth0: 1">
        <div class="layer" style="--depth0: 2">
          <div class="content">Card 1</div>
        </div>
      </div>
    </div>
  </div>
  <div class="card" style="--index0: 1">
    <div class="layer" style="--depth0: 0">
      <div class="layer" style="--depth0: 1">
        <div class="layer" style="--depth0: 2">
          <div class="content">Card 2</div>
        </div>
      </div>
    </div>
  </div>
  <!--
    To add a card, copy the one above and increase --index0 by one, then
    set --cards-amount in the css to the number of cards.

    Each card has --rolling-count - 1 layers, one per card that can land on
    it, and each layer scales it back one more step. The last cards have
    fewer cards after them, so they get fewer layers: drop the innermost
    layer from the third to last card, two from the second to last, and all
    three from the last one. Extra layers would keep shrinking them once
    you scroll past.
  -->
</div>
`.trim();

const cssSource = `
/* full source: ${GITHUB_SOURCE}/RollingStackedCards.module.scss */

@keyframes scale {
  to {
    scale: 0.9;
  }
}

@keyframes discard {
  to {
    margin-top: calc(-1 * var(--card-margin));
    opacity: 0;
    padding-top: 0;
    scale: 0.78;
  }
}

.wrapper {
  /* the number of .card elements in the html */
  --cards-amount: 6;
  --rolling-count: 4;
  --card-height: 300px;
  --card-margin: 0px;
  --cards-gap: 28px;
  --card-top-distance: 32px;
  --card-top-offset: 20px;
  --block-size: calc(
    var(--cards-amount) * (var(--card-height) + var(--card-top-offset)) +
      (var(--cards-amount) - 1) * var(--cards-gap)
  );
  display: grid;
  gap: var(--cards-gap);
  grid-template-rows: repeat(var(--cards-amount), var(--card-height));
  padding-bottom: calc(var(--cards-amount) * var(--card-top-offset));
  view-timeline-name: --cards-scrolling;
}

.card {
  --start-range: calc(
    (var(--index0) + var(--rolling-count) - 1) *
      (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%
  );
  --end-range: calc(
    (var(--index0) + var(--rolling-count)) *
      (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%
  );
  position: sticky;
  top: 0;
  padding-top: calc(
    var(--card-top-distance) + var(--index0) * var(--card-top-offset)
  );
  transform-origin: center 200%;
  animation: discard linear forwards;
  animation-timeline: --cards-scrolling;
  animation-range: exit-crossing var(--start-range) exit-crossing
    var(--end-range);
}

.layer {
  --start-range: calc(
    (var(--index0) + var(--depth0)) *
      (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%
  );
  --end-range: calc(
    (var(--index0) + var(--depth0) + 1) *
      (var(--card-height) + var(--card-margin)) / var(--block-size) * 100%
  );
  transform-origin: 50% 0%;
  animation: scale linear forwards;
  animation-timeline: --cards-scrolling;
  animation-range: exit-crossing var(--start-range) exit-crossing
    var(--end-range);
}
`.trim();

const jsSource = `
// full source: ${GITHUB_SOURCE}/RollingStackedCards.tsx

const root = document.querySelector(".wrapper");

const handleScroll = () => {
  const cards = [...root.querySelectorAll(".card")];
  // a card that has started its discard animation has a computed scale
  const discarded = cards.filter(
    (card) => getComputedStyle(card).scale !== "none"
  );
  const last = discarded.at(-1);
  // how far the latest discard has gone, from 0 to 1 (scale goes 1 to 0.78)
  const ratio = last
    ? 1 - (parseFloat(getComputedStyle(last).scale) - 0.78) / 0.22
    : 0;
  // shift every card up by the cards that are gone, plus the one leaving
  const shift = Math.max(discarded.length - 1, 0) + ratio;
  cards.forEach((card) => {
    card.style.paddingTop = \`calc(var(--card-top-distance) + (var(--index0) - \${shift}) * var(--card-top-offset))\`;
  });
};

document.addEventListener("scroll", handleScroll);
`.trim();

interface CodeBlocks {
  html: string;
  css: string;
  js: string;
}

export const getStaticProps: GetStaticProps<CodeBlocks> = async () => {
  const themes = { light: "vitesse-light", dark: "houston" } as const;
  const [html, css, js] = await Promise.all([
    codeToHtml(htmlSource, { lang: "html", themes, tabindex: false }),
    codeToHtml(cssSource, { lang: "css", themes, tabindex: false }),
    codeToHtml(jsSource, { lang: "js", themes, tabindex: false }),
  ]);
  return { props: { html, css, js } };
};

const StackingCardsPage = (props: CodeBlocks) => {
  return (
    <>
      <ComponentPageMetas componentId={componentId} />
      <TableOfContents.Provider>
        <StackingCardsPageContent {...props} />
      </TableOfContents.Provider>
    </>
  );
};

const StackingCardsPageContent = (props: CodeBlocks) => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  // The stack pulls everything after it up as cards are discarded, by a few
  // hundred pixels once you are past it, so a smooth scroll from above it to a
  // heading below it overshoots: it aims at where the heading was when you
  // clicked. Aim at where the heading will be once every card is discarded,
  // which the browser can tell us by resolving the stack's margin with the end
  // state's values, synchronously, before anything paints.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const href = (event.target as Element | null)
        ?.closest?.('a[href^="#"]')
        ?.getAttribute("href");
      const heading = href
        ? document.getElementById(decodeURIComponent(href.slice(1)))
        : null;
      const stack = demoRef.current?.firstElementChild;
      if (
        !href ||
        !heading ||
        !(stack instanceof HTMLElement) ||
        // Unsupported browsers hide the demo, so nothing moves
        !stack.getClientRects().length ||
        // Only headings after the stack move
        !(
          stack.compareDocumentPosition(heading) &
          Node.DOCUMENT_POSITION_FOLLOWING
        )
      ) {
        return;
      }
      const marginBottom = () =>
        parseFloat(getComputedStyle(stack).marginBottom) || 0;
      const current = marginBottom();
      const amount = stack.style.getPropertyValue("--discarded-amount");
      const ratio = stack.style.getPropertyValue("--discarded-ratio");
      stack.style.setProperty(
        "--discarded-amount",
        `${stack.querySelectorAll("[data-card]").length}`
      );
      stack.style.setProperty("--discarded-ratio", "1");
      const final = marginBottom();
      stack.style.setProperty("--discarded-amount", amount);
      stack.style.setProperty("--discarded-ratio", ratio);

      event.preventDefault();
      history.pushState(null, "", href);
      window.scrollTo({
        top:
          heading.getBoundingClientRect().top +
          window.scrollY +
          (final - current) -
          parseFloat(getComputedStyle(heading).scrollMarginTop),
        behavior: "smooth",
      });
      // pushState does not update :target, so highlight it the way the table
      // of contents does
      heading.classList.add("targeted");
      heading.addEventListener(
        "animationend",
        () => heading.classList.remove("targeted"),
        { once: true }
      );
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const cardsSources = [
    { dark: "/media/hello-mat-dark.png", light: "/media/hello-mat-light.png" },
    {
      dark: "/media/design-engineering/details/og-details-dark.png",
      light: "/media/design-engineering/details/og-details-light.png",
    },
    // {
    //   dark: "/media/design-engineering/images-and-embeds/og-media-dark.png",
    //   light: "/media/design-engineering/images-and-embeds/og-media-light.png",
    // },
    {
      dark: "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-dark.png",
      light:
        "/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png",
    },
    // {
    //   dark: "/media/design-engineering/publish-button/og-publish-button-dark.png",
    //   light:
    //     "/media/design-engineering/publish-button/og-publish-button-light.png",
    // },
    {
      dark: "/media/design-engineering/dock/og-dock-dark.png",
      light: "/media/design-engineering/dock/og-dock-light.png",
    },
    {
      dark: "/media/design-engineering/carousel/og-carousel-dark.png",
      light: "/media/design-engineering/carousel/og-carousel-light.png",
    },
  ] as const;

  const cards = cardsSources.map(({ light, dark }, index) => (
    <picture
      key={index}
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
    >
      <source media="(prefers-color-scheme: dark)" srcSet={dark} />
      <img
        src={light}
        alt={describePreview(light)}
        style={{ aspectRatio: "1200 / 630" }}
      />
    </picture>
  ));

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-rolling-stacking-cards">
          Rolling stacked cards, a scroll-driven animation
        </h1>
        <ArticleDates componentId={componentId} />
        <p>
          A card stack that builds itself as you scroll: each card sticks to the
          top of the viewport, shrinks back as the next one arrives over it, and
          is discarded off the top once four are stacked up, so the pile never
          grows past four. It is built with{" "}
          <strong>scroll-driven CSS animations</strong> and about fifteen lines
          of JavaScript. <a href="#the-code">Scroll the page</a> to see it.
        </p>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .demo {
              display: none;
            }

            *[style*="animation"] {
              will-change: transform, opacity, padding-top, margin-top, scale;
            }

            @supports (animation-timeline: view()) {
              .warning:not([data-bug]) {
                display: none;
              }

              .demo {
                display: block;
              }
            }
          `,
          }}
        />
        <div className="warning">
          <p className="card" style={{ paddingInline: 12 }}>
            <span style={{ display: "flex", gap: 8 }}>
              <span>⚠️</span>
              <span>
                Heads up! This demo uses a feature that is not supported by your
                browser. We will show you a video recording&nbsp;instead.
              </span>
            </span>
          </p>
          <VideoPlayer
            style={{ aspectRatio: "990/500" }}
            sources={{
              dark: {
                src: "/media/design-engineering/stacking-cards/stacking-cards-overview-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/media/design-engineering/stacking-cards/stacking-cards-overview-light.mp4",
                type: "video/mp4",
              },
            }}
          />
        </div>
        <div ref={demoRef} className="demo" style={{ paddingBottom: 48 }}>
          <RollingStackedCards
            cards={[...cards, ...cards, ...cards, ...cards.slice(0, 1)]}
            topDistance={"32px"}
            topOffset={"calc(32px / 1px / 464 * var(--card-height))"}
            cardHeight={
              "calc(var(--inline-size) / 1.9047619048 + var(--card-padding) * 2)"
            }
            cardMargin={"0px"}
            cardPadding={"0px"}
            gap={"28px"}
            rollingCount={4}
          />
        </div>

        <h2 id="two-mechanisms">Two mechanisms, not one</h2>
        <p>
          The thing that took me longest to see is that a stacked cards effect
          is <strong>two separate techniques doing two separate jobs</strong>,
          and almost every explanation of it runs them together.
        </p>
        <p>
          The stacking is not an animation at all. Every card is{" "}
          <code>position: sticky</code> with <code>top: 0</code>, so as you
          scroll, each one stops at the top of the viewport and the next card
          slides up underneath it. That alone gets you a pile of cards, in plain
          CSS, with no timeline involved and no JavaScript. If all you want is a
          stack, you can stop reading here.
        </p>
        <p>
          The scroll-driven animation does the other half: it takes the cards
          that are already stuck and scales them back so the pile reads as
          depth, then discards the ones at the bottom once the stack is four
          deep. That is what stops it turning into a heap of forty cards by the
          end of the page.
        </p>
        <h2 id="scroll-driven-animations">Scroll driven animations</h2>
        <p>
          A relatively new feature in modern browsers, scroll-driven animations
          allows you to animate based on scroll progression instead of time.
          While the basics are pretty simple to master, making the animation
          rolling is a bit more complex. You’ll need to stack multiple
          animations and calculate offsets based on the total wrapper height.
        </p>
        <p>
          The timeline here is a <strong>view timeline</strong> rather than a
          scroll timeline: the wrapper declares{" "}
          <code>view-timeline-name: --cards-scrolling</code>, so progress is
          measured by how far the wrapper has traveled through the viewport
          rather than by how far the page has scrolled. Each card then attaches
          to that timeline and runs over a slice of it.
        </p>
        <p>
          Working out the slice is where it gets gnarly. Each card’s range is
          expressed against the <code>exit-crossing</code> phase, and its start
          and end are computed from the card’s own index, the number of cards
          allowed in the stack, the card height, and the wrapper’s block size.
          It is a lot of arithmetic in a custom property, and it is the reason
          this looks harder than it is: the effect is simple, the bookkeeping is
          not.
        </p>
        <h3 id="stacking-multiple-animations">
          Stacking multiple scroll-driven animations
        </h3>
        <p>
          To stack multiple animations, we need to create a wrapper element that
          will be animated for each animation we want to stack. We also need to
          take care to disable animations for the last few cards, so that they
          don’t keep shrinking after we scroll past the limit, leaving 4 stacked
          cards as the final state, as intended.
        </p>
        <h3 id="javascript-usage">Javascript usage</h3>
        <p>
          While the most of the effect happens in pure CSS, we’re still relying
          on javascript to properly shift the cards as the previous one is
          discarded. While this might be doable without javascript, the css
          calculations are already a bit gnarly, and I didn’t want to complicate
          things further.
        </p>
        <h2 id="the-rolling-part">What makes it roll</h2>
        <p>
          Scaling a card down on its own center makes it recede, which is fine
          but flat. The rolling comes from one line:{" "}
          <code>transform-origin: center 200%</code>, which puts the origin well
          below the card, so the same scale reads as the card tipping away from
          you over an axis somewhere near your knees. It is a small change and
          it is most of the character of the effect.
        </p>
        <p>
          The discard keyframe then takes the card out with a negative{" "}
          <code>margin-top</code> as well as opacity and scale, so the cards
          underneath close the gap as it leaves rather than waiting for it to
          finish fading.
        </p>
        <h2 id="the-code">The code</h2>
        <p>
          Stripped down to the parts that make the effect, and complete enough
          to paste into a page once you have added a few more cards, the html
          explains how. The html nests each card in its scale layers, the css
          holds the settings, the sticky cards, the view timeline and the two
          animations, and the javascript shifts the stack up as cards are
          discarded. The full{" "}
          <a
            href={`${GITHUB_SOURCE}/RollingStackedCards.module.scss`}
            target="_blank"
            rel="noopener"
          >
            scss
          </a>{" "}
          and{" "}
          <a
            href={`${GITHUB_SOURCE}/RollingStackedCards.tsx`}
            target="_blank"
            rel="noopener"
          >
            tsx
          </a>{" "}
          are on github.
        </p>
        <Tabs
          defaultValue="html"
          tabs={[
            {
              id: "html",
              trigger: (
                <h4 id="html" data-no-toc={""}>
                  html
                </h4>
              ),
              content: <CodeBlock html={props.html} label="html" />,
            },
            {
              id: "css",
              trigger: (
                <h4 id="css" data-no-toc={""}>
                  css
                </h4>
              ),
              content: <CodeBlock html={props.css} label="css" />,
            },
            {
              id: "js",
              trigger: (
                <h4 id="js" data-no-toc={""}>
                  js
                </h4>
              ),
              content: <CodeBlock html={props.js} label="js" />,
            },
          ]}
        />
        <h2 id="when-the-browser-cannot">When the browser cannot do it</h2>
        <p>
          Scroll-driven animations are still not everywhere, so the demo above
          is behind <code>@supports (animation-timeline: view())</code>. Where
          it is not supported you get a video of the effect and a note saying
          so, rather than a stack of cards sitting there doing nothing, which is
          the failure mode you get if you ship this and assume.
        </p>
        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          This is my first time playing with scroll-driven animations, as these
          are not yet widely supported, I wanted to get a better understanding.
          My conclusion is that while simple effects can be achieved with fairly
          simple css, more complex effects require a bit more work. You’ll need
          to compute animation ranges, which can get pretty intense depending on
          the effect you’re aiming for, and deal with browsers quirks, because
          life as a web engineer wouldn’t be fun without them.
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default StackingCardsPage;
