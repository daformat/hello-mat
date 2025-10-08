import Head from "next/head"

export type PageMetasBaseProps = {
  title: string
  description: string
  url: string
}

export type PageMetasImageProps =
  | {
      image: string
    }
  | {
      image?: never
    }

export type PageMetasVideoProps =
  | {
      video: string
      videoType: string
      videoWidth: string
      videoHeight: string
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
  video,
  videoType,
  videoWidth,
  videoHeight,
}: PageMetasProps) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="og:title" content={title} />
      <meta name="og:description" content={description} />
      <meta name="og:url" content={url} />
      {image ? <meta name="og:image" content={image} /> : null}
      {video ? (
        <>
          <meta
            name="og:video"
            content="https://hello-mat.com/design-engineering/toc/toc-overview-light.mp4"
          />
          <meta property="og:video:type" content={videoType} />
          <meta property="og:video:width" content={videoWidth} />
          <meta property="og:video:height" content={videoHeight} />
        </>
      ) : null}
      {image ? (
        <>
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:image" content={image} />
        </>
      ) : null}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Head>
  )
}
