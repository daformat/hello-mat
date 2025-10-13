import { TableOfContents } from "@/components/TableOfContents/TocComponent"
import { CSSProperties, useEffect, useRef, useState } from "react"
import { NextCard } from "@/components/Navigation/NextCard"
import Link from "next/link"
import { PageMetas } from "@/components/PageMetas/PageMetas"
import { Carousel } from "@/components/Carousel/Carousel"
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6"

import styles from "@/components/Carousel/Carousel.module.scss"

const CarouselComponentPage = () => (
  <>
    <PageMetas
      title="Design engineering: a carousel component"
      description="Building a scrollable, and swipeable carousel, using React, TypeScript, and SCSS."
      url="https://hello-mat.com/design-engineering/component/carousel-component"
      image="https://hello-mat.com/media/design-engineering/carousel/og-carousel-light.png"
      imageWidth={1200}
      imageHeight={630}
    />
    <TableOfContents.Provider>
      <CarouselComponentPageContent />
    </TableOfContents.Provider>
  </>
)

const CarouselComponentPageContent = () => {
  const tocContext = TableOfContents.useToc()
  const contentRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(0.5)

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
        <p>A scrollable, and swipeable carousel.</p>

        <div style={{ marginInline: -18 }}>
          <Carousel.Root boundaryOffset={getBoundaryOffset}>
            <Carousel.Viewport>
              <Carousel.Content>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/hello-mat-dark.png"
                    />
                    <img
                      src="/media/hello-mat-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/toc/og-toc-dark.png"
                    />
                    <img
                      src="/media/design-engineering/toc/og-toc-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/details/og-details-dark.png"
                    />
                    <img
                      src="/media/design-engineering/details/og-details-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/images-and-embeds/og-media-dark.png"
                    />
                    <img
                      src="/media/design-engineering/images-and-embeds/og-media-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-dark.png"
                    />
                    <img
                      src="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/publish-button/og-publish-button-dark.png"
                    />
                    <img
                      src="/media/design-engineering/publish-button/og-publish-button-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/dock/og-dock-dark.png"
                    />
                    <img
                      src="/media/design-engineering/dock/og-dock-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/hello-mat-dark.png"
                    />
                    <img
                      src="/media/hello-mat-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/toc/og-toc-dark.png"
                    />
                    <img
                      src="/media/design-engineering/toc/og-toc-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/details/og-details-dark.png"
                    />
                    <img
                      src="/media/design-engineering/details/og-details-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/images-and-embeds/og-media-dark.png"
                    />
                    <img
                      src="/media/design-engineering/images-and-embeds/og-media-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-dark.png"
                    />
                    <img
                      src="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/publish-button/og-publish-button-dark.png"
                    />
                    <img
                      src="/media/design-engineering/publish-button/og-publish-button-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }} className={styles.card}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/dock/og-dock-dark.png"
                    />
                    <img
                      src="/media/design-engineering/dock/og-dock-light.png"
                      alt=""
                      style={{
                        minWidth: `calc(20vw * ${size + 0.5})`,
                      }}
                    />
                  </picture>
                </Carousel.Item>
              </Carousel.Content>
            </Carousel.Viewport>
            <div
              style={{
                display: "flex",
                gap: 4,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong style={{ margin: 0 }}>Scroll or swipe</strong>
              <div style={{ display: "flex", gap: 4 }}>
                <Carousel.PrevPage>
                  <FaChevronLeft size={12} />
                </Carousel.PrevPage>
                <Carousel.NextPage>
                  <FaChevronRight size={12} />
                </Carousel.NextPage>
              </div>
            </div>
          </Carousel.Root>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <label htmlFor="size">
            <small>Card size</small>
          </label>
          <input
            name="size"
            type="range"
            min={0}
            max={1}
            value={size}
            step={0.01}
            onChange={(e) => {
              setSize(Number(e.target.value))
            }}
            style={
              {
                "--value": `${size * 100}%`,
              } as CSSProperties
            }
          />
        </div>
        <NextCard href={"/design-engineering/component/table-of-contents"}>
          Table of contents
        </NextCard>
      </div>
    </>
  )
}

const getBoundaryOffset = (container: HTMLElement) => {
  const viewport = container.querySelector("[data-carousel-viewport]")
  if (viewport) {
    const computedStyle = getComputedStyle(viewport)
    const maskSize = computedStyle.getPropertyValue("--mask-size")
    const temp = document.createElement("div")
    temp.style.position = "absolute"
    temp.style.visibility = "hidden"
    temp.style.setProperty("--mask-size", maskSize)
    temp.style.width = "var(--mask-size)"
    document.body.appendChild(temp)
    const computed = getComputedStyle(temp)
    const result = { x: parseFloat(computed.getPropertyValue("width")), y: 0 }
    console.log(result)
    return result
  }
  return { x: 0, y: 0 }
}

export default CarouselComponentPage
