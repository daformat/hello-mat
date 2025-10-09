import { NextSeo } from "next-seo"
import { OpenGraph } from "next-seo/lib/types"

export type PageMetasBaseProps = {
  title: string
  description: string
  url: string
}

export type PageMetasImageProps =
  | {
      image: string
      imageWidth: number
      imageHeight: number
    }
  | {
      image: string
      imageWidth?: never
      imageHeight?: never
    }

export type PageMetasVideoProps =
  | {
      video: string
      videoType: string
      videoWidth: number
      videoHeight: number
    }
  | {
      video?: never
      videoType?: never
      videoWidth?: never
      videoHeight?: never
    }

export type PageMetasProps = PageMetasBaseProps &
  PageMetasImageProps &
  PageMetasVideoProps

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
    images: [{ url: image, height: imageHeight, width: imageWidth }],
  }
  if (video) {
    openGraph.videos = [
      { url: video, type: videoType, width: videoWidth, height: videoHeight },
    ]
  }
  return (
    <NextSeo
      title={title}
      description={description}
      canonical={url}
      openGraph={openGraph}
      twitter={{ handle: "@daformat", cardType: "summary_large_image" }}
    />
  )
}
