import Link from "next/link";

import { ComponentCardList } from "@/components/design-engineering/ComponentCardList";
import { JsonLd } from "@/components/PageMetas/JsonLd";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { Tabs } from "@/components/Tabs/Tabs";
import {
  COMPONENTS,
  COMPONENTS_ORDER,
} from "@/constants/design-engineering/components";
import { GALLERY_PATH, getAbsoluteUrl } from "@/constants/site";

const DesignEngineeringIndex = () => (
  <>
    <PageMetas
      shortTitle="Design engineering gallery"
      title="Design engineering portfolio: React interface components"
      description="Fifteen interface components pulled apart and written up: carousels with real momentum, scroll-driven animations, accessible contrast, and the details that decide how each one feels."
      url={GALLERY_PATH}
      image="https://hello-mat.com/media/hello-mat-light.png"
      imageWidth={1200}
      imageHeight={630}
    />

    {/* The gallery as a list, in the order it is presented, so the articles are
        discoverable as a set rather than fifteen unrelated pages. */}
    <JsonLd
      id="gallery"
      data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Design engineering gallery",
        url: getAbsoluteUrl(GALLERY_PATH),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: COMPONENTS_ORDER.length,
          itemListElement: COMPONENTS_ORDER.map((componentId, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: COMPONENTS[componentId].metas.shortTitle,
            url: getAbsoluteUrl(COMPONENTS[componentId].metas.url),
          })),
        },
      }}
    />
    <div className="page">
      <div className="prose">
        <h1 id="design-engineering">Design engineering portfolio</h1>
        <p>
          Hello! I’m Mat (Mathieu Jouhet). I&nbsp;build interface components for
          the web, and write up how they work: a{" "}
          <Link href={COMPONENTS["carousel-component"].metas.url}>
            carousel that keeps its momentum and rubber-bands at the ends
          </Link>
          , a{" "}
          <Link href={COMPONENTS.details.metas.url}>
            disclosure that animates without giving up the native element
          </Link>
          , a way of{" "}
          <Link href={COMPONENTS["contrast-colors"].metas.url}>
            finding a readable colour by moving its lightness
          </Link>{" "}
          instead of reaching for black or white.
        </p>
        <p>
          They are built with React, TypeScript, and CSS, with performance and
          accessibility treated as part of the design rather than as a pass at
          the end. I&nbsp;have a serious passion for the web platform and obsess
          over details that are often invisible, but never imperceptible. I
          think these&nbsp;make or break a great experience and even if you
          don’t see them, you actually feel&nbsp;them, so most of what I have to
          say here is about those.
        </p>
        <p>
          Some of them are{" "}
          <Link href={`${GALLERY_PATH}/open-source`}>open source</Link> and
          published on npm. If one of them is useful to you, don’t be shy and
          drop a star on{" "}
          <a
            href={"https://github.com/daformat"}
            target="_blank"
            rel="noopener"
          >
            github
          </a>
          !
        </p>
      </div>
      <div style={{ marginTop: "1.5em" }}>
        <Tabs
          defaultValue="all"
          tabs={[
            {
              id: "all",
              trigger: "All",
              content: <ComponentCardList style={{ marginTop: "1.5em" }} />,
            },
            {
              id: "oss",
              trigger: "Open source",
              content: (
                <ComponentCardList
                  onlyOpenSource
                  style={{ marginTop: "1.5em" }}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  </>
);

export default DesignEngineeringIndex;
