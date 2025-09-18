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
 * Computes the inverse of the ease-in-out easing function, that is, finds t
 * for a given eased value
 * @param easedValue
 */
const inverseEaseInOut = (easedValue: number) => {
  if (easedValue < 0.5) {
    return Math.sqrt(easedValue / 2)
  } else {
    return 1 - Math.sqrt((1 - easedValue) / 2)
  }
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
  const speed = 5 // pixels / frame
  const min = Math.min(before, after)
  const max = Math.max(before, after)
  const duration = ((max - min) / speed) * frameDuration
  return Math.max(Math.min(duration, 400), 200)
}

/**
 * Returns the remaining time for the given animation
 * @param animation
 */
const getRemainingTime = (animation: Animation) => {
  if (!animation.effect || !animation.currentTime) {
    return null
  }
  const effect = animation.effect as KeyframeEffect
  const duration = effect.getTiming().duration as number
  const currentTime = animation.currentTime as number
  return Math.max(0, duration - currentTime)
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
  // opacity and height
  content.animate(
    [
      { opacity: startOpacity, height: `${prevHeight}px`, overflow: "hidden" },
      { opacity: endOpacity, height: `${nextHeight}px`, overflow: "hidden" },
    ],
    contentAnimationOptions
  )

  const remainingRatio = opening ? 1 : startOpacity

  // mask image
  const keyframes: Keyframe[] = [
    {
      maskImage: "linear-gradient(180deg, black, black 50%, transparent)",
      maskSize: `100% ${100 + 100 * remainingRatio}%`,
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

  // console.log({ keyframes, remainingRatio })
  content.animate(
    opening ? keyframes.reverse() : keyframes,
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
  const innerDeltasElements = details.querySelectorAll("[data-target-size]")
  const innerDeltas = Array.from(innerDeltasElements).reduce((acc, element) => {
    if (element instanceof HTMLElement) {
      const targetSize = parseFloat(element.dataset.targetSize ?? "0")
      const elementHeight = element.getBoundingClientRect().height
      const delta = isNaN(targetSize) ? 0 : targetSize - elementHeight
      // console.log({
      //   element,
      //   dataset: { ...element.dataset },
      //   targetSize,
      //   elementHeight,
      //   delta,
      // })
      return acc + delta
    }
    return 0
  }, 0)
  // resume from last value if any, otherwise measure details
  const prevHeight =
    lastAnimationValues.height ?? details.getBoundingClientRect().height
  // measure total expanded height
  const prevOpen = details.open
  details.open = true
  const detailsExpandedHeight = details.getBoundingClientRect().height
  details.open = prevOpen
  // if the details tag is closing, then the final height is the summary height
  // if opening, then the final height is the fully expanded details height
  const nextHeight = newOpen
    ? detailsExpandedHeight + innerDeltas
    : summaryHeight

  details.dataset.animating = ""
  if (!newOpen) {
    details.dataset.closing = ""
  }
  // Animate content and details, accounting for previous animation elapsed time
  const animatingParent = details.parentElement?.closest("[data-animating]")
  const parentAnimations = animatingParent?.getAnimations()
  const parentAnimationsDuration =
    parentAnimations?.map(getRemainingTime).find((t) => t) ?? 0
  // console.log({ animatingParent, parentAnimations, parentAnimationsDuration })
  const delta = nextHeight - prevHeight
  const distanceToAnimate = Math.abs(delta)
  const contentHeight = detailsExpandedHeight + innerDeltas - summaryHeight
  const ratio = Math.min(distanceToAnimate / contentHeight, 1)
  const normalDuration = getAnimationDuration(0, contentHeight)
  const duration =
    parentAnimationsDuration || inverseEaseInOut(ratio) * normalDuration
  // console.log({
  //   details,
  //   innerDeltasElements,
  //   ratio,
  //   delta,
  //   distanceToAnimate,
  //   contentHeight,
  //   normalDuration,
  //   animatingParent,
  //   parentAnimations,
  //   parentAnimationsDuration,
  //   inverseEaseInOut: inverseEaseInOut(ratio) * normalDuration,
  //   duration,
  //   prevHeight,
  //   nextHeight,
  //   detailsExpandedHeight,
  //   innerDeltas,
  // })
  details.dataset.targetSize = nextHeight.toString()
  details.dataset.targetOpen = newOpen.toString()
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
    delete details.dataset.animating
    delete details.dataset.closing
    delete details.dataset.targetSize
    delete details.dataset.targetOpen
    setAnimating(false)
  }
  const finish = () => {
    if (!newOpen) {
      // console.log("finish details", details)
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
        // console.log("elapsed", animation.currentTime)
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
          details.dispatchEvent(new Event("details-toggle", { bubbles: true }))
          delete details.dataset.pressed
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
        } else if (details.open) {
          // details.dispatchEvent(new Event("details-toggle", { bubbles: true }))
        }
      }
      details.addEventListener("toggle", handleToggle)
      return () => {
        details.removeEventListener("toggle", handleToggle)
      }
    }
  }, [open, toggleOpen])

  useEffect(() => {
    const details = detailsRef.current
    const content = contentRef.current
    if (details && content) {
      const handleDetailsToggle: EventListener = (event) => {
        if (
          event.target !== event.currentTarget &&
          details.dataset.animating === "" &&
          details.dataset.targetOpen
        ) {
          animateOpenClose(
            details,
            content,
            setAnimating,
            details.dataset.targetOpen === "true"
          )
        }
      }
      details.addEventListener("details-toggle", handleDetailsToggle)
      return () => {
        details.removeEventListener("details-toggle", handleDetailsToggle)
      }
    }
  })
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
      <summary
        className={detailsStyles.summary}
        onClick={chevronClickHandler}
        onPointerDown={() => {
          if (detailsRef.current) {
            detailsRef.current.dataset.pressed = ""
          }
        }}
      >
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
      <div
        ref={contentRef}
        className={detailsStyles.content}
        id={contentId}
        data-content={""}
      >
        {children}
      </div>
    </details>
  )
}
