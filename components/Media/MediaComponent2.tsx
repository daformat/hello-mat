import { OEmbed, ResizeType } from "./EmbedResult"
import { EMBED_PROVIDERS } from "./EmbedProvider"
import {
  CSSProperties,
  PropsWithChildren,
  ReactEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { MaybeUndefined } from "./utils/maybe"
import styles from "./MediaComponent2.module.scss"
import SvgPlaceholderDefault from "./Placeholder/SvgPlaceholderDefault"
import { MediaSource } from "./MediaSource"
import SvgPlaceholderError from "./Placeholder/SvgError"
import { MediaToggle } from "./MediaToggle"

export type MediaComponentProps = PropsWithChildren<{
  error?: Error
  source: string
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  keepAspectRatio?: boolean
  responsive?: ResizeType
  placeholder?: ReactNode
}>

export const Media = ({
  error,
  source,
  children,
  keepAspectRatio,
  responsive,
  placeholder = <SvgPlaceholderDefault />,
}: MediaComponentProps) => {
  const [loading, setLoading] = useState(true)
  const [sizeInfo, setSizeInfo] =
    useState<
      MaybeUndefined<{ width: number; height: number; aspectRatio: number }>
    >(undefined)
  const [collapsed, setCollapsed] = useState(false)
  const mediaComponentRef = useRef<HTMLDivElement>(null)
  const mediaContentRef = useRef<HTMLDivElement>(null)

  const handleLoad = useCallback<ReactEventHandler<HTMLDivElement>>((event) => {
    const target = event.target
    if (target instanceof HTMLElement) {
      const tag = target.tagName.toLowerCase()
      if (["iframe", "img"].includes(tag)) {
        // we want to make sure a resize can happen before loading is set to false
        setTimeout(() => {
          console.log("loaded", tag, target)
          setLoading(false)
        })
      }
    }
  }, [])

  // Listen to resize events for the media content
  useEffect(() => {
    const mediaComponent = mediaComponentRef.current
    const mediaContent = mediaContentRef.current
    if (mediaComponent && mediaContent && loading && !sizeInfo) {
      const observer = new ResizeObserver(() => {
        // we use offsetWidth and offsetHeight instead of contentRect to
        // get the non-transformed dimensions
        const width = mediaContent.offsetWidth
        const height = mediaContent.offsetHeight
        if (width && height) {
          console.log("Media content resized", source, {
            width,
            height,
            aspectRatio: width / height,
          })
          setSizeInfo({ width, height, aspectRatio: width / height })
          observer.disconnect()
        }
      })
      observer.observe(mediaContent)
      return () => observer.disconnect()
    }
  }, [loading, sizeInfo, source])

  // Make sure cached images trigger the load event
  useEffect(() => {
    const img = mediaContentRef.current?.querySelector("img")
    if (img?.complete) {
      img.dispatchEvent(new Event("load"))
    }
  }, [source])

  return (
    <div
      ref={mediaComponentRef}
      className={styles.media_component}
      data-media-responsive={responsive}
      data-media-loading={loading ? "" : undefined}
      data-media-keep-aspect-ratio={keepAspectRatio ? "" : undefined}
      data-media-sized={sizeInfo ? "" : undefined}
      data-media-collapsed={collapsed ? "" : undefined}
      style={
        {
          "--media-natural-width":
            sizeInfo && !loading ? `${sizeInfo.width}px` : undefined,
          "--media-natural-height":
            sizeInfo && !loading ? `${sizeInfo.height}px` : undefined,
          "--media-natural-aspect-ratio":
            sizeInfo && !loading ? `${sizeInfo.aspectRatio}` : undefined,
        } as CSSProperties
      }
    >
      <div className={styles.media_collapsed_content}>Hello</div>
      <div className={styles.media_content_wrapper}>
        <div className={styles.placeholder}>
          {error ? <SvgPlaceholderError /> : placeholder}
        </div>
        <div
          ref={mediaContentRef}
          onLoadCapture={handleLoad}
          className={styles.media_content}
        >
          {children}
        </div>
      </div>
      <MediaToggle
        onClick={() => setCollapsed((prevCollapsed) => !prevCollapsed)}
      />
    </div>
  )
}

export const EmbedComp = ({ source }: { source: string }) => {
  const [oEmbed, setOEmbed] = useState<MaybeUndefined<OEmbed>>(undefined)
  const [error, setError] = useState<MaybeUndefined<Error>>(undefined)
  const provider = useMemo(
    () => EMBED_PROVIDERS.find((provider) => provider.regexp.test(source)),
    [source]
  )

  // fetch the oEmbed when provider and/or source changes
  useEffect(() => {
    if (provider) {
      setError(undefined)
      fetch(provider.getOEmbedUrl(source))
        .then(async (response) => {
          if (response.ok) {
            const json = await response.json()
            setOEmbed(json)
          } else {
            setError(new Error("Failed to fetch oEmbed data"))
          }
        })
        .catch((reason) => {
          setError(new Error("Failed to fetch oEmbed data", { cause: reason }))
        })
    } else {
      setError(new Error("No provider found for this source"))
    }
  }, [provider, source])

  return (
    <Media
      source={source}
      error={error}
      keepAspectRatio={provider?.keepAspectRatio}
      responsive={provider?.responsive}
    >
      <div
        dangerouslySetInnerHTML={{
          __html: oEmbed?.html ?? "",
        }}
      />
    </Media>
  )
}

export const ImageComp = ({ source }: { source: string }) => {
  return (
    <Media source={source} keepAspectRatio={true} responsive={ResizeType.both}>
      <img src={source} alt="" />
      <MediaSource source={source} />
    </Media>
  )
}
