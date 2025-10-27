import { TableOfContents } from "@/components/TableOfContents/TocComponent"
import { useEffect, useRef } from "react"
import { NextCard } from "@/components/Navigation/NextCard"
import Link from "next/link"
import { PageMetas } from "@/components/PageMetas/PageMetas"
import { SwipeableCards } from "@/components/SwipeableCards/SwipeableCards"
import { useCssSizeVariables } from "@/hooks/useCssSizeVariables"

const SwipeableCardsPage = () => (
  <>
    <PageMetas
      title="Design engineering: a swipeable cards carousel"
      description="Building a swipeable cards stack with React, TypeScript, and SCSS."
      url="https://hello-mat.com/design-engineering/swipeable-cards"
      image="https://hello-mat.com/media/design-engineering/swipeable-cards/og-swipeable-cards-dark.png"
      imageWidth={1200}
      imageHeight={630}
    />
    <TableOfContents.Provider>
      <SwipeableCardsPageContent />
    </TableOfContents.Provider>
  </>
)

const SwipeableCardsPageContent = () => {
  const tocContext = TableOfContents.useToc()
  const contentRef = useRef<HTMLDivElement>(null)
  const demoRef = useRef<HTMLDivElement>(null)
  useCssSizeVariables(demoRef)

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current)
    }
  })

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
  ]

  const cards = cardsSources.map(({ light, dark }, index) => (
    <picture
      key={index}
      className="card flat shadow"
      style={{ display: "inline-block", fontSize: 0, padding: 8 }}
    >
      <source media="(prefers-color-scheme: dark)" srcSet={dark} />
      <img src={light} alt="" style={{ aspectRatio: "1200 / 630" }} />
    </picture>
  ))

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-swipeable-cards-carousel">
          Design engineering: a swipeable cards carousel
        </h1>
        <p>
          A cards carousel with swipe gestures, loopable or not. This is an
          interaction pioneered by{" "}
          <a href={"https://tinder.com/"} target="_blank" rel="noopener">
            Tinder
          </a>{" "}
          and that is not so common in desktop apps.
        </p>
        <div
          ref={demoRef}
          className="demo"
          style={{ marginBlock: 32, maxWidth: 650, marginInline: "auto" }}
        >
          <SwipeableCards
            cards={[...cards]}
            visibleStackLength={3}
            loop
            // emptyStackView={({ cardsWithId, setStack }) => (
            //   <div style={{ padding: 8 }}>
            //     <div
            //       style={{
            //         textAlign: "center",
            //         padding: "8px 16px",
            //         borderRadius: 8,
            //         border: "2px dashed var(--color-border-1)",
            //         width: "var(--inline-size)",
            //         aspectRatio: "1200 / 630",
            //         display: "flex",
            //         alignItems: "center",
            //         justifyContent: "center",
            //         flexDirection: "column",
            //         padding: 0,
            //         boxSizing: "border-box",
            //         gap: 8,
            //       }}
            //     >
            //       No more cards to show
            //       <button
            //         className="button"
            //         onClick={() => setStack(cardsWithId)}
            //       >
            //         Reset stack
            //       </button>
            //     </div>
            //   </div>
            // )}
          />
        </div>

        <h2 id="scroll-driven-animations">Scroll driven animations</h2>
        <p>
          A relatively new feature in modern browsers, scroll-driven animations
          allows you to animate based on scroll progression instead of time.
          While the basics are pretty simple to master, making the animation
          rolling is a bit more complex. You’ll need to stack multiple
          animations and calculate offsets based on the total wrapper height.
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
        <NextCard href={"/design-engineering/component/table-of-contents"}>
          Table of contents
        </NextCard>
      </div>
    </>
  )
}

export default SwipeableCardsPage
