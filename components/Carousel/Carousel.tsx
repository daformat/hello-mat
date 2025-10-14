import {
  ComponentPropsWithoutRef,
  ContextType,
  createContext,
  CSSProperties,
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import styles from "./Carousel.module.scss"
import { MaybeNull, MaybeUndefined } from "@/components/Media/utils/maybe"

type ScrollState = {
  isDragging: boolean
  startX: number
  scrollLeft: number
  lastX: number
  lastTime: number
  velocityX: number
  animationId: number | null
  initialTarget: MaybeNull<EventTarget>
  initialPointerPosition: MaybeNull<{
    x: number
    y: number
  }>
  initialMouseScrollLeft: number
  mouseDirection: number
  mouseScrollLeft: number
}

const CarouselContext = createContext<{
  ref?: MaybeNull<RefObject<HTMLElement>>
  setRef: (ref: MaybeNull<RefObject<HTMLElement>>) => void
  scrollsBackwards: boolean
  scrollsForwards: boolean
  setScrollsBackwards: (scrollsBackwards: boolean) => void
  setScrollsForwards: (scrollsForwards: boolean) => void
  remainingForwards?: number
  remainingBackwards?: number
  setRemainingForwards: (remainingForwards: number) => void
  setRemainingBackwards: (remainingBackwards: number) => void
  scrollStateRef?: MaybeUndefined<RefObject<ScrollState>>
  setScrollStateRef: (state: RefObject<ScrollState>) => void
  boundaryOffset?:
    | { x: number; y: number }
    | ((root: HTMLElement) => { x: number; y: number })
  rootRef: RefObject<HTMLElement>
}>({
  setRef: () => {},
  setScrollsBackwards: () => {},
  setScrollsForwards: () => {},
  scrollsBackwards: false,
  scrollsForwards: false,
  setRemainingForwards: () => {},
  setRemainingBackwards: () => {},
  setScrollStateRef: () => {},
  rootRef: { current: null },
})

const CarouselRoot = ({
  boundaryOffset,
  children,
  className,
  ...props
}: PropsWithChildren<
  {
    boundaryOffset?:
      | { x: number; y: number }
      | ((root: HTMLElement) => { x: number; y: number })
  } & ComponentPropsWithoutRef<"div">
>) => {
  const [ref, setRef] = useState<MaybeNull<RefObject<HTMLElement>>>(null)
  const [scrollsBackwards, setScrollsBackwards] = useState(false)
  const [scrollsForwards, setScrollsForwards] = useState(false)
  const [remainingForwards, setRemainingForwards] = useState(0)
  const [remainingBackwards, setRemainingBackwards] = useState(0)
  const [scrollStateRef, setScrollStateRef] =
    useState<MaybeUndefined<RefObject<ScrollState>>>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)

  return (
    <CarouselContext.Provider
      value={{
        ref,
        setRef,
        scrollsBackwards,
        scrollsForwards,
        setScrollsBackwards,
        setScrollsForwards,
        remainingForwards,
        remainingBackwards,
        setRemainingForwards,
        setRemainingBackwards,
        scrollStateRef,
        setScrollStateRef,
        boundaryOffset,
        rootRef,
      }}
    >
      <div
        ref={rootRef}
        className={[styles.carousel, className].filter(Boolean).join(" ")}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

const CarouselViewport = ({ children }: PropsWithChildren) => {
  const {
    setRef,
    setScrollsBackwards,
    setScrollsForwards,
    scrollsForwards,
    scrollsBackwards,
    setRemainingForwards,
    setRemainingBackwards,
    setScrollStateRef,
  } = useContext(CarouselContext)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollStateRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    animationId: null as number | null,
    initialTarget: null as MaybeNull<EventTarget>,
    initialPointerPosition: null as MaybeNull<{ x: number; y: number }>,
    initialMouseScrollLeft: 0,
    mouseDirection: 0,
    mouseScrollLeft: 0,
  })

  useLayoutEffect(() => {
    setRef(containerRef)
    setScrollStateRef(scrollStateRef)
  }, [setRef, setScrollStateRef])

  const updateScrollState = useCallback(() => {
    const container = containerRef.current
    if (container) {
      const containerScrollWidth = container.scrollWidth ?? 0
      const containerOffsetWidth = container.offsetWidth ?? 0
      const containerScrollLeft = container.scrollLeft ?? 0
      if (!container || containerScrollWidth <= containerOffsetWidth) {
        setScrollsBackwards(false)
        setScrollsForwards(false)
      } else if (containerScrollLeft <= 0) {
        setScrollsBackwards(false)
        setScrollsForwards(true)
      } else if (
        Math.ceil(containerScrollLeft) <
        containerScrollWidth - containerOffsetWidth - 1
      ) {
        setScrollsBackwards(true)
        setScrollsForwards(true)
      } else {
        setScrollsBackwards(true)
        setScrollsForwards(false)
      }
      const remainingBackwards = containerScrollLeft
      const remainingForwards =
        containerScrollWidth - containerScrollLeft - containerOffsetWidth
      setRemainingForwards(remainingForwards)
      setRemainingBackwards(remainingBackwards)
      container.style.setProperty(
        "--remaining-forwards",
        `${remainingForwards}px`
      )
      container.style.setProperty(
        "--remaining-backwards",
        `${remainingBackwards}px`
      )
    }
  }, [
    setRemainingBackwards,
    setRemainingForwards,
    setScrollsBackwards,
    setScrollsForwards,
  ])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (container) {
      const resizeObserver = new ResizeObserver(updateScrollState)
      const mutationObserver = new MutationObserver(updateScrollState)
      resizeObserver.observe(container)
      mutationObserver.observe(container, {
        attributes: true,
        childList: true,
        subtree: true,
      })
      container.addEventListener("scroll", updateScrollState)
      updateScrollState()
      return () => {
        resizeObserver.disconnect()
        mutationObserver.disconnect()
        container.removeEventListener("scroll", updateScrollState)
      }
    }
  }, [updateScrollState])

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)

    const state = scrollStateRef.current
    if (state.animationId !== null) {
      cancelAnimationFrame(state.animationId)
      state.animationId = null
    }

    const container = containerRef.current
    state.isDragging = true
    state.startX = event.clientX
    state.lastX = event.clientX
    state.scrollLeft = container?.scrollLeft ?? 0
    state.lastTime = Date.now()
    state.velocityX = 0
    state.initialTarget = event.target
    state.initialPointerPosition = { x: event.clientX, y: event.clientY }
    state.initialMouseScrollLeft = container?.scrollLeft ?? 0
    event.preventDefault()
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    const container = containerRef.current
    const state = scrollStateRef.current
    if (!state.isDragging || !container || event.pointerType !== "mouse") {
      return
    }

    container.style.scrollSnapType = "none"
    const currentTime = Date.now()
    const deltaTime = currentTime - state.lastTime
    const deltaX = event.clientX - state.lastX
    if (deltaTime > 0) {
      state.velocityX = deltaX / deltaTime // (pixels per millisecond)
    }

    // update scroll position
    const scrollDelta = state.startX - event.clientX
    const direction = Math.sign(
      state.scrollLeft + scrollDelta - state.mouseScrollLeft
    )
    if (direction !== state.mouseDirection) {
      state.mouseDirection = direction
      state.initialMouseScrollLeft = state.scrollLeft + scrollDelta
    }
    container.scrollLeft = state.scrollLeft + scrollDelta
    state.mouseScrollLeft = state.scrollLeft + scrollDelta
    state.lastX = event.clientX
    state.lastTime = currentTime
    if (
      container.scrollLeft <= 1 ||
      container.scrollLeft >= container.scrollWidth - container.offsetWidth - 1
    ) {
      const items = container.querySelectorAll("[data-carousel-item]")
      const maxDistance = container.offsetWidth / 3
      const maxScrollLeft = container.scrollWidth - container.offsetWidth
      const targetScrollLeft = state.scrollLeft + scrollDelta
      const overscroll =
        targetScrollLeft < 0
          ? Math.abs(targetScrollLeft)
          : targetScrollLeft > maxScrollLeft
          ? targetScrollLeft - maxScrollLeft
          : 0
      const sign = Math.sign(scrollDelta)
      const easedDistance = iOSRubberBand(overscroll, 0, maxDistance)
      items.forEach((item) => {
        if (item instanceof HTMLElement) {
          item.style.translate = `${-sign * easedDistance}px 0`
        }
      })

      state.velocityX = (-sign * easedDistance) / 50
    }
  }

  const startMomentumAnimation = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const state = scrollStateRef.current
    const isRubberBanding =
      container.scrollLeft <= 1 ||
      container.scrollLeft >= container.scrollWidth - container.offsetWidth - 1
    const rubberBandingFactor = isRubberBanding
      ? (state.velocityX * 50) / container.scrollWidth
      : 0
    const friction = 0.05 + Math.abs(rubberBandingFactor)
    let decelerationFactor = 1 - friction
    const minVelocity = 0.01

    const x = Math.abs(
      Math.log(minVelocity / Math.abs(state.velocityX)) /
        Math.log(decelerationFactor)
    )
    const initialScroll = container.scrollLeft
    const tFinalScroll = Math.max(
      Math.min(
        Array(Math.ceil(isFinite(x) ? x : 0))
          .fill(0)
          .reduce((acc, val, i) => {
            return acc - state.velocityX * Math.pow(decelerationFactor, i) * 16
          }, initialScroll),
        container.scrollWidth - container.offsetWidth
      ),
      0
    )
    if (
      tFinalScroll < container.scrollWidth - container.offsetWidth &&
      tFinalScroll > 0
    ) {
      container.scrollLeft = tFinalScroll
      container.style.scrollSnapType = ""
      const snapedScroll = container.scrollLeft
      container.style.scrollSnapType = "none"
      container.scrollLeft = initialScroll
      decelerationFactor = findDecelerationFactor(
        container.scrollLeft,
        state.velocityX,
        snapedScroll
      )
    }

    const animate = () => {
      const container = containerRef.current
      if (!container) {
        return
      }
      container.style.scrollSnapType = "none"
      container.scrollLeft -= state.velocityX * 16 // ~16ms frame time
      state.scrollLeft = container.scrollLeft
      state.velocityX *= decelerationFactor

      const newScrollLeft = container.scrollLeft
      const scrollWidth = container.scrollWidth
      const offsetWidth = container.offsetWidth
      // const maxScrollLeft = scrollWidth - offsetWidth
      const remainingForwards = scrollWidth - offsetWidth - newScrollLeft
      const remainingBackwards = newScrollLeft

      // Overscroll
      const content = container.querySelector("[data-carousel-content]")
      if (content instanceof HTMLElement) {
        // const startScroll = state.initialMouseScrollLeft
        if (
          Math.abs(state.velocityX) > minVelocity &&
          (remainingForwards <= 1 || remainingBackwards < 1)
        ) {
          const theoreticalTranslate = state.velocityX * 50
          const currentTranslate = parseFloat(content.style.translate || "0")
          const delta = theoreticalTranslate - currentTranslate
          const items = content.querySelectorAll("[data-carousel-item]")
          // we have to translate the items instead of the content because
          // Safari scrolls the viewport if the content is translated
          items.forEach((item) => {
            if (item instanceof HTMLElement) {
              item.style.translate = `${delta / 2}px 0`
            }
          })
          state.velocityX *= decelerationFactor
        }
      }

      if (Math.abs(state.velocityX) > minVelocity) {
        state.animationId = requestAnimationFrame(animate)
      } else {
        state.animationId = null
      }
    }

    state.animationId = requestAnimationFrame(animate)
  }, [])

  const handlePointerUp = useCallback(
    (event: React.PointerEvent | PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return
      }
      const container = containerRef.current
      if ("pointerId" in event) {
        container?.releasePointerCapture(event.pointerId)
      }
      const state = scrollStateRef.current
      if (!state.isDragging || !container) {
        return
      }
      // dispatch click if needed (we prevented it on pointer down)
      if (
        state.initialPointerPosition &&
        Math.hypot(
          state.initialPointerPosition.x - event.clientX,
          state.initialPointerPosition.y - event.clientY
        ) < 3
      ) {
        state.initialTarget?.dispatchEvent(
          new PointerEvent("click", { bubbles: true })
        )
      }
      state.initialTarget = null
      state.initialPointerPosition = null
      state.isDragging = false
      startMomentumAnimation()
    },
    [startMomentumAnimation]
  )

  useEffect(() => {
    document.addEventListener("pointerup", handlePointerUp)
    return () => {
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

  return (
    <div
      ref={containerRef}
      className={styles.carousel_viewport}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClickCapture={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onWheel={(event) => {
        event.currentTarget.style.scrollSnapType = ""
      }}
      data-carousel-viewport={""}
      data-can-scroll={
        scrollsForwards && scrollsBackwards
          ? "both"
          : scrollsForwards
          ? "forwards"
          : scrollsBackwards
          ? "backwards"
          : "none"
      }
    >
      {children}
    </div>
  )
}

const CarouselContent = ({ children }: PropsWithChildren) => {
  return (
    <div data-carousel-content className={styles.carousel_content}>
      {children}
    </div>
  )
}

const CarouselItem = ({ children }: PropsWithChildren) => {
  return (
    <div data-carousel-item className={styles.carousel_item}>
      {children}
    </div>
  )
}

const CarouselNextPage = ({ children }: PropsWithChildren) => {
  const {
    ref: containerRef,
    scrollsForwards,
    scrollStateRef,
    rootRef,
    boundaryOffset,
  } = useContext(CarouselContext)

  // Scrolls the container to next slide until hitting max
  const handleScrollToNext = () => {
    cancelAnimationFrame(scrollStateRef?.current?.animationId ?? 0)
    const container = containerRef?.current
    const root = rootRef?.current
    if (root && container && container.scrollLeft < container.scrollWidth) {
      container.style.scrollSnapType = ""
      const items = Array.from(
        container.querySelectorAll("[data-carousel-item]")
      ) as HTMLElement[]
      const currentScroll = container.scrollLeft
      const containerOffsetWidth = container.offsetWidth
      const { x: boundaryOffsetX } = getBoundaryOffset(boundaryOffset, root)
      const isNextItem = (item: HTMLElement) => {
        return (
          item.offsetLeft + item.offsetWidth >
          Math.ceil(currentScroll + containerOffsetWidth - boundaryOffsetX)
        )
      }
      const nextItem = items.find(isNextItem) ?? items[items.length - 1]
      const [_, inline] = getScrollSnapAlign(getComputedStyle(nextItem))
      nextItem?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: ["start", "center", "end"].includes(inline ?? "")
          ? (inline as ScrollLogicalPosition)
          : "start",
      })
    }
  }

  return (
    <button
      className={styles.button}
      onClick={handleScrollToNext}
      disabled={!scrollsForwards}
    >
      {children}
    </button>
  )
}

const CarouselPrevPage = ({ children }: PropsWithChildren) => {
  const {
    ref: containerRef,
    scrollsBackwards,
    scrollStateRef,
    rootRef,
    boundaryOffset,
  } = useContext(CarouselContext)

  // Scrolls the container to previous slide until hitting 0
  const handleScrollToPrev = () => {
    cancelAnimationFrame(scrollStateRef?.current?.animationId ?? 0)
    const container = containerRef?.current
    const root = rootRef?.current
    if (root && container && container.scrollLeft > 0) {
      container.style.scrollSnapType = ""
      const items = Array.from(
        container.querySelectorAll("[data-carousel-item]")
      ) as HTMLElement[]
      const currentScroll = container.scrollLeft
      const { x: boundaryOffsetX } = getBoundaryOffset(boundaryOffset, root)
      const isPrevItem = (item: HTMLElement) => {
        return currentScroll > item.offsetLeft - boundaryOffsetX
      }
      const prevItems = items.filter(isPrevItem)
      const prevItem = prevItems[prevItems.length - 1] ?? items[0]
      if (prevItem) {
        const [_, inline] = getScrollSnapAlign(getComputedStyle(prevItem))
        prevItem?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: inline === "center" ? "center" : "end",
        })
      }
    }
  }

  return (
    <button
      // ref={ref}
      className={styles.button}
      onClick={handleScrollToPrev}
      disabled={!scrollsBackwards}
    >
      {children}
    </button>
  )
}

