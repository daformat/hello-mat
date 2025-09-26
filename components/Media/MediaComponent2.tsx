import { OEmbed, ResizeType } from "./EmbedResult"
import { EMBED_PROVIDERS } from "./EmbedProvider"
import {
  CSSProperties,
  PropsWithChildren,
  ReactEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
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

export type SizeInfo = {
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

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
  sizeInfo?: SizeInfo
  speed?: number
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
  sizeInfo,
  speed = 1,
}: MediaComponentProps) => {
  const [loading, setLoading] = useState(true)
  const [size, setSize] =
    useState<
      MaybeUndefined<{ width: number; height: number; aspectRatio: number }>
    >(undefined)
  const [collapsed, setCollapsed] = useState(!open)
  const mediaComponentRef = useRef<HTMLDivElement>(null)
  const mediaContentWrapperRef = useRef<HTMLDivElement>(null)
  const mediaContentRef = useRef<HTMLDivElement>(null)
  const collapsedContentRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(Date.now())

  const handleLoad = useCallback<ReactEventHandler<HTMLDivElement>>(
    (event) => {
      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase()
        if (["iframe", "img"].includes(tag)) {
          // handle speed slowdown
          const loadingTime = Date.now() - startTimeRef.current
          // we want to make sure a resize can happen before loading is set to false
          setTimeout(
            () => {
              // console.log("loaded", tag, target)
              setLoading(false)
            },
            speed <= 1 ? loadingTime / speed : 0
          )
        }
      }
    },
    [speed]
  )

  // Reset timer when source changes
  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [source])

  // Listen to resize events for the media content
  useEffect(() => {
    const mediaComponent = mediaComponentRef.current
    const mediaContentWrapper = mediaContentWrapperRef.current
    const mediaContent = mediaContentRef.current
    // console.log({ loading, sizeInfo, source })
    const provider = EMBED_PROVIDERS.find((provider) =>
      provider.regexp.test(source)
    )
    const isTwitter = provider?.name === "twitter/x"
    if (
      mediaComponent &&
      mediaContentWrapper &&
      mediaContent &&
      (!size || isTwitter)
    ) {
      const observer = new ResizeObserver(() => {
        // console.log("resize", source)
        // we use offsetWidth and offsetHeight instead of contentRect to
        // get the non-transformed dimensions
        const width = mediaContent.offsetWidth
        const height = mediaContent.offsetHeight
        // console.log({ width, height, source, children: mediaContent.children })
        if (
          width &&
          height > 20 &&
          (size?.width !== width || size?.height !== height)
        ) {
          const aspectRatio = width / height
          // console.log("Media content resized", source, {
          //   width,
          //   height,
          //   aspectRatio,
          // })
          setSize({ width, height, aspectRatio })
          if (!provider || !isTwitter) {
            // console.log("stop observing", provider?.name)
            observer.disconnect()
          } else {
            const transitions = mediaContentWrapper.getAnimations()
            if (
              size &&
              isTwitter &&
              transitions.length === 0 &&
              (size.width !== width || size.height !== height)
            ) {
              // re-resizing twitter, should be instant
              // console.log("instant resize")
              mediaContentWrapper.style.transition = "none"
              mediaComponent.style.setProperty(
                "--media-natural-width",
                `${width}px`
              )
              mediaComponent.style.setProperty(
                "--media-natural-height",
                `${height}px`
              )
              mediaComponent.style.setProperty(
                "--media-natural-aspect-ratio",
                `${aspectRatio}`
              )
              setTimeout(() => (mediaContentWrapper.style.transition = ""))
            }
          }
        }
      })
      observer.observe(mediaContent)
      return () => observer.disconnect()
    }
  }, [size, source])

  // Make sure cached images trigger the load event
  useEffect(() => {
    const img = mediaContentRef.current?.querySelector("img")
    if (img?.complete) {
      img.dispatchEvent(new Event("load"))
    }
  }, [source])

  // Measure the collapsed content on resize
  useLayoutEffect(() => {
    const mediaComponent = mediaComponentRef.current
    const collapsedContent = collapsedContentRef.current
    const mediaContentWrapper = mediaContentWrapperRef.current
    if (mediaComponent && mediaContentWrapper && collapsedContent) {
      const handleResize = () => {
        mediaContentWrapper.style.transition = "none"
        const height = collapsedContent.offsetHeight
        mediaComponent.style.setProperty(
          "--collapsed-content-height",
          `${height}px`
        )
        mediaComponent.dataset.collapsedContentMeasured = ""
        setTimeout(() => (mediaContentWrapper.style.transition = ""))
      }
      const observer = new ResizeObserver(handleResize)
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

  // toggle data-animating on content
  useEffect(() => {
    const content = mediaContentRef.current
    const img = content?.querySelector("img")
    if (content && img) {
      const handleTransitionEnd = (event: TransitionEvent) => {
        if (event.target === img) {
          delete content.dataset.animating
        }
      }
      const handleTransitionStart = (event: TransitionEvent) => {
        if (event.target === img) {
          content.dataset.animating = ""
        }
      }
      content.addEventListener("transitionstart", handleTransitionStart)
      content.addEventListener("transitionend", handleTransitionEnd)

      return () => {
        content.removeEventListener("transitionstart", handleTransitionStart)
        content.removeEventListener("transitionend", handleTransitionEnd)
      }
    }
  }, [])

  const sizeProps = getSizeProps(sizeInfo ?? {})

  return (
    <div
      ref={mediaComponentRef}
      className={styles.media_component}
      data-media-responsive={responsive}
      data-media-loading={loading || !size ? "" : undefined}
      data-media-keep-aspect-ratio={keepAspectRatio ? "" : undefined}
      data-media-sized={size ? "" : undefined}
      data-media-collapsed={collapsed ? "" : undefined}
      style={
        {
          "--media-animation-speed": `${speed}`,
          "--media-natural-width":
            size && !loading ? `${size.width}px` : undefined,
          "--media-natural-height":
            size && !loading ? `${size.height}px` : undefined,
          "--media-natural-aspect-ratio":
            size && !loading ? `${size.aspectRatio}` : undefined,
          "--media-min-width": sizeProps?.minWidth
            ? `${sizeProps.minWidth}px`
            : undefined,
          "--media-max-width": sizeProps?.maxWidth
            ? `${sizeProps.maxWidth}px`
            : undefined,
          "--media-min-height": sizeProps?.minHeight
            ? `${sizeProps.minHeight}px`
            : undefined,
          "--media-max-height": sizeProps?.maxHeight
            ? `${sizeProps.maxHeight}px`
            : undefined,
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
          onLoadStartCapture={(event) => console.log("load start", event)}
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
  title,
  open = true,
  speed,
}: {
  source: string
  title?: string
  open?: boolean
  speed?: number
}) => {
  const [loading, setLoading] = useState(true)
  const [oEmbed, setOEmbed] = useState<MaybeUndefined<OEmbed>>(undefined)
  const [error, setError] = useState<MaybeUndefined<Error>>(undefined)
  const provider = useMemo(
    () => EMBED_PROVIDERS.find((provider) => provider.regexp.test(source)),
    [source]
  )
  const { hostname } = new URL(source)
  const icon = `https://icons.duckduckgo.com/ip3/${hostname}.ico`
  const embedRef = useRef<HTMLDivElement>(null)
  const embedRef2 = useRef<HTMLDivElement>(null)

  // fetch the oEmbed when provider and/or source changes
  useEffect(() => {
    if (provider) {
      setError(undefined)
      setLoading(true)
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
        .finally(() => setLoading(false))
    } else {
      setError(new Error("No provider found for this source"))
    }
  }, [provider, source])

  if (error) {
    console.error(error)
  }

  // Init embeds each time we get a new embed
  useEffect(() => {
    if (embedRef.current && !["flickr"].includes(provider?.name ?? "")) {
      initEmbeds(embedRef.current)
    }
    if (embedRef2.current && !["flickr"].includes(provider?.name ?? "")) {
      initEmbeds(embedRef2.current)
    }
  }, [oEmbed?.html, provider?.name])

  return (
    <>
      <Media
        open={open}
        icon={icon}
        error={error}
        speed={speed}
        source={source}
        title={title ?? (loading ? "Loading..." : oEmbed?.title)}
        variant={MediaType.embed}
        keepAspectRatio={provider?.keepAspectRatio}
        responsive={provider?.responsive}
        placeholder={
          provider ? <provider.Placeholder /> : <SvgPlaceholderDefault />
        }
        sizeInfo={provider?.sizeInfo}
      >
        <div
          data-provider={provider?.name}
          ref={embedRef}
          dangerouslySetInnerHTML={{
            __html: oEmbed?.html ?? "",
          }}
        />
      </Media>
    </>
  )
}

export const ImageComp = ({
  source,
  title,
  open = true,
  speed,
}: {
  source: string
  title?: string
  open?: boolean
  speed?: number
}) => {
  return (
    <Media
      open={open}
      icon={source}
      title={title}
      speed={speed}
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
const initEmbeds = (embedContent: HTMLDivElement | null) => {
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
const cloneScript = (node: HTMLScriptElement) => {
  const script = document.createElement("script") as HTMLScriptElement
  script.text = node.innerHTML
  for (const attr of Array.from(node.attributes)) {
    script.setAttribute(attr.name, attr.value)
  }
  return script
}

/**
 * Returns the size properties to apply to the media component based on the
 * given SizeInfo
 * @param sizeInfo
 */
const getSizeProps = (sizeInfo: SizeInfo) => {
  const minWidth = sizeInfo.width || sizeInfo.minWidth
  const maxWidth = sizeInfo.width || sizeInfo.maxWidth
  const minHeight = sizeInfo.height || sizeInfo.minHeight
  const maxHeight = sizeInfo.height || sizeInfo.maxHeight

  return { minWidth, maxWidth, minHeight, maxHeight }
}
