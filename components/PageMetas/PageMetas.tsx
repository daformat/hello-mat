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
  video,
  videoType,
  videoWidth,
  videoHeight,
}: PageMetasProps) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      {image && (
        <>
          <meta {...{ property: "og:image" }} content={image} key="ogimage" />
        </>
      )}

      <meta {...{ property: "og:title" }} content={title} key="ogtitle" />
      <meta
        {...{ property: "og:description" }}
        content={description}
        key="ogdesc"
      />
      <meta {...{ property: "og:url" }} content={url} key="ogurl" />
      <meta {...{ property: "og:type" }} content="website" key="ogtype" />

      {video ? (
        <>
          <meta {...{ property: "og:video" }} content={video} key="og:video" />
          <meta
            {...{ property: "og:video:type" }}
            content={videoType}
            key="og:video:type"
          />
          <meta
            {...{ property: "og:video:width" }}
            content={videoWidth}
            key="og:video:width"
          />
          <meta
            {...{ property: "og:video:height" }}
            content={videoHeight}
            key="og:video:height"
          />
        </>
      ) : null}

      {image && (
        <>
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:image" content={image} />
        </>
      )}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Head>
  )
}
