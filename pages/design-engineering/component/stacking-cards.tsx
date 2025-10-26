import { TableOfContents } from "@/components/TableOfContents/TocComponent"
import { useEffect, useRef } from "react"
import { NextCard } from "@/components/Navigation/NextCard"
import Link from "next/link"
import { PageMetas } from "@/components/PageMetas/PageMetas"
import { RollingStackedCards } from "@/components/RollingStackedCards/RollingStackedCards"
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer"

const StackingCardsPage = () => (
  <>
    <PageMetas
      title="Design engineering: rolling stacking cards"
      description="Building a rolling stacking cards scroll-driven animation with React, TypeScript, and SCSS."
      url="https://hello-mat.com/design-engineering/stacking-cards"
      image="https://hello-mat.com/media/design-engineering/stacking-cards/og-stacking-cards-light.png"
      imageWidth={1200}
      imageHeight={630}
    />
    <TableOfContents.Provider>
      <StackingCardsPageContent />
    </TableOfContents.Provider>
  </>
)

const StackingCardsPageContent = () => {
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
        <h1 id="design-engineering-rolling-stacking-cards">
          Design engineering: rolling stacking cards
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
        <div className="demo" style={{ paddingBottom: 48, display: "block" }}>
          <RollingStackedCards
            cards={[...cards, ...cards, ...cards, cards[0]]}
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

export default StackingCardsPage
