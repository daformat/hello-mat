import { BreadcrumbJsonLd, NextSeo } from "next-seo";
import { OpenGraph } from "next-seo/lib/types";

import {
  AUTHOR_NAME,
  AUTHOR_TWITTER,
  GALLERY_PATH,
  getAbsoluteUrl,
  isGalleryArticle,
  SITE_NAME,
} from "@/constants/site";

export type PageMetasBaseProps = {
  title: string;
  shortTitle: string;
  description: string;
  url: string;
  /** ISO date, articles only. Omitted on the homepage and the gallery index. */
  datePublished?: string;
  dateModified?: string;
};

export type PageMetasImageProps =
  | {
      image: string;
      imageWidth: number;
      imageHeight: number;
    }
  | {
      image: string;
      imageWidth?: never;
      imageHeight?: never;
    };

export type PageMetasVideoProps =
  | {
      video: string;
      videoType: string;
      videoWidth: number;
      videoHeight: number;
    }
  | {
      video?: never;
      videoType?: never;
      videoWidth?: never;
      videoHeight?: never;
    };

export type PageMetasProps = PageMetasBaseProps &
  PageMetasImageProps &
  PageMetasVideoProps;

export const PageMetas = ({
  title,
  shortTitle,
  description,
  url,
  image,
  imageHeight,
  imageWidth,
  video,
  videoType,
  videoWidth,
  videoHeight,
  datePublished,
  dateModified,
}: PageMetasProps) => {
  // The gallery index and the homepage are their own thing. Everything under
  // /design-engineering/ is an article, and gets the suffix, the article
  // metadata, and the breadcrumb that says where it sits.
  const isArticle = isGalleryArticle(url);
  const fullTitle = isArticle ? `${title} · ${SITE_NAME}` : title;

  const openGraph: OpenGraph = {
    url: getAbsoluteUrl(url),
    title: fullTitle,
    description,
    type: isArticle ? "article" : "website",
    images: [
      {
        url: getAbsoluteUrl(image),
        height: imageHeight,
        width: imageWidth,
        secureUrl: getAbsoluteUrl(image),
      },
    ],
  };

  if (isArticle && datePublished) {
    openGraph.article = {
      publishedTime: datePublished,
      modifiedTime: dateModified ?? datePublished,
      authors: [AUTHOR_NAME],
    };
  }

  if (video) {
    openGraph.videos = [
      {
        url: getAbsoluteUrl(video),
        type: videoType,
        width: videoWidth,
        height: videoHeight,
      },
    ];
  }

  return (
    <>
      <NextSeo
        title={fullTitle}
        description={description}
        canonical={getAbsoluteUrl(url)}
        openGraph={openGraph}
        twitter={{ handle: AUTHOR_TWITTER, cardType: "summary_large_image" }}
      />
      {isArticle && (
        <BreadcrumbJsonLd
          itemListElements={[
            {
              position: 1,
              name: "Design engineering gallery",
              item: getAbsoluteUrl(GALLERY_PATH),
            },
            {
              position: 2,
              name: shortTitle,
              item: getAbsoluteUrl(url),
            },
          ]}
        />
      )}
    </>
  );
};
