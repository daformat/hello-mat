import Link from "next/link";

import styles from "/styles/DesignEngineeringGallery.module.scss";
import { VideoPlayer } from "@/components/VideoPlayer/VideoPlayer";
import {
  ComponentId,
  COMPONENTS,
  COMPONENTS_ORDER,
} from "@/constants/design-engineering/components";

/**
 * The gallery grid, also used for the related links at the foot of an article.
 * Videos hold back until the card is on screen, so opening a page with a grid
 * on it no longer asks the browser about thirty-odd files at once.
 */
export const ComponentCardList = ({
  componentIds = COMPONENTS_ORDER,
  onlyOpenSource = false,
  /** The card label: the short name in the gallery, the full one elsewhere. */
  label = "short",
  threeUp = false,
  style,
}: {
  componentIds?: readonly ComponentId[];
  onlyOpenSource?: boolean;
  label?: "short" | "full";
  threeUp?: boolean;
  style?: React.CSSProperties;
}) => (
  <div
    className={[styles.card_list, threeUp && styles.three_up]
      .filter(Boolean)
      .join(" ")}
    style={style}
  >
    {componentIds.map((componentId) => {
      const component = COMPONENTS[componentId];
      if (onlyOpenSource && !component.oss) {
        return null;
      }
      return (
        <Link
          key={componentId}
          href={component.metas.url}
          className={styles.card}
        >
          <VideoPlayer
            style={{ aspectRatio: "990/500" }}
            sources={component.video}
            poster={component.poster}
            preload="none"
            autoPlaysOnHover
          />
          {label === "full"
            ? component.metas.title
            : component.metas.shortTitle}
        </Link>
      );
    })}
  </div>
);
