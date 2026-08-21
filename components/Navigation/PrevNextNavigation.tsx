import Link from "next/link";
import { ComponentProps } from "react";

import { ComponentCardList } from "@/components/design-engineering/ComponentCardList";
import {
  ComponentId,
  getNextComponent,
  getPreviousComponent,
  getRelatedComponents,
} from "@/constants/design-engineering/components";

import styles from "./NextCard.module.scss";
import relatedStyles from "./RelatedLinks.module.scss";

const NextCard = ({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) => (
  <Link
    className={[styles.next_card, styles.next, className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    <span className={styles.text}>
      <h3 data-no-toc>Up next</h3>
      <span>{children}</span>
    </span>
    <span className={styles.arrow}>--&gt;</span>
  </Link>
);

const PrevCard = ({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) => (
  <Link
    className={[styles.next_card, styles.prev, className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  >
    <span className={styles.arrow}>&lt;--</span>
    <span className={styles.text}>
      <h3 data-no-toc>Right before</h3>
      <span>{children}</span>
    </span>
  </Link>
);

export const PrevNextNavigation = ({
  currentComponentId,
}: {
  currentComponentId: ComponentId;
}) => {
  const nextComponent = getNextComponent(currentComponentId);
  const prevComponent = getPreviousComponent(currentComponentId);

  return (
    <>
      <RelatedLinks currentComponentId={currentComponentId} />
      <div
        style={{
          display: "flex",
          gap: 24,
          width: "100%",
          flexWrap: "wrap",
          marginTop: "2em",
        }}
      >
        <NextCard href={nextComponent.metas.url}>
          {nextComponent.metas.shortTitle}
        </NextCard>
        <PrevCard href={prevComponent.metas.url}>
          {prevComponent.metas.shortTitle}
        </PrevCard>
      </div>
    </>
  );
};

/**
 * Sideways links, for readers who came for one problem and have the next one
 * already. Previous and next only follow the order things were written in,
 * which is rarely the order anybody needs them in.
 */
const RelatedLinks = ({
  currentComponentId,
}: {
  currentComponentId: ComponentId;
}) => {
  const related = getRelatedComponents(currentComponentId);

  if (!related.length) {
    return null;
  }

  return (
    <aside className={relatedStyles.related}>
      <h2 className={relatedStyles.heading} data-no-toc>
        While you’re here
      </h2>
      <ComponentCardList
        componentIds={related.map(({ id }) => id)}
        label="full"
        threeUp
      />
    </aside>
  );
};
