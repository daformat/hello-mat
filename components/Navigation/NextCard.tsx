import Link from "next/link";
import { ComponentProps } from "react";

import styles from "./NextCard.module.scss";

export const NextCard = ({
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
