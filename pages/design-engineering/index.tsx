import Link from "next/link"
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer"
import { PageMetas } from "@/components/PageMetas/PageMetas"

import styles from "/styles/DesignEngineeringGallery.module.scss"

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
          portfolio. I have a serious passion for the web platform, care deeply
          about craft, design, UX, and obsess over details that are often
          invisible, but never imperceptible. These&nbsp;make or break a great
          experience and even if you don’t see them, you actually feel them.
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
        <Link
          href={"/design-engineering/component/table-of-contents"}
          className={styles.card}
        >
          <VideoPlayer
            style={{ aspectRatio: "990/500" }}
            sources={{
              dark: {
                src: "/media/design-engineering/toc/toc-overview-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/media/design-engineering/toc/toc-overview-light.mp4",
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
                src: "/media/design-engineering/details/details-overview-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/media/design-engineering/details/details-overview-light.mp4",
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
                src: "/media/design-engineering/images-and-embeds/images-and-embeds-overview-slow-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/media/design-engineering/images-and-embeds/images-and-embeds-overview-slow-light.mp4",
                type: "video/mp4",
              },
            }}
          />
          Images and embeds
        </Link>

        <Link
          href={"/design-engineering/component/collapsible-toolbar"}
          className={styles.card}
        >
          <VideoPlayer
            style={{ aspectRatio: "990/500" }}
            sources={{
              dark: {
                src: "/media/design-engineering/collapsible-toolbar/collapsible-toolbar-overview-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/media/design-engineering/collapsible-toolbar/collapsible-toolbar-overview-light.mp4",
                type: "video/mp4",
              },
            }}
          />
          A collapsible toolbar
        </Link>

        <Link
          href={"/design-engineering/component/publish-button"}
          className={styles.card}
        >
          <VideoPlayer
            style={{ aspectRatio: "990/500" }}
            sources={{
              dark: {
                src: "/media/design-engineering/publish-button/publish-button-overview-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/media/design-engineering/publish-button/publish-button-overview-light.mp4",
                type: "video/mp4",
              },
            }}
          />
          A publish button
        </Link>

        <Link
          href={"/design-engineering/component/dock-component"}
          className={styles.card}
        >
          <VideoPlayer
            style={{ aspectRatio: "990/500" }}
            sources={{
              dark: {
                src: "/media/design-engineering/dock/dock-overview-dark.mp4",
                type: "video/mp4",
              },
              light: {
                src: "/media/design-engineering/dock/dock-overview-light.mp4",
                type: "video/mp4",
              },
            }}
          />
          A macOS inspired dock
        </Link>
      </div>
    </div>
  </>
)

export default DesignEngineeringIndex