// const isIOSSafari = (): boolean => {
//   const ua = navigator.userAgent
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
// }

// const isDesktopSafari = () => {
//   const ua = navigator.userAgent
//   const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
//   const isDesktop = !/iPhone|iPad|iPod|Android/i.test(ua)
//
//   return isSafari && isDesktop
// }

const getBoundaryOffset = (
  boundaryOffset: ContextType<typeof CarouselContext>["boundaryOffset"],
  root: HTMLElement
) => {
  return typeof boundaryOffset === "function"
    ? boundaryOffset(root)
    : boundaryOffset ?? { x: 0, y: 0 }
}

const getScrollSnapAlign = (computedStyle: MaybeNull<CSSStyleDeclaration>) => {
  if (computedStyle) {
    const scrollSnapAlign = computedStyle
      .getPropertyValue("scroll-snap-align")
      .split(" ")
    const [block, inline] = scrollSnapAlign
    if (block && inline) {
      return [block, inline] as CSSProperties["scrollSnapAlign"][]
    } else if (block) {
      return [block, block] as CSSProperties["scrollSnapAlign"][]
    }
  }
  return [] as CSSProperties["scrollSnapAlign"][]
}

const findDecelerationFactor = (
  initialScroll: number,
  velocity: number,
  targetScroll: number
) => {
  const minVelocity = 0.01
  const totalDistance = targetScroll - initialScroll

  // If distance is too small, return default factor
  if (Math.abs(totalDistance) < 1) {
    return 0.95
  }

  // Binary search for the deceleration factor
  let low = 0.5 // Lower bound (more friction)
  let high = 0.999 // Upper bound (less friction)
  const tolerance = 1 // 1px tolerance
  const maxIterations = 50

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const testFactor = (low + high) / 2

    // Calculate number of frames until velocity reaches minVelocity
    const x = Math.log(minVelocity / Math.abs(velocity)) / Math.log(testFactor)

    // Invalid calculation, adjust bounds
    if (!isFinite(x) || x < 0) {
      high = testFactor
      continue
    }

    // Calculate final scroll with this factor
    // -> sum of geometric series: initial + v*r^0 + v*r^1 + ... + v*r^(n-1)
    let calculatedScroll = initialScroll
    for (let i = 0; i < Math.ceil(x); i++) {
      calculatedScroll -= velocity * Math.pow(testFactor, i) * 16
    }

    // Close enough?
    const error = calculatedScroll - targetScroll
    if (Math.abs(error) < tolerance) {
      return testFactor
    }

    if (velocity < 0) {
      // Scrolling right, calculatedScroll increases
      if (calculatedScroll > targetScroll) {
        high = testFactor
      } else {
        low = testFactor
      }
    } else {
      // Scrolling left, calculatedScroll decreases
      if (calculatedScroll < targetScroll) {
        high = testFactor
      } else {
        low = testFactor
      }
    }
  }

  // Return default factor if we didn't find a good one
  return 0.95
}

const iOSRubberBand = (translation: number, ratio: number, dimension = 1) => {
  const constant = 0.55
  const easedValue =
    (1 - 1 / ((translation * constant) / dimension + 1)) * dimension
  return easedValue * (1 - ratio)
}

export const Carousel = {
  Root: CarouselRoot,
  Viewport: CarouselViewport,
  Content: CarouselContent,
  Item: CarouselItem,
  PrevPage: CarouselPrevPage,
  NextPage: CarouselNextPage,
}
