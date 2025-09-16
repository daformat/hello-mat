import React, {
  Dispatch,
  MouseEventHandler,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import detailsStyles from "./DetailsComponent.module.scss"
import { useReducedMotion } from "../../hooks/useReducedMotion"

export type DetailsComponentProps = {
  id?: string
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  // nodeRef: RefObject<HTMLLIElement>
}

/**
 * Values from a previously canceled animation if any
 */
type AnimationValues = {
  height: number | null
  opacity: number | null
  elapsed: number
}

/**
 * Returns the collapsed details ancestor if any
 * @param node
 */
export const getCollapsedAncestor = (node: Element) => {
  return node.parentElement?.closest(`.${detailsStyles.collapsed}`)
}

/**
 * Returns the animation duration proportional to the animated distance,
 * (the difference between given `before` and `after` values)
 *
 * @param before
 * @param after
 */
const getAnimationDuration = (before: number, after: number) => {
  const frameDuration = 1000 / 60
  const speed = 15 // pixels / frame
  const min = Math.min(before, after)
  const max = Math.max(before, after)
  const duration = ((max - min) / speed) * frameDuration
  // return duration
  return Math.min(duration, 350)
}

/**
 * Animate details content visibility
 * @param content
 * @param opening
 * @param duration
 * @param lastAnimationValues
 * @param prevHeight
 * @param nextHeight
 */
function animateContentVisibility(
  content: HTMLDivElement,
  opening: boolean,
  duration: number,
  lastAnimationValues: AnimationValues,
  prevHeight: number,
  nextHeight: number
) {
  const startOpacity = lastAnimationValues.opacity ?? (opening ? 0 : 1)
  const endOpacity = opening ? 1 : 0
  const contentAnimationOptions: KeyframeAnimationOptions = {
    duration,
    easing: "ease-in-out",
  }
  console.log("contentAnimationOptions", contentAnimationOptions.duration)
  content.animate(
    [
      { opacity: startOpacity, height: `${prevHeight}px`, overflow: "hidden" },
      { opacity: endOpacity, height: `${nextHeight}px`, overflow: "hidden" },
    ],
    contentAnimationOptions
  )

  const keyframes: Keyframe[] = [
    {
      maskImage: "linear-gradient(180deg, black, black 50%, transparent)",
      maskSize: "100% 200%",
    },
    {
      maskImage: "linear-gradient(180deg, black, black 50%, transparent)",
      maskSize: "100% 100%",
      offset: opening ? 0.75 : 0.25,
    },
    {
      maskImage: "linear-gradient(180deg, black, black 50%, transparent)",
      maskSize: "100% 100%",
      offset: opening ? 0 : 1,
    },
  ]

  console.log("contentAnimationOptions2", duration)
  content.animate(opening ? keyframes.reverse() : keyframes, {
    duration: duration,
    easing: "ease-out",
  })
}

/**
 * Animate details component height
 * @param details
 * @param duration
 * @param prevHeight
 * @param nextHeight
 */
function animateDetailsHeight(
  details: HTMLElement,
  duration: number,
  prevHeight: number,
  nextHeight: number
) {
  const animationOptions = { duration, easing: "ease-in-out" }
  console.log("heightAnimationOptions", animationOptions.duration)
  return details.animate(
    [{ height: `${prevHeight}px` }, { height: `${nextHeight}px` }],
    animationOptions
  )
}

/**
 * Animate open and closing the details component
 * @param details
 * @param content
 * @param setAnimating
 * @param newOpen
 */
function animateOpenClose(
  details: HTMLDetailsElement,
  content: HTMLDivElement,
  setAnimating: Dispatch<SetStateAction<boolean>>,
  newOpen: boolean
) {
  const summaryHeight =
    details.querySelector("summary")?.getBoundingClientRect().height ?? 0
  const animations = [...details.getAnimations(), ...content.getAnimations()]
  const lastAnimationValues = cancelAnimationsAndGetValues(
    animations,
    details,
    content
  )
  // resume using the last interrupted animation value if any or measure details
  const prevHeight =
    lastAnimationValues.height ?? details.getBoundingClientRect().height
  // if the details tag is closing, then the final height is the summary height
  let nextHeight = summaryHeight
  // if opening, then the final height is the fully expanded details height
  if (newOpen) {
    const prevOpen = details.open
    details.open = true
    nextHeight = details.getBoundingClientRect().height
    details.open = prevOpen
  }
  // set the closing attribute to allow proper styling
  if (!newOpen) {
    details.dataset.closing = ""
  }
  // Animate content and details, accounting for previous animation elapsed time
  const theoricalDuration = getAnimationDuration(prevHeight, nextHeight)
  console.log("values", theoricalDuration, lastAnimationValues.elapsed)
  const duration = lastAnimationValues.elapsed || theoricalDuration
  // if (duration <= 0) {
  //   duration = theoricalDuration
  // }
  console.log("duration", duration)
  animateContentVisibility(
    content,
    newOpen,
    duration,
    lastAnimationValues,
    prevHeight - summaryHeight,
    nextHeight - summaryHeight
  )
  const detailsAnimation = animateDetailsHeight(
    details,
    duration,
    prevHeight,
    nextHeight
  )
  // Handle animation end / cancel
  const cancel = () => {
    // Make sure the handler can only be executed once, replace with no-op
    detailsAnimation.oncancel = detailsAnimation.onfinish = () => undefined
    delete details.dataset.closing
    setAnimating(false)
  }
  const finish = () => {
    if (!newOpen) {
      details.open = false
    }
    cancel()
  }
  detailsAnimation.oncancel = cancel
  detailsAnimation.onfinish = finish
  setAnimating(true)
}

/**
 * Stop any given animations and return the interrupted animation values
 * @param animations
 * @param details
 * @param content
 */
const cancelAnimationsAndGetValues = (
  animations: Animation[],
  details: HTMLElement,
  content: HTMLDivElement
): AnimationValues => {
  const lastAnimationValues: AnimationValues = {
    height: null,
    opacity: null,
    elapsed: 0,
  }
  for (const animation of animations) {
    animation.pause()
    const effect = animation.effect
    if (effect) {
      if (animation.currentTime && !lastAnimationValues.elapsed) {
        console.log("elapsed", lastAnimationValues.elapsed)
        lastAnimationValues.elapsed = animation.currentTime
      }
      // Get the last height / opacity for relevant animations
      if (effect instanceof KeyframeEffect) {
        if (effect.target === details) {
          lastAnimationValues.height = details.getBoundingClientRect().height
        }
        if (effect.target === content) {
          if (effect instanceof KeyframeEffect) {
            const keyframes = effect.getKeyframes()
            const hasOpacityKeyframe = keyframes.some(
              (keyframe) => keyframe.opacity !== undefined
            )
            if (hasOpacityKeyframe) {
              lastAnimationValues.opacity = parseFloat(
                getComputedStyle(content).opacity
              )
            }
          }
        }
      }
      animation.cancel()
      // dispatch event right away, so we don't have to wait
      const event = new AnimationEvent("cancel")
      animation.dispatchEvent(event)
    }
  }
  return lastAnimationValues
}

export const DetailsComponent = ({
  id,
  summary,
  children,
  defaultOpen,
}: DetailsComponentProps) => {
  const reduceMotion = useReducedMotion()
  const [animating, setAnimating] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(defaultOpen ?? false)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const chevronRef = useRef<HTMLButtonElement>(null)

  /**
   * Toggle the details open / close, optionally animating the transition
   */
  const toggleOpen = useCallback(
    (animate = true) => {
      const details = detailsRef.current
      const content = contentRef.current
      setOpen((open) => {
        if (!reduceMotion && details && content && animate) {
          animateOpenClose(details, content, setAnimating, !open)
        }
        return !open
      })
    },
    [reduceMotion]
  )

  useEffect(() => {
    const details = detailsRef.current
    if (details) {
      const handleToggle = () => {
        if (open !== details.open) {
          toggleOpen(false)
        }
      }
      details.addEventListener("toggle", handleToggle)
      return () => {
        details.removeEventListener("toggle", handleToggle)
      }
    }
  }, [open, toggleOpen])

  /**
   * Target custom event handler, specific to the DetailsComponent
   * (main logic is handled by the bullet)
   */
  // useEffect(() => {
  //   const node = nodeRef.current
  //   const handleTarget: EventListener = () => {
  //     // If the details isn't opened, we want to open it,
  //     // We animate the opening only if it does not have a collapsed ancestor
  //     if (!open) {
  //       const collapsedAncestor = getCollapsedAncestor(node)
  //       toggleOpen(!collapsedAncestor)
  //     }
  //   }
  //   // Register handler
  //   if (node) {
  //     node.addEventListener("target", handleTarget)
  //     return () => {
  //       node.removeEventListener("target", handleTarget)
  //     }
  //   }
  // }, [nodeRef, open, toggleOpen])

  /**
   * Computed values for render
   */

  // The current aria label based on the collapsed state
  const ariaLabel = open ? "collapse details" : "expand details"

  // The html id for the details content (used for aria-controls)
  const contentId = `${id}-content`

  // Clicking the chevron toggles the collapsed state
  const chevronClickHandler: MouseEventHandler<HTMLElement> = (event) => {
    event.preventDefault()
    toggleOpen()
  }

  const detailsOpen = open || animating

  return (
    <details
      ref={detailsRef}
      open={detailsOpen}
      className={detailsStyles.details}
    >
      <summary className={detailsStyles.summary} onClick={chevronClickHandler}>
        <span
          ref={chevronRef}
          className={detailsStyles.chevron}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={contentId}
          role={"button"}
        />
        {summary}
      </summary>
      <div ref={contentRef} className={detailsStyles.content} id={contentId}>
        {children}
      </div>
    </details>
  )
}
