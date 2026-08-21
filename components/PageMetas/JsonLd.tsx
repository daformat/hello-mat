import Head from "next/head";

/**
 * A plain JSON-LD block. next-seo covers the common schema types, but not
 * TechArticle, VideoObject, or SoftwareSourceCode with the fields we care
 * about, so those are written out by hand.
 */
export const JsonLd = ({
  id,
  data,
}: {
  id: string;
  data: Record<string, unknown>;
}) => (
  <Head>
    <script
      key={`jsonld-${id}`}
      type="application/ld+json"
      // The payload is built from our own constants, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  </Head>
);

/** Seconds to the ISO 8601 duration schema.org expects, e.g. 9.367 -> PT9S. */
export const toIsoDuration = (seconds: number) => {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `PT${minutes ? `${minutes}M` : ""}${remainder}S`;
};
