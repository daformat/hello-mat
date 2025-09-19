import React, {
  CSSProperties,
  Dispatch,
  MouseEventHandler,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import detailsStyles from "./DetailsComponent.module.scss"
import { useReducedMotion } from "../../hooks/useReducedMotion"

/**
 * This component is a WORK IN PROGRESS
 * still needs some polishing and bug fixes
 */

export type DetailsComponentProps = {
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  animationSpeed?: number
}

/**
 * Values from a previously canceled animation if any
 */
type AnimationValues = {
  height: number | null
  opacity: number | null
  elapsed: number
  maskSize: string | null
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
  if (!animation.effect || animation.currentTime === null) {
    console.log("no effect or currentTime", {
      effect: animation.effect,
      currentTime: animation.currentTime,
    })
    return null
  }
  const effect = animation.effect as KeyframeEffect
  const duration = effect.getTiming().duration as number
  const currentTime = animation.currentTime as number
  return Math.max(0, duration - currentTime)
}

/**
 * Returns the derived mask size for the given opacity and opening state
 * @param opacity
 * @param opening
 */
const calculateActualMaskSize = (opacity: number, opening: boolean) => {
  if (opening) {
    // previous animation was closing: mask changes only in the first 25%
    if (opacity >= 0.75) {
      // mask was transitioning: interpolate between 200% and 100%
      // 0 to 1 over 1 -> 0.75 opacity range
      const progress = (1.0 - opacity) / 0.25
      const maskSizeY = 200 - 100 * progress
      return `100% ${maskSizeY}%`
    } else {
      return "100% 100%"
    }
  } else {
    // previous animation was opening: mask changes only in the last 25%
    if (opacity <= 0.75) {
      return "100% 100%"
    } else {
      // 0 to 1 over 0.75 -> 1 opacity range
      const progress = (opacity - 0.75) / 0.25
      const maskSizeY = 100 + 100 * progress
      return `100% ${maskSizeY}%`
    }
  }
}

/**
 * Returns the adjusted offset for the mask animation
 * @param startOpacity
 * @param endOpacity
 * @param opening
 */
const calculateAdjustedOffset = (
  startOpacity: number,
  endOpacity: number,
  opening: boolean
) => {
  if (opening) {
    // opening: mask should change during the last 25% of the opacity transition
    const opacityRange = endOpacity - startOpacity // e.g., 0.3 to 1.0 = 0.7 range
    const maskTransitionStart = Math.max(
      0,
      (0.75 - startOpacity) / opacityRange
    )
    return Math.min(0.75, maskTransitionStart)
  } else {
    // closing: mask should change during the first 25% of the opacity transition
    const opacityRange = startOpacity - endOpacity // e.g., 0.8 to 0.0 = 0.8 range
    const maskTransitionEnd = Math.min(1, (startOpacity - 0.75) / opacityRange)
    return Math.max(0.25, maskTransitionEnd)
  }
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
  // mask image
  const maskImage = "linear-gradient(180deg, black, black 50%, transparent)"
  const startMaskSize = calculateActualMaskSize(startOpacity, opening)
  const endMaskSize = opening ? "100% 200%" : "100% 100%"
  const keyframes: Keyframe[] = [
    {
      maskImage,
      maskSize: startMaskSize,
    },
    {
      maskImage,
      maskSize: opening ? startMaskSize : endMaskSize,
      offset: calculateAdjustedOffset(startOpacity, endOpacity, opening),
    },
    {
      maskImage,
      maskSize: endMaskSize,
    },
  ]
  content.animate(keyframes, contentAnimationOptions)
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
 * type guard to check if a value is not undefined
 */
const isDefined = <T,>(value: T | undefined): value is T => {
  return value !== undefined
}

/**
 * type guard to check if a value is not null
 */
const isNotNull = <T,>(value: T | null): value is T => {
  return value !== null
}

/**
 * type guard to check if a value is not null and not undefined
 * @param value
 */
const isNonNullbable = <T,>(value: T): value is NonNullable<T> => {
  return isDefined(value) && isNotNull(value)
}

/**
 * Animate open and closing the details component
 * @param details
 * @param content
 * @param setAnimating
 * @param newOpen
 * @param animationSpeed
 */
function animateOpenClose(
  details: HTMLDetailsElement,
  content: HTMLDivElement,
  setAnimating: Dispatch<SetStateAction<boolean>>,
  newOpen: boolean,
  animationSpeed: number
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
      return acc + delta
    }
    return 0
  }, 0)
  const innerDeltasAnimations = Array.from(innerDeltasElements).map((element) =>
    element.getAnimations()
  )
  const innerDeltasAnimationsRemainingTime = innerDeltasAnimations.map(
    (animations) => animations.map(getRemainingTime)
  )
  const maxChildAnimationRemainingTime = Math.max(
    ...innerDeltasAnimationsRemainingTime.flat().filter(isNotNull)
  )
  const childAnimationRemainingTime =
    isFinite(maxChildAnimationRemainingTime) &&
    !isNaN(maxChildAnimationRemainingTime)
      ? maxChildAnimationRemainingTime
      : undefined

  console.log({
    innerDeltasElements,
    innerDeltasAnimations,
    innerDeltasAnimationsRemainingTime,
  })
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
  const delta = nextHeight - prevHeight
  const distanceToAnimate = Math.abs(delta)
  const contentHeight = detailsExpandedHeight + innerDeltas - summaryHeight
  const ratio = Math.min(distanceToAnimate / contentHeight, 1)
  const normalDuration = getAnimationDuration(0, contentHeight)
  const duration =
    parentAnimationsDuration ||
    Math.max(
      (inverseEaseInOut(ratio) * normalDuration) / animationSpeed,
      childAnimationRemainingTime ?? 0
    )
  details.dataset.targetSize = nextHeight.toString()
  details.dataset.targetOpen = newOpen.toString()

  console.log({
    details,
    newOpen,
    duration,
    normalDuration,
    lastAnimationValues,
    prevHeight,
    nextHeight,
    innerDeltas,
    detailsExpandedHeight,
    parentAnimationsDuration,
    ratio,
    distanceToAnimate,
  })

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
    maskSize: null,
  }
  for (const animation of animations) {
    animation.pause()
    const effect = animation.effect
    if (effect) {
      if (animation.currentTime && !lastAnimationValues.elapsed) {
        lastAnimationValues.elapsed = animation.currentTime
      }
      // get the last height / opacity for relevant animations
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
            const hasMaskSizeKeyframe = keyframes.some(
              (keyframe) => keyframe.maskSize !== undefined
            )
            if (hasMaskSizeKeyframe) {
              lastAnimationValues.maskSize = getComputedStyle(content).maskSize
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
  summary,
  children,
  defaultOpen,
  animationSpeed = 1,
}: DetailsComponentProps) => {
  const reduceMotion = useReducedMotion()
  const [animating, setAnimating] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(defaultOpen ?? false)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  /**
   * Toggle the details open / close, optionally animating the transition
   */
  const toggleOpen = useCallback(
    (animate = true) => {
      const details = detailsRef.current
      const content = contentRef.current
      setOpen((open) => {
        console.log("state toggle", open, "->", !open, details)
        if (!reduceMotion && details && content && animate) {
          console.log("state toggle animates")
          animateOpenClose(
            details,
            content,
            setAnimating,
            !open,
            animationSpeed
          )
          details.dispatchEvent(new Event("details-toggle", { bubbles: true }))
          delete details.dataset.pressed
        }
        return !open
      })
    },
    [animationSpeed, reduceMotion]
  )

  /**
   * Listen to the native toggle event to open the details when the content
   * is searched using the browser search feature (chromium-only)
   */
  useEffect(() => {
    const details = detailsRef.current
    if (details) {
      const handleToggle = () => {
        // state only differs in the case of a search
        if (open !== details.open) {
          console.log("native toggle", details)
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
   * Listen to our custom event, which we dispatch when the details is toggled
   * since the native toggle event doesn't bubble
   */
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
          console.log("custom toggle", details, { ...details.dataset })
          animateOpenClose(
            details,
            content,
            setAnimating,
            details.dataset.targetOpen === "true",
            animationSpeed
          )
        }
      }
      details.addEventListener("details-toggle", handleDetailsToggle)
      return () => {
        details.removeEventListener("details-toggle", handleDetailsToggle)
      }
    }
  }, [animationSpeed])

  /**
   * Computed values for render
   */

  // The current aria label based on the collapsed state
  const ariaLabel = open ? "collapse details" : "expand details"

  // The html id for the details content (used for aria-controls)
  const contentId = useId()

  // Clicking the summary toggles the details open / close
  const handleSummaryClick = useCallback<MouseEventHandler<HTMLElement>>(
    (event) => {
      event.preventDefault()
      toggleOpen()
    },
    [toggleOpen]
  )

  const detailsOpen = open || animating

  return (
    <details
      ref={detailsRef}
      open={detailsOpen}
      className={detailsStyles.details}
      style={{ "--animation-speed": `${animationSpeed}` } as CSSProperties}
    >
      <summary
        className={detailsStyles.summary}
        onClick={handleSummaryClick}
        onPointerDown={() => {
          if (detailsRef.current) {
            detailsRef.current.dataset.pressed = ""
          }
        }}
      >
        <span
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
