import { JsonLd, toIsoDuration } from "@/components/PageMetas/JsonLd";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import {
  Component,
  ComponentId,
  COMPONENTS,
} from "@/constants/design-engineering/components";
import {
  AUTHOR_NAME,
  AUTHOR_PROFILES,
  getAbsoluteUrl,
  SITE_NAME,
  SITE_URL,
} from "@/constants/site";

/**
 * Everything a gallery article says about itself, derived from its entry in
 * COMPONENTS: the meta tags, the article itself, the overview video, and, when
 * the component is published, the package it comes from.
 */
export const ComponentPageMetas = ({
  componentId,
}: {
  componentId: ComponentId;
}) => {
  // Widened to Component on purpose: COMPONENTS is `as const`, so the union of
  // literal entries has no `repo` on the members that lack one.
  const component: Component = COMPONENTS[componentId];
  const { metas, poster, video, videoDuration, repo } = component;
  const url = getAbsoluteUrl(metas.url);

  const author = {
    "@type": "Person",
    name: AUTHOR_NAME,
    url: SITE_URL,
    sameAs: AUTHOR_PROFILES,
  };

  return (
    <>
      <PageMetas {...metas} />

      <JsonLd
        id={`article-${componentId}`}
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "@id": `${url}#article`,
          mainEntityOfPage: url,
          url,
          headline: metas.title,
          description: metas.description,
          image: [getAbsoluteUrl(metas.image)],
          datePublished: metas.datePublished,
          dateModified: metas.dateModified ?? metas.datePublished,
          inLanguage: "en",
          isAccessibleForFree: true,
          author,
          publisher: { ...author, name: SITE_NAME },
          proficiencyLevel: "Expert",
        }}
      />

      <JsonLd
        id={`video-${componentId}`}
        data={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: metas.title,
          description: metas.description,
          // The social card first, since it is the 1200x630 Google asks for,
          // then the video's own first frame.
          thumbnailUrl: [
            getAbsoluteUrl(metas.image),
            getAbsoluteUrl(poster.light),
          ],
          uploadDate: metas.datePublished,
          duration: toIsoDuration(videoDuration),
          contentUrl: getAbsoluteUrl(video.light.src),
          embedUrl: url,
          encodingFormat: video.light.type,
          isFamilyFriendly: true,
          creator: author,
        }}
      />

      {repo && (
        <JsonLd
          id={`source-${componentId}`}
          data={{
            "@context": "https://schema.org",
            "@type": "SoftwareSourceCode",
            name: metas.shortTitle,
            description: metas.description,
            codeRepository: repo,
            programmingLanguage: "TypeScript",
            runtimePlatform: "React",
            url,
            author,
          }}
        />
      )}
    </>
  );
};
