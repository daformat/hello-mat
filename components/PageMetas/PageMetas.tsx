import Head from "next/head"

export type PageMetasBaseProps = {
  title: string
  description: string
  url: string
}

export type PageMetasImageProps =
  | {
      image: string
      imageWidth: string
      imageHeight: string
    }
  | {
      image: string
      imageWidth?: never
      imageHeight?: never
    }
  | {
      image?: never
      imageWidth?: never
      imageHeight?: never
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
  // imageHeight,
  // imageWidth,
  video,
  videoType,
  videoWidth,
  videoHeight,
}: PageMetasProps) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {image ? (
        <>
          <meta property="og:image" content={image} />
          {/*{imageWidth ? (*/}
          {/*  <meta property="og:image:width" content={imageWidth} />*/}
          {/*) : null}*/}
          {/*{imageHeight ? (*/}
          {/*  <meta property="og:image:height" content={imageHeight} />*/}
          {/*) : null}*/}
        </>
      ) : null}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {video ? (
        <>
          <meta property="og:video" content={video} />
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
