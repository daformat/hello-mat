import { TableOfContents } from "components/TableOfContents/TocComponent"
import Head from "next/head"
import { useEffect, useRef, useState } from "react"
import { EmbedComp, ImageComp } from "../../../components/Media/MediaComponent2"

const ImageAndEmbedsPage = () => (
  <>
    <Head>
      <title>Design engineering: images and embeds</title>
      <meta
        name="description"
        content="Building a MediaComponent supporting images and embeds using React, TypeScript, and SCSS."
      />
    </Head>
    <TableOfContents.Provider>
      <ImageAndEmbedsContent />
    </TableOfContents.Provider>
  </>
)

const ImageAndEmbedsContent = () => {
  const tocContext = TableOfContents.useToc()
  const contentRef = useRef<HTMLDivElement>(null)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current)
    }
  })

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <h1 id="design-engineering-a-table-of-content-component">
          Design engineering: images and embeds
        </h1>
        <p>
          More often than not, web pages contain images and embeds. What should
          these components do? These ones were designed at{" "}
          <a href="https://beamapp.co">Beam</a>, a browser with a first-class
          note taking experience, and support for images and embeds.
        </p>
        <ul>
          {/*<li>*/}
          {/*  <EmbedComp*/}
          {/*    open={false}*/}
          {/*    title="Lubomyr Melnyk - Barcarolle"*/}
          {/*    source="https://www.youtube.com/watch?v=KOJkst2Odfs"*/}
          {/*  />*/}
          {/*</li>*/}
          {/*<li>*/}
          {/*  <EmbedComp*/}
          {/*    open={false}*/}
          {/*    title="Antlers in the Mist"*/}
          {/*    source="https://www.flickr.com/photos/124051802@N04/45745445165/in/pool-best100only/"*/}
          {/*  />*/}
          {/*</li>*/}
          {/*<li>*/}
          {/*  <EmbedComp*/}
          {/*    open={false}*/}
          {/*    title="Volta - Boogie Belgique"*/}
          {/*    source="https://open.spotify.com/track/6S4hDG6meUTOBUemVHelrx?si=31db165395a747e2"*/}
          {/*  />*/}
          {/*</li>*/}
          <li>
            <EmbedComp
              open={false}
              title="Magnifique - Ratatat"
              source="https://open.spotify.com/album/7ox0VtOfJBl7Oz3BRGOg1G"
            />
          </li>
          <li>
            <EmbedComp
              open={false}
              source="https://x.com/daformat/status/1377323694264029185"
            />
          </li>
          <li>
            <ImageComp
              title="A colorful chameleon"
              source="https://letsenhance.io/static/8f5e523ee6b2479e26ecc91b9c25261e/bbb97/MainAfter.avif"
            />
          </li>
        </ul>
        <h2>Functional requirements</h2>
        <ul>
          <li>The component should support images and embeds</li>
          <li>
            The component should display a loading state until the media has
            been loaded
          </li>
          <li>
            The component should display a loading state until the media has
            been loaded
          </li>
          <li>
            The component should support passing predetermines dimensions to
            avoid layout shift
          </li>
          <li>
            In the case of no predetermined dimensions, the component should
            load the media and properly resize
          </li>
          <li>
            The component should support medias that are responsive, in either
            or both dimensions, and support medias that are not responsive
          </li>
          <li>
            The component should be collapsible, except on small screens, where
            it should be expandable only if collapsed
          </li>
        </ul>
        <h2>Non- functional requirements</h2>
        <ul>
          <li>The component should be accessible to screen readers</li>
          <li>The component should be accessible to keyboard users</li>
          <li>The component should be accessible to mouse users</li>
          <li>The component should be accessible to touch users</li>
          <li>The component should honor prefers-reduced-motion</li>
          <li>Animations should be interruptible</li>
        </ul>
      </div>
    </>
  )
}

export default ImageAndEmbedsPage
