import Link from "next/link"
import { VideoPlayer } from "../../components/VideoPlayer/VideoPlayer"

import styles from "/styles/DesignEngineeringGallery.module.scss"

const DesignEngineeringIndex = () => (
  <>
    <div className="page">
      <div className="prose">
        <h1 id="design-engineering">Design engineering portfolio</h1>
        <p>
          These are either real components, used in production, or it can also
          be explorations. This list is a constant work in progress and is far
          from exhaustive. Each component is designed with performance,
          accessibility, and best practices in mind. Attention to details is
          paramount and you can play accompanying videos at 10% speed, or use
          the slow down controls when present to slow the live component itself.
          This will also slow down network requests if any so that loading
          states are shown longer
        </p>
      </div>
      <div className={styles.card_list}>
        <Link
          href={"/design-engineering/component/table-of-contents"}
          className={styles.card}
        >
          <VideoPlayer
            style={{ aspectRatio: "990/500" }}
            sources={{
              dark: {
                src: "/design-engineering/toc/toc-overview-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/design-engineering/toc/toc-overview-light.mp4",
                type: "video/mp4",
              },
            }}
          />
          A Table of content component
        </Link>
        <Link
          href={"/design-engineering/component/details-disclosure-component"}
          className={styles.card}
        >
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
            }}
          />
          A details (or disclosure) component
        </Link>
        <Link
          href={"/design-engineering/component/images-and-embeds"}
          className={styles.card}
        >
          <VideoPlayer
            style={{ aspectRatio: "990/500" }}
            sources={{
              dark: {
                src: "/design-engineering/images-and-embeds/images-and-embeds-overview-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/design-engineering/images-and-embeds/images-and-embeds-overview-light.mp4",
                type: "video/mp4",
              },
            }}
          />
          Images and embeds
        </Link>
      </div>
    </div>
  </>
)

export default DesignEngineeringIndex
