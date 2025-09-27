import { TableOfContents } from "components/TableOfContents/TocComponent"
import Head from "next/head"
import { useEffect, useRef, useState } from "react"
import { DetailsComponent } from "../../../components/Details/DetailsComponent"
import { VideoPlayer } from "../../../components/VideoPlayer/VideoPlayer"

const DetailsDisclosureComponent = () => (
  <>
    <Head>
      <title>Design engineering: a details (or disclosure) component</title>
      <meta
        name="description"
        content="Building a details (disclosure) component, using React, TypeScript, and SCSS."
      />
    </Head>
    <TableOfContents.Provider>
      <DetailsPageContent />
    </TableOfContents.Provider>
  </>
)

const DetailsPageContent = () => {
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
          Design engineering: a details (or disclosure) component
        </h1>
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
          style={{ aspectRatio: "990/500" }}
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
            className="button"
            onClick={() => setSlow(false)}
            data-state={!slow ? "active" : undefined}
          >
            100%
          </button>{" "}
          <button
            className="button"
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

export default DetailsDisclosureComponent
