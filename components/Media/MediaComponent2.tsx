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
import SvgPlaceholderImage from "./Placeholder/SvgPlaceholderImage"
import { MediaType } from "./MediaComponent"

export type MediaComponentProps = PropsWithChildren<{
  error?: Error
  icon: string
  open?: boolean
  variant: MediaType
  title?: string
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
  icon,
  open = true,
  variant,
  title,
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
  const [collapsed, setCollapsed] = useState(!open)
  const mediaComponentRef = useRef<HTMLDivElement>(null)
  const mediaContentWrapperRef = useRef<HTMLDivElement>(null)
  const mediaContentRef = useRef<HTMLDivElement>(null)
  const collapsedContentRef = useRef<HTMLDivElement>(null)

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
    // console.log({ loading, sizeInfo, source })
    if (mediaComponent && mediaContent && !sizeInfo) {
      const observer = new ResizeObserver(() => {
        // we use offsetWidth and offsetHeight instead of contentRect to
        // get the non-transformed dimensions
        const width = mediaContent.offsetWidth
        const height = mediaContent.offsetHeight
        console.log({ width, height, source, children: mediaContent.children })
        if (width && height > 10) {
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
  }, [sizeInfo, source])

  // Make sure cached images trigger the load event
  useEffect(() => {
    const img = mediaContentRef.current?.querySelector("img")
    if (img?.complete) {
      img.dispatchEvent(new Event("load"))
    }
  }, [source])

  // Measure the collapsed content on resize
  useEffect(() => {
    const mediaComponent = mediaComponentRef.current
    const collapsedContent = collapsedContentRef.current
    const mediaContentWrapper = mediaContentWrapperRef.current
    if (mediaComponent && mediaContentWrapper && collapsedContent) {
      const observer = new ResizeObserver(() => {
        mediaContentWrapper.style.transition = "none"
        // const width = collapsedContent.offsetWidth
        const height = collapsedContent.offsetHeight
        mediaComponent.style.setProperty(
          "--collapsed-content-height",
          `${height}px`
        )
        setTimeout(() => (mediaContentWrapper.style.transition = ""))
      })
      observer.observe(collapsedContent)
      return () => observer.disconnect()
    }
  }, [])

  // Measure the width of the media component
  useEffect(() => {
    const mediaComponent = mediaComponentRef.current
    if (mediaComponent) {
      const observer = new ResizeObserver(() => {
        // const width = collapsedContent.offsetWidth
        const width = mediaComponent.offsetWidth
        mediaComponent.style.setProperty(
          "--media-component-width",
          `${width}px`
        )
      })
      observer.observe(mediaComponent)
      return () => observer.disconnect()
    }
  }, [])

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
      <div
        className={styles.media_collapsed_content}
        ref={collapsedContentRef}
        // @ts-expect-error: inert is a valid attribute, but we're lagging behind
        // on our react version, so we need to disable the ts rule
        inert={!collapsed ? "" : undefined}
      >
        <button
          className={styles.icon}
          onClick={() => setCollapsed((prevCollapsed) => !prevCollapsed)}
        >
          <span className={styles.placeholder}>{placeholder}</span>
          <span
            className={styles.img}
            data-variant={variant}
            style={{ backgroundImage: `url("${icon}")` }}
          />
        </button>
        <a target="_blank" href={source} rel="noreferrer">
          {title ?? source}
        </a>
      </div>
      <div
        ref={mediaContentWrapperRef}
        className={styles.media_content_wrapper}
        // @ts-expect-error: inert is a valid attribute, but we're lagging behind
        // on our react version, so we need to disable the ts rule
        inert={collapsed ? "" : undefined}
      >
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

export const EmbedComp = ({
  source,
  open = true,
}: {
  source: string
  open?: boolean
}) => {
  const [oEmbed, setOEmbed] = useState<MaybeUndefined<OEmbed>>(undefined)
  const [error, setError] = useState<MaybeUndefined<Error>>(undefined)
  const provider = useMemo(
    () => EMBED_PROVIDERS.find((provider) => provider.regexp.test(source)),
    [source]
  )
  const { hostname } = new URL(source)
  const icon = `https://icons.duckduckgo.com/ip3/${hostname}.ico`
  const embedRef = useRef<HTMLDivElement>(null)

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

  // Init embeds each time we get a new embed
  useEffect(() => {
    if (embedRef.current && !["flickr"].includes(provider?.name ?? "")) {
      initEmbeds(embedRef.current)
    }
  }, [oEmbed?.html, provider?.name])

  return (
    <Media
      open={open}
      icon={icon}
      error={error}
      source={source}
      title={oEmbed?.title}
      variant={MediaType.embed}
      keepAspectRatio={provider?.keepAspectRatio}
      responsive={provider?.responsive}
      placeholder={
        provider ? <provider.Placeholder /> : <SvgPlaceholderDefault />
      }
    >
      <div
        ref={embedRef}
        dangerouslySetInnerHTML={{
          __html: oEmbed?.html ?? "",
        }}
      />
    </Media>
  )
}

export const ImageComp = ({
  source,
  title,
  open = true,
}: {
  source: string
  title?: string
  open?: boolean
}) => {
  return (
    <Media
      open={open}
      icon={source}
      title={title}
      source={source}
      variant={MediaType.image}
      keepAspectRatio={true}
      responsive={ResizeType.both}
      placeholder={<SvgPlaceholderImage />}
    >
      <img src={source} alt="" />
      <MediaSource source={source} />
    </Media>
  )
}

/**
 * Initialise embeds: execute the contained scripts and refresh
 * instagram embeds
 * @param embedContent
 */

function initEmbeds(embedContent: HTMLDivElement | null): void {
  const scripts = embedContent?.querySelectorAll(
    "script"
  ) as NodeListOf<HTMLScriptElement>
  scripts?.forEach((script) => {
    const clone = cloneScript(script)
    // instagram needs to be called manually after the script
    // was (re)loaded, otherwise the embeds will never be parsed.
    // Another option would be to `window.instgrm && delete window.instgrm`
    // to force each script to re-execute embed processing
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.instgrm && window.instgrm.Embeds.process()
    script.replaceWith(clone)
  })
}

/**
 * Clone a script with its content and attributes to make sure it's executed.
 * Scripts that are added at runtime are not executed
 * @param node
 */
function cloneScript(node: HTMLScriptElement): HTMLScriptElement {
  const script = document.createElement("script") as HTMLScriptElement
  script.text = node.innerHTML
  for (const attr of Array.from(node.attributes)) {
    script.setAttribute(attr.name, attr.value)
  }
  return script
}
