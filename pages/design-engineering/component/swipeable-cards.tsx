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
          and that is not so common in desktop apps. It’s so much fun to use, go
          ahead a drag / swipe cards around and see what happens.
        </p>
        <div
          ref={demoRef}
          className="demo"
          style={{ marginBlock: 32, maxWidth: 650, marginInline: "auto" }}
        >
          <SwipeableCards.Root
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
          >
            <SwipeableCards.Cards />
            <p style={{ textAlign: "center" }}>
              <SwipeableCards.DeclineButton /> <SwipeableCards.AcceptButton />
            </p>
          </SwipeableCards.Root>
        </div>

        <h2 id="swipe-gesture">Swipe gestures</h2>
        <p>
          Performing swipe gestures on the web is not a native feature, so
          you’ll have to do it yourself. The gist of it is to translate the card
          as you drag it, and compute the velocity of the swipe for a realistic
          momentum to be applied as you discard a card. This is done simply by
          dividing the distance traveled by the card by the amount of time
          elapsed since the last pointer move event.
        </p>
        <h3 id="handling-low-velocity">Handling low velocity</h3>
        <p>
          If you drag a card just a little a bit and release the pointer, the
          card will return to the stack. Unless you moved it by some minimal
          distance. In this case, we need to &rdquo;fake&ldquo; the velocity so
          the card properly animates out of the viewport.
        </p>
        <h3 id="faking-gestures">Faking gestures when using buttons</h3>
        <p>
          When using buttons, the user didn’t actually perform a swipe gesture,
          so we need to simulate it. We do this by mocking the dragging state,
          so that the card properly animates out.
        </p>
        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          I was curious to see how I would implement this, so I settled on
          finding out. I’m overall pretty pleased with the result, and I think
          I’ll re-use the component in the future. There is something deeply
          satisfying in using this interaction, and I think Tinder made it their
          landmark for a reason.
        </p>
        <NextCard href={"/design-engineering/component/table-of-contents"}>
          Table of contents
        </NextCard>
      </div>
    </>
  )
}

export default SwipeableCardsPage
