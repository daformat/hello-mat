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
import { NextCard, PrevCard } from "@/components/Navigation/NextCard";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import {
  COMPONENTS,
  getNextComponent,
  getPreviousComponent,
} from "@/constants/design-engineering/components";

const DockComponentPage = () => {
  const component = COMPONENTS["dock-component"];
  return (
    <>
      <PageMetas {...component.metas} />
      <TableOfContents.Provider>
        <DockComponentPageContent />
      </TableOfContents.Provider>
    </>
  );
};

const DockComponentPageContent = () => {
  const nextComponent = getNextComponent("dock-component");
  const prevComponent = getPreviousComponent("dock-component");
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
          Design engineering: a dock component
        </h1>
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
        <div
          style={{
            display: "flex",
            gap: 24,
            width: "100%",
            flexWrap: "wrap",
            marginTop: "2em",
          }}
        >
          <PrevCard href={prevComponent.metas.url}>
            {prevComponent.shortTitle}
          </PrevCard>
          <NextCard href={nextComponent.metas.url}>
            {nextComponent.shortTitle}
          </NextCard>
        </div>
      </div>
    </>
  );
};

export default DockComponentPage;
