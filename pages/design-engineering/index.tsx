import Link from "next/link";

import styles from "/styles/DesignEngineeringGallery.module.scss";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer";
import {
  COMPONENTS,
  COMPONENTS_ORDER,
} from "@/constants/design-engineering/components";

const DesignEngineeringIndex = () => (
  <>
    <PageMetas
      title="Hello Mat - Design engineering portfolio"
      description="Design engineering portfolio of Mathieu Jouhet, explore real components, explorations, and more"
      url="https://hello-mat.com/design-engineering"
      image="https://hello-mat.com/media/hello-mat-light.png"
      imageWidth={1200}
      imageHeight={630}
    />
    <div className="page">
      <div className="prose">
        <h1 id="design-engineering">Design engineering portfolio</h1>
        <p>
          Hello! I’m Mat (Mathieu Jouhet) and this my design engineering
          portfolio. I&nbsp;have a serious passion for the web platform, care
          deeply about craft, design, UX, and obsess over details that are often
          invisible, but never imperceptible. I&nbsp;think these&nbsp;make or
          break a great experience and even if you don’t see them, you actually
          feel&nbsp;them.
        </p>
        <p>
          These are either real components, used in production, or it can also
          be explorations. This list is a constant work in progress and is far
          from exhaustive. Each component is designed with performance,
          accessibility, and best practices in mind. Attention to details is
          paramount and you can play accompanying videos at 10% speed, or use
          the slow down controls when present to slow the live component itself.
          This will also slow down network requests, if any, so that loading
          states are shown longer
        </p>
      </div>
      <div className={styles.card_list} style={{ marginTop: "1.5em" }}>
        {COMPONENTS_ORDER.map((componentId) => {
          const component = COMPONENTS[componentId];
          return (
            <Link
              key={componentId}
              href={component.metas.url}
              className={styles.card}
            >
              <VideoPlayer
                style={{ aspectRatio: "990/500" }}
                sources={component.video}
              />
              {component.shortTitle}
            </Link>
          );
        })}
      </div>
    </div>
  </>
);

export default DesignEngineeringIndex;
