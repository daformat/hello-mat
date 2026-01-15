import Link from "next/link";
import { ComponentProps } from "react";

import {
  ComponentId,
  getNextComponent,
  getPreviousComponent,
} from "@/constants/design-engineering/components";

import styles from "./NextCard.module.scss";

const NextCard = ({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) => (
  <Link
    className={[styles.next_card, className].filter(Boolean).join(" ")}
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
        {prevComponent.metas.shortTitle}
      </PrevCard>
      <NextCard href={nextComponent.metas.url}>
        {nextComponent.metas.shortTitle}
      </NextCard>
    </div>
  );
};
