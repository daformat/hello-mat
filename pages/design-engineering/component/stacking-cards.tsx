import { TableOfContents } from "@/components/TableOfContents/TocComponent"
import { Fragment, useEffect, useRef } from "react"
import { NextCard } from "@/components/Navigation/NextCard"
import Link from "next/link"
import { PageMetas } from "@/components/PageMetas/PageMetas"
import { RollingStackedCards } from "@/components/RollingStackedCards/RollingStackedCards"
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer"

const CardsStackingPage = () => (
  <>
    <PageMetas
      title="Design engineering: a carousel component"
      description="Building a scrollable, and swipeable carousel, with momentum scrolling, overscroll and rubber-banding using React, TypeScript, and SCSS."
      url="https://hello-mat.com/design-engineering/component/carousel-component"
      image="https://hello-mat.com/media/design-engineering/carousel/og-carousel-light.png"
      imageWidth={1200}
      imageHeight={630}
    />
    <TableOfContents.Provider>
      <CardsStackingPageContent />
    </TableOfContents.Provider>
  </>
)

const CardsStackingPageContent = () => {
  const tocContext = TableOfContents.useToc()
  const contentRef = useRef<HTMLDivElement>(null)

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
        <h1 id="design-engineering-a-dock-component">
          Design engineering: rolling stacked cards
        </h1>
        <p>
          A scroll-driven animation that stacks cards in a rolling fashion, with
          up to 4 stacked cards at a time. Just scroll the page to see it in
          action.
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
                display: initial;
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
        <div className="demo">
          <RollingStackedCards
            cards={[...cards, ...cards, ...cards, cards[0]]}
            topDistance={"32px"}
            topOffset={"calc(32px / 1px / 464 * var(--card-height))"}
            cardHeight={
              "calc(var(--inline-size) / 1.9047619048 + var(--card-padding) * 2)"
            }
            cardMargin={"8px"}
            cardPadding={"8px"}
            rollingCount={4}
          />
        </div>

        <h2 id="things-to-try">Things to try</h2>
        <h3 id="momentum-scrolling">Momentum scrolling</h3>
        <p>
          Of course you can scroll the regular way, but you can also drag to
          swipe the carousel. On most browsers (cough cough, Safari...) dragging
          to swipe will respect the css <code>scroll-snap-align</code>. When you
          drag to swipe, we use a custom momentum scrolling implementation when
          needed (desktop browsers). The greater the velocity, the further the
          carousel will scroll.
        </p>
        <h3 id="overscroll">Overscroll / rubber-banding</h3>
        <p>
          When dragging to swipe, if you give it enough velocity the carousel
          will overscroll, with a rubber-banding effect, similar to the one you
          get on touch devices by default. For this to work, we calculate a
          velocity based on how fast you are moving your mouse and apply a
          deceleration factor. When yous scrolled to the start of the end of the
          carousel, you can also trigger the rubber-banding effect by dragging
          the carousel even more.
        </p>
        <h3 id="Pagination">Pagination</h3>
        <p>
          The carousel can be paginated, using the dedicated buttons, pagination
          is based on the <code>scroll-snap-align</code> set in css. For this
          demo, I chose to use <code>center</code>, so the next item that is not
          fully visible will be centered in the viewport when clicking the next
          or previous page buttons.
        </p>
        <h3 id="snapping">Snapping</h3>
        <p>
          Because of the css styles, the carousel items will snap naturally when
          performing a regular scroll. I chose{" "}
          <code>scroll-snap-align: center</code> for this demo. But when you
          drag to scroll on desktop, this behavior is not a given. You have to
          implement it yourself by adjusting the deceleration factor for the
          velocity, so that the velocity reaches 0 towards the snap point. I
          also chose to allow small movements not to snap, so that it feels more
          natural.
        </p>
        <h2 id="conclusion">That’s a wrap</h2>
        <p>
          While implementing the basic version of the carousel is easy, thanks
          to modern css, implementing momentum scrolling with snapping and
          overscroll / rubber-banding on desktop isn’t trivial. Maybe I’ll try
          to enable infinite scrolling at some point, but for now, this is a
          good start.
        </p>
        <NextCard href={"/design-engineering/component/table-of-contents"}>
          Table of contents
        </NextCard>
      </div>
    </>
  )
}

interface IProps {
  name: string
  [key: string]: React.CSSProperties | string
}

export const Keyframes = ({ name, ...props }: IProps) => {
  const toCss = (cssObject: React.CSSProperties | string) =>
    typeof cssObject === "string"
      ? cssObject
      : Object.keys(cssObject).reduce((accumulator, key) => {
          const cssKey = key.replace(/[A-Z]/g, (v) => `-${v.toLowerCase()}`)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cssValue = (cssObject as any)[key].toString().replace("'", "")
          return `${accumulator}${cssKey}:${cssValue};`
        }, "")

  return (
    <style>
      {`@keyframes ${name} {
        ${Object.keys(props)
          .map((key) => {
            return ["from", "to"].includes(key)
              ? `${key} { ${toCss(props[key])} }`
              : /^_[0-9]+$/.test(key)
              ? `${key.replace("_", "")}% { ${toCss(props[key])} }`
              : ""
          })
          .join(" ")}
      }`}
    </style>
  )
}

export default CardsStackingPage
