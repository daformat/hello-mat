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
import { MaybeNull } from "@/components/Media/utils/maybe"

const CarouselContext = createContext<{
  ref?: MaybeNull<RefObject<HTMLElement>>
  setRef: (ref: MaybeNull<RefObject<HTMLElement>>) => void
}>({ setRef: () => {} })

const CarouselRoot = ({ children }: PropsWithChildren) => {
  const [ref, setRef] = useState<MaybeNull<RefObject<HTMLElement>>>(null)
  return (
    <CarouselContext.Provider value={{ ref, setRef }}>
      <div className={styles.carousel}>{children}</div>
    </CarouselContext.Provider>
  )
}

const CarouselViewport = ({ children }: PropsWithChildren) => {
  const { setRef } = useContext(CarouselContext)
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

  const handlePointerDown = (event: React.PointerEvent) => {
    console.log("down")
    if (event.pointerType !== "mouse") {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    // stateRef.current.isDown = true
    // stateRef.current.downPosition = { x: event.clientX, y: event.clientY }
    // stateRef.current.lastPointer = { x: event.clientX, y: event.clientY }
    // stateRef.current.timestamp = event.timeStamp

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

    container.style.scrollSnapType = "initial"
    const currentTime = Date.now()
    const deltaTime = currentTime - state.lastTime
    const deltaX = event.clientX - state.lastX

    // Calculate velocity (pixels per millisecond)
    if (deltaTime > 0) {
      state.velocityX = deltaX / deltaTime
    }

    // Update scroll position
    const scrollDelta = state.startX - event.clientX
    container.scrollLeft = state.scrollLeft + scrollDelta

    state.lastX = event.clientX
    state.lastTime = currentTime
  }

  const handlePointerUp = useCallback(
    (event: React.PointerEvent | PointerEvent) => {
      console.log("up")
      if (event.pointerType !== "mouse") {
        return
      }
      const container = containerRef.current
      if ("pointerId" in event) {
        container?.releasePointerCapture(event.pointerId)
      }
      const state = scrollStateRef.current
      if (!state.isDragging || !container) {
        console.log("up return")
        return
      }
      state.isDragging = false

      // Start momentum animation if velocity is significant
      if (Math.abs(state.velocityX) > 0.1) {
        console.log("momentum", state.velocityX)
        startMomentumAnimation()
      } else {
        console.log("not momentum", state.velocityX)
        container.style.scrollSnapType = ""
      }
    },
    []
  )

  useEffect(() => {
    document.addEventListener("pointerup", handlePointerUp)
    return () => {
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }, [])

  const startMomentumAnimation = () => {
    const state = scrollStateRef.current
    const friction = 0.95 // Deceleration factor (0-1, closer to 1 = longer momentum)
    const minVelocity = 0.1 // Stop when velocity is very small

    const animate = () => {
      const container = containerRef.current
      if (!container) {
        return
      }
      console.log("animating")
      container.style.scrollSnapType = "initial"

      // Apply velocity to scroll position
      container.scrollLeft -= state.velocityX * 16 // Multiply by ~16ms frame time

      // Apply friction to slow down
      state.velocityX *= friction

      // Continue animation if velocity is still significant
      if (Math.abs(state.velocityX) > minVelocity) {
        state.animationId = requestAnimationFrame(animate)
      } else {
        state.animationId = null
        const scrollLeft = container.scrollLeft
        container.style.scrollSnapType = ""
        const targetScrollLeft = container.scrollLeft
        container.style.scrollSnapType = "initial"
        container.scrollLeft = scrollLeft
        container.scrollBy({
          left: targetScrollLeft - scrollLeft,
          behavior: "smooth",
        })
        container.style.scrollSnapType = ""
      }
    }

    state.animationId = requestAnimationFrame(animate)
  }

  return (
    <div
      ref={containerRef}
      className={styles.carousel_viewport}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
  const { ref: containerRef } = useContext(CarouselContext)

  // Scrolls the container to next slide until hitting max
  const handleScrollToNext = () => {
    const container = containerRef?.current
    if (container && container.scrollLeft < container.scrollWidth) {
      if (isIOSSafari()) {
        const items = Array.from(
          container.querySelectorAll("[data-carousel-item]")
        ) as HTMLElement[]
        const currentScroll = container.scrollLeft
        console.log(
          items.map((child) => [
            child,
            child.offsetLeft,
            child.offsetWidth,
            container.offsetLeft,
          ]),
          currentScroll,
          container.offsetWidth
        )
        const nextItem =
          items.find(
            (child) =>
              child.offsetLeft + child.offsetWidth >
              currentScroll + container.offsetWidth + container.offsetLeft
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

  return <button onClick={handleScrollToNext}>{children}</button>
}

const CarouselPrevPage = ({ children }: PropsWithChildren) => {
  const { ref: containerRef } = useContext(CarouselContext)

  // Scrolls the container to previous slide until hitting 0
  const handleScrollToPrev = () => {
    const container = containerRef?.current
    if (container && container.scrollLeft > 0) {
      if (isIOSSafari()) {
        const items = Array.from(
          container.querySelectorAll("[data-carousel-item]")
        ) as HTMLElement[]
        const currentScroll = container.scrollLeft
        const prevItem = items.find(
          (child) =>
            currentScroll - container.offsetWidth + container.offsetLeft <
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

  return <button onClick={handleScrollToPrev}>{children}</button>
}

const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream

  return iOS
}

export const Carousel = {
  Root: CarouselRoot,
  Viewport: CarouselViewport,
  Content: CarouselContent,
  Item: CarouselItem,
  PrevPage: CarouselPrevPage,
  NextPage: CarouselNextPage,
}
