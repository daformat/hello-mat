import { NextSeo } from "next-seo";
import { OpenGraph } from "next-seo/lib/types";

export type PageMetasBaseProps = {
  title: string;
  description: string;
  url: string;
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
  description,
  url,
  image,
  imageHeight,
  imageWidth,
  video,
  videoType,
  videoWidth,
  videoHeight,
}: PageMetasProps) => {
  const openGraph: OpenGraph = {
    url,
    title,
    description,
    images: [
      {
        url: getAbsoluteUrl(image),
        height: imageHeight,
        width: imageWidth,
        secureUrl: getAbsoluteUrl(image),
      },
    ],
  };
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
    <NextSeo
      title={title}
      description={description}
      canonical={getAbsoluteUrl(url)}
      openGraph={openGraph}
      twitter={{ handle: "@daformat", cardType: "summary_large_image" }}
    />
  );
};

const getAbsoluteUrl = (url: string) => {
  const base = "https://hello-mat.com";
  if (!url.startsWith("http")) {
    return `${base}${url}`;
  }
  return url;
};
