import { TableOfContents } from "@/components/TableOfContents/TocComponent"
import { useEffect, useRef } from "react"
import { NextCard } from "@/components/Navigation/NextCard"
import Link from "next/link"
import { PageMetas } from "@/components/PageMetas/PageMetas"
import { Carousel } from "@/components/Carousel/Carousel"
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6"

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
        <div
          className="card"
          style={{
            backgroundColor: "transparent",
            overflow: "visible",
            display: "flex",
            justifyContent: "center",
            padding: "128px 16px",
          }}
        >
          <Carousel.Root>
            <div
              style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}
            >
              <Carousel.PrevPage>
                <FaChevronLeft size={12} />
              </Carousel.PrevPage>
              <Carousel.NextPage>
                <FaChevronRight size={12} />
              </Carousel.NextPage>
            </div>
            <Carousel.Viewport>
              <Carousel.Content>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/hello-mat-dark.png"
                    />
                    <img
                      src="/media/hello-mat-light.png"
                      alt=""
                      style={{ minWidth: "min(30vw, 300px)" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/toc/og-toc-dark.png"
                    />
                    <img
                      src="/media/design-engineering/toc/og-toc-light.png"
                      alt=""
                      style={{ minWidth: "min(30vw, 300px)" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/details/og-details-dark.png"
                    />
                    <img
                      src="/media/design-engineering/details/og-details-light.png"
                      alt=""
                      style={{ minWidth: "min(30vw, 300px)" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/images-and-embeds/og-media-dark.png"
                    />
                    <img
                      src="/media/design-engineering/images-and-embeds/og-media-light.png"
                      alt=""
                      style={{ minWidth: "min(30vw, 300px)" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-dark.png"
                    />
                    <img
                      src="/media/design-engineering/collapsible-toolbar/og-collapsible-toolbar-light.png"
                      alt=""
                      style={{ minWidth: "min(30vw, 300px)" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/publish-button/og-publish-button-dark.png"
                    />
                    <img
                      src="/media/design-engineering/publish-button/og-publish-button-light.png"
                      alt=""
                      style={{ minWidth: "min(30vw, 300px)" }}
                    />
                  </picture>
                </Carousel.Item>
                <Carousel.Item>
                  <picture style={{ fontSize: 0 }}>
                    <source
                      media="(prefers-color-scheme: dark)"
                      srcSet="/media/design-engineering/dock/og-dock-dark.png"
                    />
                    <img
                      src="/media/design-engineering/dock/og-dock-light.png"
                      alt=""
                      style={{ minWidth: "min(30vw, 300px)" }}
                    />
                  </picture>
                </Carousel.Item>
              </Carousel.Content>
            </Carousel.Viewport>
          </Carousel.Root>
        </div>
        <NextCard href={"/design-engineering/component/table-of-contents"}>
          Table of contents
        </NextCard>
      </div>
    </>
  )
}

export default CarouselComponentPage
