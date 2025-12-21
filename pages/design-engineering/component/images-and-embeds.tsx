import { TableOfContents } from "components/TableOfContents/TocComponent";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { EmbedComp, ImageComp } from "@/components/Media/MediaComponent";
import { NextCard } from "@/components/Navigation/NextCard";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer";
import {
  COMPONENTS,
  getNextComponent,
} from "@/constants/design-engineering/components";

const ImageAndEmbedsPage = () => {
  const component = COMPONENTS["images-and-embeds"];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <ImageAndEmbedsContent />
      </TableOfContents.Provider>
    </>
  );
};

const ImageAndEmbedsContent = () => {
  const nextComponent = getNextComponent("images-and-embeds");
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
          Design engineering: images and embeds
        </h1>
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
              source="https://letsenhance.io/static/8f5e523ee6b2479e26ecc91b9c25261e/bbb97/MainAfter.avif"
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
        <h2>Video overview</h2>
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
        <NextCard href={nextComponent.metas.url}>
          {nextComponent.shortTitle}
        </NextCard>
      </div>
    </>
  );
};

export default ImageAndEmbedsPage;
