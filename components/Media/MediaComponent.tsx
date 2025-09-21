import styles from "./MediaComponent.module.scss"
import linkStyles from "./link.module.scss"
import {
  ComponentType,
  CSSProperties,
  HTMLAttributes,
  MouseEventHandler,
  ReactEventHandler,
  ReactNode,
  RefObject,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import Link from "next/link"
import { EmbedResult, ResizeType } from "./EmbedResult"
import { useReducedMotion } from "../../hooks/useReducedMotion"
import { EMBED_PROVIDERS } from "./EmbedProvider"
import SvgPlaceholderError from "./Placeholder/SvgError"
import SvgPlaceholderDefault from "./Placeholder/SvgPlaceholderDefault"
import SvgPlaceholderImage from "./Placeholder/SvgPlaceholderImage"

// The type of media displayed in a MediaComponent
export enum MediaType {
  embed = "embed",
  image = "image",
}

// ------------------
// The MediaComponent
// ------------------

export type MediaComponentProps = HTMLAttributes<HTMLElement> & {
  error?: boolean
  // The type of media to display
  type: MediaType
  // The source url of the media
  source?: string
  // The title of the media
  title?: string
  // The media to display, `undefined` when loading, `null` when not found
  media?: ReactNode | EmbedResult | null
  // The icon when collapsed
  icon?: string
  // Whether to size the width
  sizeWidth?: boolean
  // Whether to size the height of the media
  sizeHeight?: boolean
  // Is the element collapsed?
  collapsed?: boolean
}

// Media component
// ------------------
// This component is responsible for:
// - displaying a media: either an external `embed` or an `image`
// - optionally size the media to the desired `width`
// - optionally size the media to the desired `height`
// - collapse / expand the media
// - display a link to the source of **images**, if any
export const MediaComponent = ({
  error,
  type,
  source,
  media,
  title,
  icon,
  sizeWidth,
  sizeHeight,
  collapsed,
  ...rest
}: MediaComponentProps) => {
  const [collapse, setCollapse] = useState(collapsed)
  const reduceMotion = useReducedMotion()
  const mediaComponentRef = useRef<HTMLDivElement>(null)
  const embedContentRef = useRef<HTMLDivElement>(null)
  const collapsedContentRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState<boolean>(error || true)

  /**
   * Toggle loading state when media has loaded
   * @param e
   */
  const handleMediaLoaded = (e?: SyntheticEvent<HTMLDivElement>) => {
    if (e?.target instanceof HTMLElement) {
      const tag = e.target.tagName.toLowerCase()
      if (["iframe", "img"].includes(tag)) {
        console.info(`Loaded <${tag}>`)
        setLoading(false)
      } else {
        console.info(`Unrelated load: <${tag}>`)
      }
    }
    if (!e) {
      // hack for cached images
      setTimeout(() => setLoading(false), 2000)
    }
  }

  /**
   * Click handler for the embed controls
   */
  const handleControlsClick: MouseEventHandler = (e): void => {
    // in case the beam-media belongs to a details summary,
    // we want to prevent toggling the details
    e.preventDefault()
    e.stopPropagation()
    const component = mediaComponentRef.current
    const collapsedContent = collapsedContentRef.current
    const embedContent = embedContentRef.current
    if (component && collapsedContent && embedContent) {
      if (component.classList.contains(styles.animating)) {
        return
      }
      if (!reduceMotion) {
        const { from, to } = getAnimationProps(
          collapsedContent,
          component,
          embedContent
        )
        requestAnimationFrame(() => animateSize(from, to))
      }
      setCollapse(!collapse)
    }
  }

  /**
   * Return the initial css height from which to animate the media component
   * and the final css height to which animate it `to`
   */
  const getAnimationProps = (
    collapsedContent: HTMLDivElement,
    component: HTMLDivElement,
    embedContent: HTMLDivElement
  ) => {
    const collapsedContentBbox = collapsedContent.getBoundingClientRect()
    const mediaWrapperBbox = embedContentRef.current?.getBoundingClientRect()
    let from = `${mediaWrapperBbox?.height ?? 0}px`
    let to = `${collapsedContentBbox.height + 1}px`
    if (collapse) {
      component.classList.remove(styles.collapsed)
      const mediaWrapperBbox = embedContent?.getBoundingClientRect()
      to = `${mediaWrapperBbox?.height ?? 0}px`
      from = `${collapsedContentBbox.height + 1}px`
    }
    return { from, to }
  }

  /**
   * Animate the size of the media component from the given css height
   * value to the other given one
   */
  const animateSize = (from: string, to: string) => {
    // We animate both
    const component = mediaComponentRef.current
    if (component) {
      component.classList.add(styles.animating)
      animateMedia(component, from, to)
      animateComponent(component, from, to)
    }
  }

  /**
   * Animate the given element with the given set of `keyframes`
   */
  const animateElement = (element: HTMLElement, keyframes: Keyframe[]) => {
    const component = mediaComponentRef.current
    if (!component) {
      throw new Error("Cannot animate without a media component ref")
    }
    const style = getComputedStyle(component)
    return element.animate(keyframes, {
      duration:
        parseFloat(
          style.getPropertyValue("--expand-collapse-transition-duration-second")
        ) * 1000,
      easing: style.getPropertyValue("--custom-ease"),
    })
  }

  /**
   * Animate the media to the appropriate scale when expanding / collapsing
   */
  function animateMedia(component: HTMLElement, from: string, to: string) {
    const media = component?.querySelector(
      `.${styles.media_wrapper_inner}`
    ) as HTMLElement
    const isExpanding = parseInt(from) < parseInt(to)
    const startScale = isExpanding ? "scale(0)" : "scale(1)"
    const endScale = isExpanding ? "scale(1)" : "scale(0)"
    animateElement(media, [{ transform: startScale }, { transform: endScale }])
  }

  /**
   * Animate the component itself when expanding / collapsing
   */
  function animateComponent(
    component: HTMLDivElement,
    from: string,
    to: string
  ) {
    const animation = animateElement(component, [
      { height: from },
      { height: to },
    ])
    const animationHandler = () => {
      const mediaWrapper = mediaComponentRef.current
      if (mediaWrapper) {
        mediaWrapper.classList.remove(styles.animating)
        if (!collapse) {
          // console.log("stopping media")
          // stopNestedMedias(mediaWrapper)
        }
      }
    }
    animation.addEventListener("finish", animationHandler)
    animation.addEventListener("cancel", animationHandler)
  }

  // Css classes
  const loadingClass = loading ? ` ${styles.loading}` : ""
  const rootClass = styles.media_component_root + loadingClass
  const collapsedClass = collapse ? ` ${styles.collapsed}` : ""
  const sizeWidthClass = sizeWidth ? ` ${styles.size_width}` : ""
  const sizeHeightClass = sizeHeight ? ` ${styles.size_height}` : ""
  const componentClass =
    styles.media_component + collapsedClass + sizeWidthClass + sizeHeightClass

  // Props for the nested elements
  const mediaProps = {
    error,
    loading,
    type,
    source,
    media,
    embedContentRef,
    handleMediaLoaded,
  }
  const mediaCollapsedContentProps = {
    icon,
    type,
    source,
    title,
    collapsedContentRef,
    onClickIcon: handleControlsClick,
  }
  const mediaControlsProps = { onClick: handleControlsClick, type }

  return (
    <div className={rootClass}>
      <div ref={mediaComponentRef} className={componentClass} {...rest}>
        <Media {...mediaProps} />
        <MediaControls {...mediaControlsProps} />
      </div>
      <MediaCollapsedContent {...mediaCollapsedContentProps} />
    </div>
  )
}

// ----------------------------
// Media for the MediaComponent
// ----------------------------

type MediaProps = {
  loading: boolean
  handleMediaLoaded: (event?: SyntheticEvent<HTMLDivElement>) => void
  embedContentRef: RefObject<HTMLDivElement>
} & Pick<MediaComponentProps, "media" | "source" | "type" | "error">

const Media = ({
  error,
  loading,
  handleMediaLoaded,
  embedContentRef,
  media,
  source,
  type,
}: MediaProps) => {
  const mediaWrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const provider =
    source && EMBED_PROVIDERS.find((provider) => provider.regexp.exec(source))
  let Placeholder: ComponentType<{ className: string }> = SvgPlaceholderDefault
  if (provider) {
    Placeholder = provider.Placeholder
  }
  // Init embeds each time we get a new embed
  useEffect(() => {
    if (media) {
      initEmbeds(embedContentRef.current)
    }
  }, [media, embedContentRef])

  // Remember about the initial width the media is first rendered
  // (the default size when no information is available yet)
  const initialWidth = useRef<number>()
  const initialHeight = useRef<number>()
  useEffect(() => {
    if (embedContentRef.current) {
      const bbox = embedContentRef.current.getBoundingClientRect()
      initialWidth.current = bbox.width
      initialHeight.current = bbox.height
      // embedContentRef.current.style.setProperty("overflow", "hidden")
    }
  }, [embedContentRef])

  // Animate to the new size using a resize observer
  // TODO - improve, we still have a few minor sizing quirks to work out
  // Twitter mostly, and the transition between collapsed / expanded when loading
  const prevWidth = useRef<number>()
  const prevHeight = useRef<number>()
  const sized = useRef<boolean>(false)
  useEffect(() => {
    // Returns the props used for the animations
    const getAnimationProps = (
      prev: { width: number | undefined; height: number | undefined },
      newWidth: number,
      newHeight: number
    ) => {
      const animationKeyframes = [
        { width: `${prev.width}px`, height: `${prev.height}px` },
        { width: `${newWidth}px`, height: `${newHeight}px` },
      ]
      const animationOptions: KeyframeAnimationOptions = {
        duration: 200,
        delay: 100,
        fill: "backwards",
        easing: "ease-in-out",
      }
      return { animationKeyframes, animationOptions }
    }

    // Animate to the new size
    const animateMedia = (
      newWidth: number,
      mediaWrapperEntry: ResizeObserverEntry,
      prev: { width: number | undefined; height: number | undefined },
      newHeight: number
    ) => {
      sized.current = true
      console.log("animateMedia", { newHeight, newWidth, prev, loading })
      if (loading) {
        const mediaWrapper = mediaWrapperRef.current
        mediaWrapper?.style.setProperty("--width", `${newWidth}px`)
        const animationProps = getAnimationProps(prev, newWidth, newHeight)
        console.log("animatingMedia", animationProps)
        const animation = mediaWrapperEntry.target.animate(
          animationProps.animationKeyframes,
          animationProps.animationOptions
        )
        const reset = () => {
          mediaWrapperRef.current?.style.setProperty("--width", "")
        }
        animation.addEventListener("finish", reset)
        animation.addEventListener("cancel", reset)
      }
    }

    // Observe dimension updates
    const createObserver = () =>
      new ResizeObserver((entries) => {
        const [mediaWrapperEntry] = entries
        if (prevHeight.current && prevWidth.current) {
          const { height, width } = mediaWrapperEntry.contentRect
          const newWidth = ~~width
          const newHeight = ~~height
          const prev = {
            width: initialWidth.current,
            height: initialHeight.current,
          }
          const isAnimating = mediaWrapperEntry.target.getAnimations().length
          const widthChanged = initialWidth.current !== newWidth
          const heightChanged = initialHeight.current !== newHeight
          const dimensionsChanged = widthChanged || heightChanged
          console.log({ sized: sized.current, isAnimating, dimensionsChanged })
          if (!sized.current && !isAnimating && dimensionsChanged) {
            console.log("animating", { newHeight, newWidth, prev })
            animateMedia(newWidth, mediaWrapperEntry, prev, newHeight)
          }
        } else {
          prevHeight.current = ~~mediaWrapperEntry.contentRect.height
          prevWidth.current = ~~mediaWrapperEntry.contentRect.width
        }
      })

    // Initialise the observer
    const observer = createObserver()
    const content = contentRef.current
    // const content = embedContentRef.current
    // const element = content?.querySelector("img,iframe")
    // console.log("observing", element, element.offsetWidth, element.offsetHeight)
    if (content) {
      observer?.observe(content)
    }

    // console.log("mediaWrapperRect", element?.getBoundingClientRect())

    // Cleanup callback
    return () => {
      observer?.disconnect()
    }
  }, [embedContentRef, loading])

  // When the media has loaded
  const handleLoadCapture: ReactEventHandler<HTMLDivElement> = (e) => {
    if (loading) {
      sized.current = false
    }
    handleMediaLoaded(e)
  }

  // We use the provider name for adding css overrides
  // for some providers, in order to deal with their own markup / styles
  const normalisedProviderName =
    (provider && provider.name.toLowerCase()) || "default"

  useEffect(() => {
    const mediaWrapper = mediaWrapperRef.current
    if (mediaWrapper) {
      const img = mediaWrapper.querySelector("img")
      const iframe = mediaWrapper.querySelector("iframe")
      if (img) {
        if (img.complete) {
          handleMediaLoaded()
        }
      }
      iframe?.addEventListener("load", () => {
        console.log("loaded iframe", source)
      })
      console.log("img", img?.getBoundingClientRect())
    }
  })

  // const handleLoadCapture: ReactEventHandler<HTMLDivElement> = (e) => {}
  // const normalisedProviderName = "default"

  return (
    <div
      ref={mediaWrapperRef}
      className={`${styles.media_wrapper}`}
      onLoadCapture={handleLoadCapture}
      data-provider={normalisedProviderName}
    >
      {type === MediaType.embed ? (
        <div ref={embedContentRef} className={styles.media_wrapper_inner}>
          <div
            ref={contentRef}
            dangerouslySetInnerHTML={{
              __html: (media as EmbedResult)?.html ?? "",
            }}
          />
        </div>
      ) : (
        <div ref={embedContentRef} className={styles.media_wrapper_inner}>
          <div ref={contentRef}>{media as unknown as ReactNode}</div>
          {type === MediaType.image && <MediaSource source={source} />}
        </div>
      )}
      {
        <div className={styles.placeholder} key="placeholder">
          {error ? (
            <SvgPlaceholderError className={styles.svg} />
          ) : type === MediaType.embed ? (
            <Placeholder className={styles.svg} />
          ) : (
            <SvgPlaceholderImage className={styles.svg} />
          )}
        </div>
      }
    </div>
  )
}

// ---------------------------------------
// Source link to the MediaComponent media
// ---------------------------------------

type MediaSourceProps = Pick<MediaComponentProps, "source">

const MediaSource = ({ source }: MediaSourceProps) => {
  /**
   * Click handler for the source icon in images,
   * we need to prevent potential summary details click handler
   */
  const handleSourceClick: MouseEventHandler<HTMLAnchorElement> = (
    event
  ): void => {
    event.stopPropagation()
  }

  return source ? (
    <Link
      href={source}
      aria-label={"Visit source"}
      className={styles.source}
      target="_blank"
      rel="noopener"
      onClick={handleSourceClick}
    >
      <svg
        className=""
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4.5 11.5L11.5 4.5M11.5 4.5V9.94444M11.5 4.5H6.05556"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  ) : null
}

// -------------------------------------
// Controls for the MediaComponent media
// -------------------------------------

type MediaControlsProps = Pick<MediaComponentProps, "type"> & {
  onClick: MouseEventHandler<HTMLElement>
}

// The controls to expand / collapse the MediaComponent media
const MediaControls = ({ onClick }: MediaControlsProps) => {
  return (
    <div className={styles.controls}>
      <span className={styles.action} onClick={onClick}>
        <span className={styles.expand_label}>
          <svg
            className={styles.icon_expand}
            width="12"
            height="13"
            viewBox="0 0 12 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.25 7.75L10.75 11.25M10.75 7.75V11.25M7.25 11.25H10.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4.75 5.25L1.25 1.75M1.25 5.25L1.25 1.75M4.75 1.75L1.25 1.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>expand</span>
        </span>
        <span className={styles.collapse_label}>
          <svg
            className={styles.icon_collapse}
            width="12"
            height="13"
            viewBox="0 0 12 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.75 11.25L7.25 7.75M7.25 10.75V7.75M10.25 7.75H7.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M1.25 1.75L4.75 5.25M4.75 2.25V5.25M1.75 5.25H4.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>collapse</span>
        </span>
      </span>
    </div>
  )
}

// -----------------------------------
// The collapsed content for the media
// -----------------------------------

type MediaCollapsedContentProps = Pick<
  MediaComponentProps,
  "source" | "icon" | "title" | "type"
> & {
  onClickIcon: MouseEventHandler<HTMLElement>
  collapsedContentRef: RefObject<HTMLDivElement>
}

// Collapsed content for the MediaComponent, expects a ref
// to register its main HTMLElement
const MediaCollapsedContent = ({
  onClickIcon,
  collapsedContentRef,
  source,
  icon,
  title,
  type,
}: MediaCollapsedContentProps) => {
  const titlePublicUrl = title?.startsWith("http") ? title : ""
  const sourceLink = source ? source : titlePublicUrl
  const collapsedLabel = <span className={styles.collapsed_label}>{title}</span>
  return (
    <div ref={collapsedContentRef} className={styles.collapsed_content}>
      <span
        onClick={onClickIcon}
        className={`${styles.collapsed_icon} ${
          type === MediaType.image ? styles.masked : ""
        }`}
        style={{ backgroundImage: `url(${icon})` }}
      />
      <span className={styles.media_name}>
        {sourceLink ? (
          <Link
            href={sourceLink}
            target="_blank"
            rel="noopener"
            className={linkStyles.link_with_arrow}
          >
            {collapsedLabel}
          </Link>
        ) : (
          collapsedLabel
        )}
      </span>
    </div>
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

export const EmbedComponent = ({
  result,
  collapsed,
}: {
  result: EmbedResult
  collapsed?: boolean
}) => {
  const sizingProps = getSizingProps(result, {
    width: result.width,
    height: result.height,
    displayRatio:
      result.width && result.height ? result.height / result.width : undefined,
  })
  console.log({ result, sizingProps })
  return (
    <MediaComponent
      collapsed={collapsed}
      type={MediaType.embed}
      source={result.url}
      media={result}
      icon={result.favicon}
      title={result.title}
      {...sizingProps}
    />
  )
}

function getWidthProps(result: EmbedResult, displayRatio: number) {
  const style: Record<string, string> = {}
  let { minWidth } = result
  let sizeWidth = false
  const predefinedWidth = result.maxWidth || result.width || result.minWidth
  if (result.width && minWidth && minWidth > result.width) {
    minWidth = result.width
  }
  if (minWidth) {
    style["--min-width"] = `${minWidth}px`
  }
  if (
    predefinedWidth &&
    result.responsive &&
    [ResizeType.both, ResizeType.horizontal].includes(result.responsive)
  ) {
    style["--width"] = `${displayRatio * 100}%`
    if (result.maxWidth) {
      style["--max-width"] = `${result.maxWidth}px`
    }
    sizeWidth = true
  } else if (predefinedWidth) {
    style["--width"] = "100%"
    style["--max-width"] = `${predefinedWidth}px`
    sizeWidth = true
  }
  return { style, sizeWidth, predefinedWidth }
}

function getHeightProps(
  result: EmbedResult,
  displayInfos: JsonMediaDisplayInfos,
  predefinedWidth: number | undefined
) {
  const style: Record<string, string> = {}
  let { minHeight } = result
  let sizeHeight = false
  const predefinedHeight = result.maxHeight || result.height
  const userDefinedHeight = displayInfos.height
  if (result.height && minHeight && minHeight > result.height) {
    minHeight = result.height
  }
  if (minHeight) {
    style["--min-height"] = `${minHeight}px`
  }
  if (
    result.responsive &&
    predefinedHeight &&
    predefinedWidth &&
    result.keepAspectRatio
  ) {
    style["--height"] = `${(predefinedHeight / predefinedWidth) * 100}%`
    sizeHeight = true
  } else if (userDefinedHeight || predefinedHeight) {
    style["--height"] = `${userDefinedHeight || predefinedHeight}px`
    style["--max-height"] = `${userDefinedHeight || predefinedHeight}px`
    sizeHeight = true
  }
  return { style, sizeHeight }
}

const getSizingProps = (
  result: EmbedResult | null | undefined,
  displayInfos: JsonMediaDisplayInfos
) => {
  if (!result) {
    return
  }
  const displayRatio = displayInfos?.displayRatio || 1
  const {
    style: widthStyle,
    sizeWidth,
    predefinedWidth,
  } = getWidthProps(result, displayRatio)
  const { style: heightStyle, sizeHeight } = getHeightProps(
    result,
    displayInfos,
    predefinedWidth
  )

  return {
    style: { ...widthStyle, ...heightStyle } as CSSProperties,
    sizeWidth,
    sizeHeight,
  }
}

export type JsonMediaDisplayInfos = {
  width?: number
  height?: number
  displayRatio?: number
}
