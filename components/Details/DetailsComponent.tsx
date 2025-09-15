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
  return Math.max(Math.min(duration, 350), 200)
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
  content.animate(
    [
      { opacity: startOpacity, height: `${prevHeight}px` },
      { opacity: endOpacity, height: `${nextHeight}px` },
    ],
    contentAnimationOptions
  )
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
 */
function animateOpenClose(
  details: HTMLDetailsElement,
  content: HTMLDivElement,
  setAnimating: Dispatch<SetStateAction<boolean>>
) {
  const summaryHeight =
    details.querySelector("summary")?.getBoundingClientRect().height ?? 0
  const animations = [...details.getAnimations(), ...content.getAnimations()]
  const lastAnimationValues = cancelAnimationsAndGetValues(
    animations,
    details,
    content
  )
  // First, measure, resume using last interrupted animation value if any
  let prevHeight = lastAnimationValues.height
  prevHeight = prevHeight ?? details.getBoundingClientRect().height
  details.open = !details.open
  const nextHeight = details.getBoundingClientRect().height
  details.open = !details.open
  // Animate content and details, accounting for previous animation elapsed time
  details.classList.add(detailsStyles.animating)
  let duration = getAnimationDuration(prevHeight, nextHeight)
  duration -= lastAnimationValues.elapsed
  // Animate content visibility
  const opening = prevHeight <= nextHeight
  animateContentVisibility(
    content,
    opening,
    duration,
    lastAnimationValues,
    prevHeight - summaryHeight,
    nextHeight - summaryHeight
  )
  // Animate details height
  console.log({ prevHeight, nextHeight, duration })
  const detailsAnimation = animateDetailsHeight(
    details,
    duration,
    prevHeight,
    nextHeight
  )
  // Handle animation end / cancel
  const reset = () => {
    // Make sure the handler can only be executed once, replace with no-op
    detailsAnimation.oncancel = detailsAnimation.onfinish = () => undefined
    setAnimating(false)
    details.classList.remove(detailsStyles.animating)
    if (!opening) {
      details.open = false
    }
  }
  detailsAnimation.oncancel = detailsAnimation.onfinish = reset
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
      // Use the first animation timing infos
      const { activeDuration, progress } = effect.getComputedTiming()
      if (activeDuration && progress && lastAnimationValues.elapsed) {
        lastAnimationValues.elapsed = activeDuration - progress * activeDuration
      }
      // Get the last height / opacity for relevant animations
      if (effect instanceof KeyframeEffect) {
        if (effect.target === details) {
          lastAnimationValues.height = details.getBoundingClientRect().height
        }
        if (effect.target === content) {
          lastAnimationValues.opacity = parseFloat(
            getComputedStyle(content).opacity
          )
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
  const toggleOpen = useCallback(() => {
    const details = detailsRef.current
    const content = contentRef.current
    // We do this hack to set the max-height only for animating
    if (!reduceMotion && details && content) {
      animateOpenClose(details, content, setAnimating)
    }
    setOpen((open) => !open)
  }, [reduceMotion])

  // useEffect(() => {
  //   const details = detailsRef.current
  //   if (details) {
  //     details.addEventListener("toggle", toggleOpen)
  //
  //     return () => {
  //       details.removeEventListener("toggle", toggleOpen)
  //     }
  //   }
  // }, [toggleOpen])

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

  // The derived class name for our pseudo details component
  const detailsClassName = `${detailsStyles.details} ${
    open ? "" : detailsStyles.collapsed
  } ${animating ? detailsStyles.animating : ""}`

  // Clicking the chevron toggles the collapsed state
  const chevronClickHandler: MouseEventHandler<HTMLElement> = (event) => {
    event.preventDefault()
    toggleOpen()
  }

  const detailsOpen = open || animating
  console.log({ open, animating, detailsOpen })
  /**
   * Render
   */
  return (
    <details className={detailsClassName} ref={detailsRef} open={detailsOpen}>
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
