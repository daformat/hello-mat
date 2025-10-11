import {
  createContext,
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
}>({
  setRef: () => {},
  setScrollsBackwards: () => {},
  setScrollsForwards: () => {},
  scrollsBackwards: false,
  scrollsForwards: false,
  setRemainingForwards: () => {},
  setRemainingBackwards: () => {},
})

const CarouselRoot = ({ children }: PropsWithChildren) => {
  const [ref, setRef] = useState<MaybeNull<RefObject<HTMLElement>>>(null)
  const [scrollsBackwards, setScrollsBackwards] = useState(false)
  const [scrollsForwards, setScrollsForwards] = useState(false)
  const [remainingForwards, setRemainingForwards] = useState(0)
  const [remainingBackwards, setRemainingBackwards] = useState(0)
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
      }}
    >
      <div className={styles.carousel}>{children}</div>
    </CarouselContext.Provider>
  )
}

const CarouselViewport = ({
  snapsOnDrag,
  children,
}: PropsWithChildren<{ snapsOnDrag?: boolean }>) => {
  const {
    setRef,
    setScrollsBackwards,
    setScrollsForwards,
    scrollsForwards,
    scrollsBackwards,
    setRemainingForwards,
    setRemainingBackwards,
  } = useContext(CarouselContext)
  const containerRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => setRef(containerRef))

  const scrollStateRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    animationId: null as number | null,
  })

  const updateScrollState = useCallback(() => {
    const container = containerRef.current
    const containerScrollWidth = container?.scrollWidth ?? 0
    const containerOffsetWidth = container?.offsetWidth ?? 0
    const containerScrollLeft = container?.scrollLeft ?? 0
    if (!container || containerScrollWidth <= containerOffsetWidth) {
      setScrollsBackwards(false)
      setScrollsForwards(false)
    } else if (containerScrollLeft <= 0) {
      setScrollsBackwards(false)
      setScrollsForwards(true)
    } else if (
      Math.ceil(containerScrollLeft) <
      containerScrollWidth - containerOffsetWidth
    ) {
      setScrollsBackwards(true)
      setScrollsForwards(true)
    } else {
      setScrollsBackwards(true)
      setScrollsForwards(false)
    }
    if (container) {
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
    container.scrollLeft = state.scrollLeft + scrollDelta

    state.lastX = event.clientX
    state.lastTime = currentTime
  }

  const handleMomentumEnd = useCallback(() => {
    const container = containerRef.current
    if (container && snapsOnDrag) {
      const scrollLeft = container.scrollLeft
      if (isDesktopSafari()) {
        // Oh, safari! (doesn’t properly update scrollLeft upon snapping, so we
        // have to snap manually)
        const items = Array.from(
          container.querySelectorAll("[data-carousel-item]")
        ) as HTMLElement[]
        const containerOffsetLeft = container.offsetLeft
        const prevItems = items.filter(
          (item) => item.offsetLeft <= scrollLeft + containerOffsetLeft
        )
        const nextItems = items.filter(
          (item) => item.offsetLeft >= scrollLeft + containerOffsetLeft
        )
        const prevItem = prevItems[prevItems.length - 1]
        const nextItem = nextItems[0]
        let snapItem: MaybeUndefined<HTMLElement>
        if (prevItem && nextItem) {
          const prevItemLeftEdge = prevItem.offsetLeft - containerOffsetLeft
          const nextItemLeftEdge = nextItem.offsetLeft - containerOffsetLeft
          snapItem =
            Math.abs(scrollLeft - prevItemLeftEdge) <=
            Math.abs(nextItemLeftEdge - scrollLeft)
              ? prevItem
              : nextItem
        } else {
          snapItem = prevItem ?? nextItem
        }
        const delta = snapItem
          ? snapItem.offsetLeft - containerOffsetLeft - scrollLeft
          : 0
        container.scrollBy({
          left: delta,
          behavior: "smooth",
        })
      } else {
        // Other browsers play nicer
        container.style.scrollSnapType = ""
        const targetScrollLeft = container.scrollLeft
        container.style.scrollSnapType = "none"
        container.scrollLeft = scrollLeft
        container.scrollBy({
          left: targetScrollLeft - scrollLeft,
          behavior: "smooth",
        })
      }
      container.style.scrollSnapType = ""
    }
  }, [snapsOnDrag])

  const startMomentumAnimation = useCallback(() => {
    const state = scrollStateRef.current
    const friction = 0.05
    const decelerationFactor = 1 - friction
    const minVelocity = 0.01

    const animate = () => {
      const container = containerRef.current
      if (!container) {
        return
      }
      container.style.scrollSnapType = "none"
      container.scrollLeft -= state.velocityX * 16 // ~16ms frame time
      state.scrollLeft = container.scrollLeft
      state.velocityX *= decelerationFactor
      if (Math.abs(state.velocityX) > minVelocity) {
        state.animationId = requestAnimationFrame(animate)
      } else {
        state.animationId = null
        handleMomentumEnd()
      }
    }

    state.animationId = requestAnimationFrame(animate)
  }, [handleMomentumEnd])

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
      onWheel={(event) => {
        event.currentTarget.style.scrollSnapType = ""
      }}
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
  return <div className={styles.carousel_content}>{children}</div>
}

const CarouselItem = ({ children }: PropsWithChildren) => {
  return (
    <div data-carousel-item className={styles.carousel_item}>
      {children}
    </div>
  )
}

const CarouselNextPage = ({ children }: PropsWithChildren) => {
  const { ref: containerRef, scrollsForwards } = useContext(CarouselContext)

  // Scrolls the container to next slide until hitting max
  const handleScrollToNext = () => {
    const container = containerRef?.current
    if (container && container.scrollLeft < container.scrollWidth) {
      container.style.scrollSnapType = ""
      if (isIOSSafari()) {
        // iOS Safari doesn't respect snapping when using scrollBy, so we have
        // to manually scroll to the next item
        const items = Array.from(
          container.querySelectorAll("[data-carousel-item]")
        ) as HTMLElement[]
        const currentScroll = container.scrollLeft
        const containerOffsetLeft = container.offsetLeft
        const containerOffsetWidth = container.offsetWidth
        const nextItem =
          items.find(
            (child) =>
              child.offsetLeft + child.offsetWidth >
              currentScroll + containerOffsetWidth + containerOffsetLeft
          ) ?? items[items.length - 1]
        nextItem?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        })
      } else {
        container.scrollBy({ left: container.offsetWidth, behavior: "smooth" })
      }
    }
  }

  return (
    <button onClick={handleScrollToNext} disabled={!scrollsForwards}>
      {children}
    </button>
  )
}

