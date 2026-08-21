import Link from "next/link";
import { useEffect, useRef } from "react";

import { ArticleDates } from "@/components/Navigation/ArticleDates";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { ComponentPageMetas } from "@/components/PageMetas/ComponentPageMetas";
import { RollingStackedCards } from "@/components/RollingStackedCards/RollingStackedCards";
import { TableOfContents } from "@/components/TableOfContents/TocComponent";
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer";
import { ComponentId } from "@/constants/design-engineering/components";
import { describePreview } from "@/utils/media-alt";

const componentId: ComponentId = "stacking-cards";

const StackingCardsPage = () => {
  return (
    <>
      <ComponentPageMetas componentId={componentId} />
      <TableOfContents.Provider>
        <StackingCardsPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const StackingCardsPageContent = () => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

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
          of JavaScript. Scroll the page to see it.
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
        <div className="demo" style={{ paddingBottom: 48 }}>
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
          measured by how far the wrapper has travelled through the viewport
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
          Scaling a card down on its own centre makes it recede, which is fine
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
