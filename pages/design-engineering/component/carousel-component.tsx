import { TableOfContents } from "@/components/TableOfContents/TocComponent"
import { useEffect, useRef } from "react"
import { NextCard } from "@/components/Navigation/NextCard"
import Link from "next/link"
import { PageMetas } from "@/components/PageMetas/PageMetas"
import { Carousel } from "@/components/Carousel/Carousel"

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
            <Carousel.PrevPage>&lt;</Carousel.PrevPage>
            <Carousel.NextPage>&gt;</Carousel.NextPage>
            <Carousel.Viewport>
              <Carousel.Content>
                <Carousel.Item>Item 1</Carousel.Item>
                <Carousel.Item>Item 2</Carousel.Item>
                <Carousel.Item>Item 3</Carousel.Item>
                <Carousel.Item>Item 4</Carousel.Item>
                <Carousel.Item>Item 5</Carousel.Item>
                <Carousel.Item>Item 6</Carousel.Item>
                <Carousel.Item>Item 7</Carousel.Item>
                <Carousel.Item>Item 8</Carousel.Item>
                <Carousel.Item>Item 9</Carousel.Item>
                <Carousel.Item>Item 10</Carousel.Item>
                <Carousel.Item>Item 11</Carousel.Item>
                <Carousel.Item>Item 12</Carousel.Item>
                <Carousel.Item>Item 13</Carousel.Item>
                <Carousel.Item>Item 14</Carousel.Item>
                <Carousel.Item>Item 15</Carousel.Item>
                <Carousel.Item>Item 16</Carousel.Item>
                <Carousel.Item>Item 17</Carousel.Item>
                <Carousel.Item>Item 18</Carousel.Item>
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
