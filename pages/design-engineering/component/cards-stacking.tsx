import { TableOfContents } from "@/components/TableOfContents/TocComponent"
import { CSSProperties, useEffect, useRef } from "react"
import { NextCard } from "@/components/Navigation/NextCard"
import Link from "next/link"
import { PageMetas } from "@/components/PageMetas/PageMetas"
import { useCssSizeVariables } from "@/hooks/useCssSizeVariables"

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
  const cardsContainerRef = useRef<HTMLDivElement>(null)
  useCssSizeVariables(cardsContainerRef)

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current)
    }
  })

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-dock-component">
          Design engineering: a carousel component
        </h1>
        <p>
          A scrollable, and swipeable carousel, even on desktop (complete with
          snapping, friction and overscroll). Inspired by a&nbsp;component made
          at{" "}
          <a href="https://finary.com" target="_blank" rel="noopener">
            Finary
          </a>
          , a one-stop shop for wealth management. Play with the component, and
          try changing the card size.
        </p>
        <div ref={cardsContainerRef}>
          <Keyframes
            name="scale"
            to={{
              transform: "scale(calc(1 - calc(0.1 * var(--reverse-index0))))",
            }}
          />
          <div
            style={
              {
                "--cards-amount": 4,
                "--card-top-offset": "32px",
                "--card-height": "calc(var(--inline-size) / 1.9047619048)",
                "--card-margin": "16px",
                viewTimelineName: "--cards-scrolling",
                display: "grid",
                gridTemplateColumns: "1fr",
                gridTemplateRows:
                  "repeat(var(--cards-amount), var(--card-height))",
                gap: "var(--card-margin)",
                paddingBottom:
                  "calc(var(--cards-amount) * var(--card-top-offset))",
                marginBottom: "var(--card-margin)",
                // outline: "10px solid #ff777799",
              } as CSSProperties
            }
          >
            {["Card one", "Card two", "Card three", "Card four"].map(
              (content, i) => (
                <div
                  key={i}
                  style={
                    {
                      position: "sticky",
                      top: 0,
                      paddingTop: "calc(var(--index) * var(--card-top-offset))",
                      // outline: "1px solid lime",
                      "--index": `${i + 1}`,
                      "--index0": "calc(var(--index) - 1)",
                      "--reverse-index":
                        "calc(var(--cards-amount) - var(--index0))",
                      "--reverse-index0": "calc(var(--reverse-index) - 1)",
                    } as CSSProperties
                  }
                >
                  <div
                    className="card tertiary"
                    style={
                      {
                        "--start-range":
                          "calc(var(--index0) / var(--cards-amount) * 100%)",
                        "--end-range":
                          "calc((var(--index)) / var(--cards-amount) * 100%)",
                        // backgroundColor:
                        //   "var(--color-toolbar-button-background-hover)",
                        minHeight: "var(--card-height)",
                        animation: "scale linear forwards",
                        animationTimeline: "--cards-scrolling",
                        animationRange:
                          "exit-crossing var(--start-range) exit-crossing var(--end-range)",
                        transformOrigin: "50% 0%",
                      } as CSSProperties
                    }
                  >
                    {content}
                  </div>
                </div>
              )
            )}
          </div>
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