const CarouselPrevPage = ({ children }: PropsWithChildren) => {
  const { ref: containerRef, scrollsBackwards } = useContext(CarouselContext)

  // Scrolls the container to previous slide until hitting 0
  const handleScrollToPrev = () => {
    const container = containerRef?.current
    if (container && container.scrollLeft > 0) {
      container.style.scrollSnapType = ""
      if (isIOSSafari()) {
        // iOS Safari doesn't respect snapping when using scrollBy, so we have
        // to manually scroll to the previous item
        const items = Array.from(
          container.querySelectorAll("[data-carousel-item]")
        ) as HTMLElement[]
        const containerOffsetLeft = container.offsetLeft
        const containerOffsetWidth = container.offsetWidth
        const currentScroll = container.scrollLeft
        const prevItem = items.find(
          (child) =>
            currentScroll - containerOffsetWidth + containerOffsetLeft <
            child.offsetLeft
        )
        prevItem?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        })
      } else {
        container.scrollBy({ left: -container.offsetWidth, behavior: "smooth" })
      }
    }
  }

  return (
    <button onClick={handleScrollToPrev} disabled={!scrollsBackwards}>
      {children}
    </button>
  )
}

const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
}

const isDesktopSafari = () => {
  const ua = navigator.userAgent
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  const isDesktop = !/iPhone|iPad|iPod|Android/i.test(ua)

  return isSafari && isDesktop
}

export const Carousel = {
  Root: CarouselRoot,
  Viewport: CarouselViewport,
  Content: CarouselContent,
  Item: CarouselItem,
  PrevPage: CarouselPrevPage,
  NextPage: CarouselNextPage,
}
