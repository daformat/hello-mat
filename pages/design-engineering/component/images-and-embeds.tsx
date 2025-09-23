import { TableOfContents } from "components/TableOfContents/TocComponent"
import Head from "next/head"
import { useEffect, useRef, useState } from "react"
import { DetailsComponent } from "../../../components/Details/DetailsComponent"
import { VideoPlayer } from "../../../components/VideoPlayer/VideoPlayer"
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
        <ul>
          {/*<li>*/}
          {/*  <EmbedComponent*/}
          {/*    result={{*/}
          {/*      type: RecognizedContentType.video,*/}
          {/*      keepAspectRatio: true,*/}
          {/*      responsive: ResizeType.both,*/}
          {/*      minHeight: 200 / 1.7777777778,*/}
          {/*      minWidth: 200,*/}
          {/*      maxHeight: 1200 / 1.7777777778,*/}
          {/*      maxWidth: 1200,*/}
          {/*      html: '<iframe width="560" height="315" src="https://www.youtube.com/embed/KOJkst2Odfs?si=vj-xOKSTUNJG1SSM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',*/}
          {/*      title: "Lubomyr Melnyk - Barcarolle",*/}
          {/*      url: "https://www.youtube.com/watch?v=KOJkst2Odfs",*/}
          {/*      provider: "YouTube",*/}
          {/*      favicon:*/}
          {/*        "https://www.youtube.com/s/desktop/2ea5cbbe/img/favicon_144x144.png",*/}
          {/*    }}*/}
          {/*  />*/}
          {/*</li>*/}
          {/*<li>*/}
          {/*  <EmbedComponent*/}
          {/*    collapsed*/}
          {/*    result={{*/}
          {/*      type: RecognizedContentType.rich,*/}
          {/*      keepAspectRatio: false,*/}
          {/*      responsive: ResizeType.horizontal,*/}
          {/*      maxHeight: 352,*/}
          {/*      maxWidth: 600,*/}
          {/*      html: '<iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/album/7ox0VtOfJBl7Oz3BRGOg1G?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>',*/}
          {/*      title: "Magnifique - Ratatat",*/}
          {/*      url: "https://open.spotify.com/album/7ox0VtOfJBl7Oz3BRGOg1G",*/}
          {/*      provider: "Spotify",*/}
          {/*      favicon:*/}
          {/*        "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png",*/}
          {/*    }}*/}
          {/*  />*/}
          {/*</li>*/}
          {/*<li>*/}
          {/*  <MediaComponent*/}
          {/*    type={MediaType.image}*/}
          {/*    source={"/MainAfter.avif"}*/}
          {/*    media={<img src="/MainAfter.avif" alt="MainAfter" />}*/}
          {/*    icon={"/MainAfter.avif"}*/}
          {/*    title={"A colorful chameleon"}*/}
          {/*  />*/}
          {/*</li>*/}
          <li>
            <EmbedComp source="https://www.youtube.com/watch?v=KOJkst2Odfs" />
          </li>
          <li>
            <EmbedComp source="https://www.flickr.com/photos/124051802@N04/45745445165/in/pool-best100only/" />
          </li>
          <li>
            <EmbedComp source="https://x.com/daformat/status/1377323694264029185" />
          </li>
          <li>
            <EmbedComp
              open={false}
              source="https://open.spotify.com/track/6S4hDG6meUTOBUemVHelrx?si=31db165395a747e2"
            />
          </li>
          <li>
            <EmbedComp
              open={false}
              source="https://open.spotify.com/album/7ox0VtOfJBl7Oz3BRGOg1G"
            />
          </li>
          <li>
            <ImageComp
              open={false}
              title="A colorful chameleon"
              source="https://letsenhance.io/static/8f5e523ee6b2479e26ecc91b9c25261e/bbb97/MainAfter.avif"
            />
          </li>
        </ul>
        <p>
          Every now and then, we need a disclosure component. That is, an
          element that contains additional information, hidden by default, and
          revealed when interacted with. In html there is a native element,
          called <code>details</code>, which is exactly that. So why the need
          for a custom component? The main reason is for animating the
          transition between states. Animating the details tag properly is not
          trivial. The reason being, that <code>details</code> does not render
          its content (except for the summary) until it is opened.
        </p>
        <VideoPlayer
          sources={{
            dark: {
              src: "/design-engineering/details/details-overview-dark.mp4",
              type: "video/mp4",
            },
            light: {
              src: "/design-engineering/details/details-overview-light.mp4",
              type: "video/mp4",
            },
            slow: {
              dark: {
                src: "/design-engineering/details/details-overview-slow-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/design-engineering/details/details-overview-slow-light.mp4",
                type: "video/mp4",
              },
            },
          }}
        />
        <h2 id="common-pitfall">Common pitfall</h2>
        <p>
          For that reason, many implementations avoid using a{" "}
          <code>details</code> tag at all, with the consequence of losing the
          semantic meaning of the element, and browser behavior such as allowing
          the user to search for the content of the details tag and
          automatically opening it if necessary (chromium-based browser,
          hopefully others soon).
        </p>
        <h2 id="demo">Interactive demo</h2>
        <p>
          Play around with these details, you can also set the animation speed
          by using the buttons at the bottom of this card
        </p>
        <div className="card">
          <DetailsComponent
            animationSpeed={slow ? 0.1 : 1}
            defaultOpen={true}
            summary={
              <>
                This is a <code>details</code> component click on this summary
                to expand or collapse it
              </>
            }
          >
            <p>
              This is the content of the details component. It can be any
              content, including images, videos, and other <code>details</code>
              components.
            </p>
            <DetailsComponent
              animationSpeed={slow ? 0.1 : 1}
              summary={
                <>
                  For example, here is a nested <code>details</code>
                </>
              }
            >
              <p>
                And the nested content that goes with it, you can nest as much
                details as you need. If you use Chrome, Edge, Brave, or any
                other chromium-based browser, try closing both details and use
                your browser search feature (<kbd>cmd/ctrl+f</kbd>) and search
                for <code>baNaNa</code>. Both details will open back with your
                search result.
              </p>
              <DetailsComponent
                animationSpeed={slow ? 0.1 : 1}
                summary={
                  <>
                    Here is another nested <code>details</code> within the first
                    nested <code>details</code>
                  </>
                }
              >
                <p>
                  And the nested content that goes with it, you can nest as much
                  details as you need. If you use Chrome, try closing all
                  details and use your browser search feature (
                  <kbd>cmd/ctrl+f</kbd>) and search for <code>baNaNa</code>. All
                  details will open back with your search result.
                </p>
              </DetailsComponent>
            </DetailsComponent>
            <DetailsComponent
              animationSpeed={slow ? 0.1 : 1}
              summary={<>Things to try</>}
              defaultOpen={true}
            >
              <ul>
                <li>Try opening/closing the details</li>
                <li>
                  Try interrupting the animation by clicking the summary a
                  second time
                </li>
                <li>
                  In your browser dev tools, try slowing down the css animation
                  speed
                </li>
              </ul>
            </DetailsComponent>
          </DetailsComponent>
        </div>
        <div style={{ textAlign: "right", marginTop: "0.5em" }}>
          <button
            onClick={() => setSlow(false)}
            data-state={!slow ? "active" : undefined}
          >
            100%
          </button>{" "}
          <button
            onClick={() => setSlow(true)}
            data-state={slow ? "active" : undefined}
          >
            10%
          </button>
        </div>
        <h2 id="requirements">Requirements</h2>
        <h3 id="functional-requirements">Functional requirements</h3>
        <ul>
          <li>
            The component must use a <code>details</code> tag
          </li>
          <li>
            Opening/closing the <code>details</code> should be animated
          </li>
          <li>Animations should be interruptible</li>
          <li>
            When interrupting an animation by toggling the <code>details</code>{" "}
            again, the new animation duration should match with the previous
            animation
          </li>
          <li>
            On browsers supporting it, searching for text that is contained in
            the <code>details</code> tag should open the <code>details</code>
            tag
          </li>
        </ul>
        <h3 id="non-functional-requirements">Non-functional requirements</h3>
        <ul>
          <li>The component should be accessible to screen readers</li>
          <li>The component should be accessible to keyboard users</li>
          <li>The component should be accessible to mouse users</li>
          <li>The component should be accessible to touch users</li>
        </ul>
      </div>
    </>
  )
}

export default ImageAndEmbedsPage
