import { TableOfContents } from "components/TableOfContents/TocComponent";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { EmbedComp, ImageComp } from "@/components/Media/MediaComponent";
import { ArticleDates } from "@/components/Navigation/ArticleDates";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { ComponentPageMetas } from "@/components/PageMetas/ComponentPageMetas";
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer";
import { ComponentId } from "@/constants/design-engineering/components";

const componentId: ComponentId = "images-and-embeds";

const ImageAndEmbedsPage = () => {
  return (
    <>
      <ComponentPageMetas componentId={componentId} />
      <TableOfContents.Provider>
        <ImageAndEmbedsContent />
      </TableOfContents.Provider>
    </>
  );
};

const ImageAndEmbedsContent = () => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);
  const [render, setRender] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  useLayoutEffect(() => {
    const buttons = contentRef.current?.querySelectorAll(
      "button.auto_resize"
    ) as NodeListOf<HTMLButtonElement>;
    if (buttons) {
      buttons.forEach((button) => {
        const oldWidth = button.style.getPropertyValue("--button-width");
        button.style.width = "auto";
        const width = button.offsetWidth;
        if (oldWidth) {
          button.style.width = "var(--button-width, auto)";
          button.style.setProperty("--button-width", oldWidth);
        }
        setTimeout(() =>
          button.style.setProperty("--button-width", `${width}px`)
        );
      });
    }
  }, [slow]);

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-an-image-and-embed-component">
          A media component for images, video and embeds
        </h1>
        <ArticleDates componentId={componentId} />
        <p>
          More often than not, web pages contain images and embeds. What should
          these components do? These ones were designed at{" "}
          <a href="https://beamapp.co" target="_blank" rel="noopener">
            beam
          </a>
          , a browser with a first-class note taking experience, and support for
          images and embeds.
        </p>
        <ul key={render}>
          <li>
            <EmbedComp
              open={false}
              title="Lubomyr Melnyk - Barcarolle"
              source="https://www.youtube.com/watch?v=KOJkst2Odfs"
              speed={slow ? 0.1 : 1}
            />
          </li>
          {/*<li>*/}
          {/*  <EmbedComp*/}
          {/*    open={false}*/}
          {/*    title="Antlers in the Mist"*/}
          {/*    source="https://www.flickr.com/photos/124051802@N04/45745445165/in/pool-best100only/"*/}
          {/*    speed={slow ? 0.1 : 1}*/}
          {/*  />*/}
          {/*</li>*/}
          {/*<li>*/}
          {/*  <EmbedComp*/}
          {/*    open={false}*/}
          {/*    title="Volta - Boogie Belgique"*/}
          {/*    source="https://open.spotify.com/track/6S4hDG6meUTOBUemVHelrx?si=31db165395a747e2"*/}
          {/*    speed={slow ? 0.1 : 1}*/}
          {/*  />*/}
          {/*</li>*/}
          <li>
            <EmbedComp
              open={false}
              title="Magnifique - Ratatat"
              source="https://open.spotify.com/album/7ox0VtOfJBl7Oz3BRGOg1G"
              speed={slow ? 0.1 : 1}
            />
          </li>
          {/*<li>*/}
          {/*  <EmbedComp*/}
          {/*    open={false}*/}
          {/*    source="https://x.com/daformat/status/1377323694264029185"*/}
          {/*    speed={slow ? 0.1 : 1}*/}
          {/*  />*/}
          {/*</li>*/}
          <li>
            <ImageComp
              title="A colorful chameleon"
              source="/MainAfter.avif"
              speed={slow ? 0.1 : 1}
            />
          </li>
        </ul>
        <div style={{ textAlign: "right", marginTop: "0.5em" }}>
          <button
            onClick={() => setRender((render) => render + 1)}
            className="button auto_resize"
          >
            Reload
            {slow ? (
              <small> (10% network slowdown)</small>
            ) : (
              <small> (normal network)</small>
            )}
          </button>
          <br className="small_screen_only" />
          <button
            className="button"
            onClick={() => setSlow(false)}
            data-state={!slow ? "active" : undefined}
            aria-pressed={!slow ? "true" : "false"}
            title="Set normal animation speed"
          >
            100%
          </button>{" "}
          <button
            className="button"
            onClick={() => setSlow(true)}
            data-state={slow ? "active" : undefined}
            aria-pressed={slow ? "true" : "false"}
            title="Set slow animation speed"
          >
            10%
          </button>
        </div>
        <h2 id="functional-requirements">Functional requirements</h2>
        <ul>
          <li>The component should support images and embeds</li>
          <li>
            The component should display a loading state until the media has
            been loaded
          </li>
          <li>
            The component should support passing predetermined dimensions to
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
        <h2 id="non-functional-requirements">Non-functional requirements</h2>
        <ul>
          <li>The component should be accessible to screen readers</li>
          <li>The component should be accessible to keyboard users</li>
          <li>The component should be accessible to mouse users</li>
          <li>The component should be accessible to touch users</li>
          <li>The component should honor prefers-reduced-motion</li>
          <li>Animations should be interruptible</li>
        </ul>
        <h2 id="the-loading-state">The loading state nobody sees</h2>
        <p>
          Loading states are the part of a media component you are least likely
          to get right, because you build them on a fast connection with a warm
          cache and they flash past before you can look at them. So this one
          holds. The component records how long the media actually took, and
          then keeps the loading state up for at least three seconds, which
          means the state you designed is a state you have watched.
        </p>
        <p>
          It matters because the loading state is doing real work here. An embed
          has no dimensions until its provider answers, so if you let the layout
          settle first and correct it afterwards, everything below the media
          jumps. Passing known dimensions avoids that entirely, and where they
          are not known, the placeholder holds the space in the right proportion
          until the real thing arrives.
        </p>
        <h2 id="collapsing-to-a-real-height">Collapsing to a real height</h2>
        <p>
          Collapsing is the other half. You cannot animate to <code>auto</code>,
          and picking a number means picking wrong for every embed that is not
          the one you tested with. A <code>ResizeObserver</code> watches the
          collapsed content and writes its measured height into a custom
          property, so the animation always runs to a height that exists, and it
          stays correct when the container is resized underneath it.
        </p>
        <h2 id="video-overview">Video overview</h2>
        <VideoPlayer
          style={{ aspectRatio: "990/500" }}
          sources={{
            dark: {
              src: "/media/design-engineering/images-and-embeds/images-and-embeds-overview-dark.mp4",
              type: "video/mp4",
            },
            light: {
              src: "/media/design-engineering/images-and-embeds/images-and-embeds-overview-light.mp4",
              type: "video/mp4",
            },
            slow: {
              dark: {
                src: "/media/design-engineering/images-and-embeds/images-and-embeds-overview-slow-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/media/design-engineering/images-and-embeds/images-and-embeds-overview-slow-light.mp4",
                type: "video/mp4",
              },
            },
          }}
        />
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default ImageAndEmbedsPage;
