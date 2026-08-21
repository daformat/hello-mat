import {
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";

import styles from "./ArticleDates.module.scss";

// Fixed locale and time zone: the server and the browser have to agree, and a
// date written down as 2025-09-14 is a day, not a moment.
const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const format = (isoDate: string) =>
  formatter.format(new Date(`${isoDate}T00:00:00Z`));

/**
 * When the piece was written, and when it last changed. Technical writing goes
 * stale, and saying so is more useful than letting a reader guess.
 */
export const ArticleDates = ({ componentId }: { componentId: ComponentId }) => {
  const { datePublished, dateModified } = COMPONENTS[componentId].metas;

  if (!datePublished) {
    return null;
  }

  const wasUpdated = Boolean(dateModified && dateModified !== datePublished);

  return (
    <p className={`article_dates ${styles.dates}`}>
      <time dateTime={datePublished}>{format(datePublished)}</time>
      {wasUpdated && dateModified ? (
        <>
          <span aria-hidden="true">·</span>
          <span>
            updated <time dateTime={dateModified}>{format(dateModified)}</time>
          </span>
        </>
      ) : null}
    </p>
  );
};
