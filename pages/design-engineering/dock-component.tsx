import { TableOfContents } from "components/TableOfContents/TocComponent";
import Link from "next/link";
import { useEffect, useRef } from "react";

import {
  BeamIcon,
  BeamIconBeta,
  BeamIconDev,
  BeamIconNightly,
} from "@/components/Dock/BeamIcon";
import { Dock, DockItem } from "@/components/Dock/Dock";
import { ArticleDates } from "@/components/Navigation/ArticleDates";
import { PrevNextNavigation } from "@/components/Navigation/PrevNextNavigation";
import { ComponentPageMetas } from "@/components/PageMetas/ComponentPageMetas";
import { ComponentId } from "@/constants/design-engineering/components";

const componentId: ComponentId = "dock-component";

const DockComponentPage = () => {
  return (
    <>
      <ComponentPageMetas componentId={componentId} />
      <TableOfContents.Provider>
        <DockComponentPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const DockComponentPageContent = () => {
  const tocContext = TableOfContents.useToc();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      tocContext.setRootElement(contentRef.current);
    }
  });

  return (
    <>
      <TableOfContents.Root />
      <div ref={contentRef} className="prose page">
        <Link href="/design-engineering" className="back_link">
          Back to gallery
        </Link>
        <h1 id="design-engineering-a-dock-component">
          A macOS style dock, keyboard included
        </h1>
        <ArticleDates componentId={componentId} />
        <p>
          A macOS inspired dock component. Icons are from{" "}
          <a href="https://beamapp.co" target="_blank" rel="noopener">
            beam
          </a>
          , a browser with a first-class note taking experience. This is an
          exploration made for fun. The dock is accessible to mouse and keyboard
          users, try alternating between mouse and keyboard to see the
          difference. This is a desktop-only component (for now).
        </p>
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
          <Dock>
            <DockItem icon={<BeamIcon />} name="beam" />
            <DockItem icon={<BeamIconBeta />} name="beam beta" />
            <DockItem icon={<BeamIconDev />} name="beam dev" />
            <DockItem icon={<BeamIconNightly />} name="beam nightly" />
            <DockItem icon={<BeamIcon />} name="beam" />
            <DockItem icon={<BeamIconBeta />} name="beam beta" />
          </Dock>
        </div>
        <h2 id="the-magnification-curve">The magnification curve</h2>
        <p>
          Every icon measures how far the pointer is from it and scales between
          a minimum and a maximum, which is the obvious part. The part that
          decides whether it feels right is what counts as{" "}
          <strong>zero distance</strong>. If you measure to the centre of the
          icon, the icon reaches full size at exactly one pixel and starts
          shrinking again the moment you move past it, which reads as nervous.
        </p>
        <p>
          So there is a dead zone. Distance is measured to the edges of a band
          across the middle of each icon rather than to its centre, and anywhere
          inside that band the distance is zero. The icon under the pointer
          stays at full size while you cross it, and only starts falling away
          once you have actually left. The falloff itself is linear, over a
          radius derived from the icon sizes rather than a fixed number of
          pixels, so the whole thing keeps its proportions if the dock is
          rendered at another size.
        </p>
        <h2 id="the-keyboard-is-a-different-curve">
          The keyboard is a different curve
        </h2>
        <p>
          A pointer has a position and a keyboard does not, so reusing the same
          maths for focus would mean inventing a fake cursor somewhere. Instead
          the component tracks whether the last interaction came from the
          pointer or from the keyboard, and when it came from the keyboard the
          scale is driven by <strong>distance in the list</strong> rather than
          distance on screen: the focused icon is the peak, its neighbours fall
          off by how many positions away they are.
        </p>
        <p>
          The two modes have to be kept apart, or moving the mouse a pixel while
          tabbing would yank the magnification away from the icon you just
          focused. There is a guard for exactly that, which is why alternating
          between mouse and keyboard in the demo above is worth trying: the
          shape of the bump is the same, and what it is following is not.
        </p>
        <PrevNextNavigation currentComponentId={componentId} />
      </div>
    </>
  );
};

export default DockComponentPage;
