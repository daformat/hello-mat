import Link from "next/link";

import { ComponentCardList } from "@/components/design-engineering/ComponentCardList";
import { JsonLd } from "@/components/PageMetas/JsonLd";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import {
  COMPONENTS,
  COMPONENTS_ORDER,
} from "@/constants/design-engineering/components";
import { GALLERY_PATH, getAbsoluteUrl } from "@/constants/site";

const URL = `${GALLERY_PATH}/open-source`;

const openSourceComponents = COMPONENTS_ORDER.filter(
  (componentId) => COMPONENTS[componentId].oss
);

const OpenSourceIndex = () => (
  <>
    <PageMetas
      shortTitle="Open source components"
      title="Open source React components you can install"
      description="The work from the gallery that is published on npm: a headless carousel, a swipeable card stack, an animated number input, a split-flap display, and a contrast colour function. Zero dependencies, TypeScript throughout."
      url={URL}
      image="https://hello-mat.com/media/hello-mat-light.png"
      imageWidth={1200}
      imageHeight={630}
    />

    <JsonLd
      id="open-source"
      data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Open source React components",
        url: getAbsoluteUrl(URL),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: openSourceComponents.length,
          itemListElement: openSourceComponents.map((componentId, index) => ({
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
        <Link href={GALLERY_PATH} className="back_link">
          Back to gallery
        </Link>
        <h1 id="open-source">Open source components</h1>
        <p>
          Some of the work in the gallery is published, so you can install it
          rather than read about it and rebuild it yourself. Each one has a
          write-up here explaining how it works and what was difficult about it.
        </p>
        <p>
          None of them has a runtime dependency: the React ones take React as a
          peer and nothing else. A carousel should not cost you a dependency
          tree, and I would rather write the maths than inherit somebody else’s.
          The code lives on{" "}
          <a href="https://github.com/daformat" target="_blank" rel="noopener">
            github
          </a>
          , and stars are always welcome.
        </p>
      </div>
      <ComponentCardList onlyOpenSource style={{ marginTop: "1.5em" }} />
    </div>
  </>
);

export default OpenSourceIndex;
