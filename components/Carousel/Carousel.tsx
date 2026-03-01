import {
  ComponentPropsWithoutRef,
  ContextType,
  createContext,
  CSSProperties,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { MaybeNull, MaybeUndefined } from "@/components/Media/utils/maybe";

/**
 * Reference frame duration used as a unit scaling constant in deceleration
 * factor computations. The actual animation uses real elapsed time for
 * smoothness, but the math must be derived with a consistent reference value.
 */
const FRAME_DURATION = 16;

type ScrollState = {
  isDragging: boolean;
  startX: number;
  scrollLeft: number;
  lastX: number;
  lastTime: number;
  velocityX: number;
  animationId: number | null;
  initialTarget: MaybeNull<EventTarget>;
  initialPointerPosition: MaybeNull<{
    x: number;
    y: number;
  }>;
  initialMouseScrollLeft: number;
  mouseDirection: number;
  mouseScrollLeft: number;
  scrollSnapType: string;
};

type CarouselContext = {
  ref?: RefObject<MaybeNull<HTMLElement>>;
  setRef: (ref: RefObject<MaybeNull<HTMLElement>>) => void;
  scrollsBackwards: boolean;
  scrollsForwards: boolean;
  setScrollsBackwards: (scrollsBackwards: boolean) => void;
  setScrollsForwards: (scrollsForwards: boolean) => void;
  handleScrollToNext: () => void;
  handleScrollToPrev: () => void;
  remainingForwards?: number;
  remainingBackwards?: number;
  setRemainingForwards: (remainingForwards: number) => void;
  setRemainingBackwards: (remainingBackwards: number) => void;
  scrollStateRef?: MaybeUndefined<RefObject<ScrollState>>;
  setScrollStateRef: (state: RefObject<ScrollState>) => void;
  boundaryOffset?:
    | { x: number; y: number }
    | ((root: HTMLElement) => { x: number; y: number });
  rootRef: RefObject<MaybeNull<HTMLElement>>;
};
const CarouselContext = createContext<CarouselContext>({
  setRef: () => {},
  setScrollsBackwards: () => {},
  setScrollsForwards: () => {},
  scrollsBackwards: false,
  scrollsForwards: false,
  setRemainingForwards: () => {},
  setRemainingBackwards: () => {},
  setScrollStateRef: () => {},
  handleScrollToNext: () => {},
  handleScrollToPrev: () => {},
  rootRef: { current: null },
});

const useCarouselContext = () => {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarouselContext must be used within Carousel.Root");
  }
  return context;
};

type CarouselRootProps = {
  boundaryOffset?:
    | { x: number; y: number }
    | ((root: HTMLElement) => { x: number; y: number });
} & ComponentPropsWithoutRef<"div">;

const CarouselRoot = ({
  boundaryOffset,
  children,
  ...props
}: CarouselRootProps) => {
  const [ref, setRef] = useState<RefObject<MaybeNull<HTMLElement>>>({
    current: null,
  });
  const [scrollsBackwards, setScrollsBackwards] = useState(false);
  const [scrollsForwards, setScrollsForwards] = useState(false);
  const [remainingForwards, setRemainingForwards] = useState(0);
  const [remainingBackwards, setRemainingBackwards] = useState(0);
  const [scrollStateRef, setScrollStateRef] =
    useState<MaybeUndefined<RefObject<ScrollState>>>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * Scrolls the container to the next slide until hitting the end of the container
   */
  const handleScrollToNext = useCallback(() => {
    cancelAnimationFrame(scrollStateRef?.current?.animationId ?? 0);
    const container = ref?.current;
    const root = rootRef?.current;
    if (root && container && container.scrollLeft < container.scrollWidth) {
      container.style.scrollSnapType =
        scrollStateRef?.current.scrollSnapType ?? "";
      const items = Array.from(
        container.querySelectorAll("[data-carousel-item]")
      ) as HTMLElement[];
      const currentScroll = container.scrollLeft;
      const containerOffsetWidth = container.offsetWidth;
      const { x: boundaryOffsetX } = getBoundaryOffset(boundaryOffset, root);
      const isNextItem = (item: HTMLElement) => {
        return (
          item.offsetLeft + item.offsetWidth >
          Math.ceil(currentScroll + containerOffsetWidth - boundaryOffsetX)
        );
      };
      const nextItem = items.find(isNextItem) ?? items[items.length - 1];
      if (nextItem) {
        const [_, inline] = getScrollSnapAlign(getComputedStyle(nextItem));
        nextItem?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: ["start", "center", "end"].includes(inline ?? "")
            ? (inline as ScrollLogicalPosition)
            : "start",
        });
      }
    }
  }, [boundaryOffset, ref, scrollStateRef]);

  /**
   * Scrolls the container to the previous slide until hitting the start of the container
   */
  const handleScrollToPrev = useCallback(() => {
    cancelAnimationFrame(scrollStateRef?.current?.animationId ?? 0);
    const container = ref?.current;
    const root = rootRef?.current;
    if (root && container && container.scrollLeft > 0) {
      container.style.scrollSnapType =
        scrollStateRef?.current.scrollSnapType ?? "";
      const items = Array.from(
        container.querySelectorAll("[data-carousel-item]")
      ) as HTMLElement[];
      const currentScroll = container.scrollLeft;
      const { x: boundaryOffsetX } = getBoundaryOffset(boundaryOffset, root);
      const isPrevItem = (item: HTMLElement) => {
        return currentScroll > item.offsetLeft - boundaryOffsetX;
      };
      const prevItems = items.filter(isPrevItem);
      const prevItem = prevItems[prevItems.length - 1] ?? items[0];
      if (prevItem) {
        const [_, inline] = getScrollSnapAlign(getComputedStyle(prevItem));
        prevItem?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: inline === "center" ? "center" : "end",
        });
      }
    }
  }, [boundaryOffset, ref, scrollStateRef]);

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
        handleScrollToNext,
        handleScrollToPrev,
        boundaryOffset,
        rootRef,
      }}
    >
      <div ref={rootRef} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
};

type CarouselViewportProps = ComponentPropsWithoutRef<"div"> &
  (
    | {
        contentFade?: true;
        contentFadeSize?: string | number;
      }
    | {
        contentFade: false;
        contentFadeSize?: never;
      }
  );

const CarouselViewport = ({
  children,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClickCapture,
  onWheel,
  contentFade = true,
  contentFadeSize = "clamp(16px, 10vw, 64px)",
  ...props
}: CarouselViewportProps) => {
  const {
    setRef,
    setScrollsBackwards,
    setScrollsForwards,
    scrollsForwards,
    scrollsBackwards,
    setRemainingForwards,
    setRemainingBackwards,
    setScrollStateRef,
  } = useContext(CarouselContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFrameTime = useRef<number | null>(null);
  const scrollStateRef = useRef<ScrollState>({
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
    scrollSnapType: "",
  });

  /**
   * Register our refs
   */
  useLayoutEffect(() => {
    setRef(containerRef);
    setScrollStateRef(scrollStateRef);
  }, [setRef, setScrollStateRef]);

  /**
   * Save inlined scroll-snap-type if any, since we manipulate it
   */
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) {
      scrollStateRef.current.scrollSnapType =
        getComputedStyle(container).scrollSnapType ?? "";
    }
  }, []);

  /**
   * Determine whether the container can scroll forwards or backwards based on
   * its current scroll position, offset width, and scroll width. Updates
   * relevant state and CSS variables.
   */
  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const containerScrollWidth = container.scrollWidth ?? 0;
      const containerOffsetWidth = container.offsetWidth ?? 0;
      const containerScrollLeft = container.scrollLeft ?? 0;
      if (!container || containerScrollWidth <= containerOffsetWidth) {
        setScrollsBackwards(false);
        setScrollsForwards(false);
      } else if (containerScrollLeft <= 0) {
        setScrollsBackwards(false);
        setScrollsForwards(true);
      } else if (
        Math.ceil(containerScrollLeft) <
        containerScrollWidth - containerOffsetWidth - 1
      ) {
        setScrollsBackwards(true);
        setScrollsForwards(true);
      } else {
        setScrollsBackwards(true);
        setScrollsForwards(false);
      }
      const remainingBackwards = containerScrollLeft;
      const remainingForwards =
        containerScrollWidth - containerScrollLeft - containerOffsetWidth;
      setRemainingForwards(remainingForwards);
      setRemainingBackwards(remainingBackwards);
      container.style.setProperty(
        "--remaining-forwards",
        `${remainingForwards}px`
      );
      container.style.setProperty(
        "--remaining-backwards",
        `${remainingBackwards}px`
      );
    }
  }, [
    setRemainingBackwards,
    setRemainingForwards,
    setScrollsBackwards,
    setScrollsForwards,
  ]);

  /**
   * Prevent native scroll when dragging, reset velocity when not dragging to
   * avoid cumulating momentum.
   */
  const handlePreventScroll = useCallback((event: WheelEvent) => {
    if (scrollStateRef.current.isDragging) {
      event.preventDefault();
    } else {
      scrollStateRef.current.velocityX = 0;
    }
  }, []);

  /**
   * Set up observers and scrolling event listeners to update the scroll state
   * and prevent native scroll when dragging.
   */
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container) {
      const resizeObserver = new ResizeObserver(updateScrollState);
      const mutationObserver = new MutationObserver(updateScrollState);
      resizeObserver.observe(container);
      mutationObserver.observe(container, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      container.addEventListener("scroll", updateScrollState);
      container.addEventListener("wheel", handlePreventScroll, {
        passive: false,
      });
      updateScrollState();
      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        container.removeEventListener("scroll", updateScrollState);
        container.removeEventListener("wheel", handlePreventScroll);
      };
    }
  }, [handlePreventScroll, updateScrollState]);

  /**
   * Initialize dragging.
   */
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);

      const state = scrollStateRef.current;
      if (state.animationId !== null) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      // set to hidden to prevent momentum scrolling from the wheel when dragging
      container.style.overflowX = "hidden";
      state.isDragging = true;
      state.startX = event.clientX;
      state.lastX = event.clientX;
      state.scrollLeft = container.scrollLeft ?? 0;
      state.lastTime = Date.now();
      state.velocityX = 0;
      state.initialTarget = event.target;
      state.initialPointerPosition = { x: event.clientX, y: event.clientY };
      state.initialMouseScrollLeft = container.scrollLeft ?? 0;
      event.preventDefault();
      onPointerDown?.(event);
    },
    [onPointerDown]
  );

  /**
   * Prevent velocity from exceeding a given threshold.
   */
  const clampVelocity = useCallback((maxAbsoluteVelocity: number) => {
    const state = scrollStateRef.current;
    if (Math.abs(state.velocityX) > maxAbsoluteVelocity) {
      state.velocityX = Math.sign(state.velocityX) * maxAbsoluteVelocity;
    }
  }, []);

  /**
   * Calculate rubber banding effect, translate carousel items, and update
   * velocity accordingly.
   */
  const applyRubberBanding = useCallback(
    (container: HTMLDivElement, scrollDelta: number) => {
      const state = scrollStateRef.current;
      const items = container.querySelectorAll("[data-carousel-item]");
      const maxDistance = container.offsetWidth / 3;
      const maxScrollLeft = container.scrollWidth - container.offsetWidth;
      const targetScrollLeft = state.scrollLeft + scrollDelta;
      const overscroll =
        targetScrollLeft < 0
          ? Math.abs(targetScrollLeft)
          : targetScrollLeft > maxScrollLeft
          ? targetScrollLeft - maxScrollLeft
          : 0;
      const sign = Math.sign(scrollDelta);
      const easedDistance = iOSRubberBand(overscroll, 0, maxDistance);
      items.forEach((item) => {
        // we have to translate the items instead of the content because
        // Safari scrolls the viewport if the content is translated
        if (item instanceof HTMLElement) {
          item.style.translate = `${-sign * easedDistance}px 0`;
        }
      });

      state.velocityX = (-sign * easedDistance) / 20;
    },
    []
  );

  /**
   * Update scroll position and velocity on pointer move.
   */
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const state = scrollStateRef.current;
      const maxAbsoluteVelocity = 15;
      if (!state.isDragging || !container || event.pointerType !== "mouse") {
        onPointerMove?.(event);
        return;
      }

      container.style.scrollSnapType = "none";
      const currentTime = Date.now();
      const deltaTime = currentTime - state.lastTime;
      const deltaX = event.clientX - state.lastX;
      if (deltaTime > 0) {
        state.velocityX = deltaX / deltaTime; // (pixels per millisecond)
        clampVelocity(maxAbsoluteVelocity);
      }

      const scrollDelta = state.startX - event.clientX;
      const direction = Math.sign(state.startX - event.clientX);
      if (direction !== state.mouseDirection) {
        state.mouseDirection = direction;
        state.initialMouseScrollLeft = state.scrollLeft + scrollDelta;
      }
      container.scrollLeft = state.scrollLeft + scrollDelta;
      state.mouseScrollLeft = state.scrollLeft + scrollDelta;
      state.lastX = event.clientX;
      state.lastTime = currentTime;

      if (
        container.scrollLeft <= 1 ||
        container.scrollLeft >=
          container.scrollWidth - container.offsetWidth - 1
      ) {
        applyRubberBanding(container, scrollDelta);
        clampVelocity(maxAbsoluteVelocity);
      }
      onPointerMove?.(event);
    },
    [applyRubberBanding, clampVelocity, onPointerMove]
  );

  /**
   * Updates velocity for proper snapping and returns the adjusted deceleration
   * factor. Ensures the animation lands on the snap point and is visually
   * perceptible.
   */
  const applyMomentumSnapping = useCallback(
    (
      container: HTMLDivElement,
      initialScroll: number,
      tFinalScroll: number,
      decelerationFactor: number,
      minVelocity: number
    ) => {
      const state = scrollStateRef.current;

      // Find where the browser would snap to at tFinalScroll
      container.style.scrollSnapType = state.scrollSnapType;
      container.scrollLeft = tFinalScroll;
      const snappedScroll = container.scrollLeft;
      container.style.scrollSnapType = "none";
      container.scrollLeft = initialScroll;

      const { finalScroll, iterations } = getFinalScroll(
        initialScroll,
        state.velocityX,
        decelerationFactor,
        minVelocity
      );

      // update velocity to ensure momentum snaps to the correct position and
      // the animation is not too fast
      const minIterations = 10;
      const gap = snappedScroll - finalScroll;
      if (
        !isFinite(iterations) ||
        iterations < minIterations ||
        Math.abs(gap) > 0.5
      ) {
        const displacement = snappedScroll - initialScroll;
        state.velocityX =
          (-displacement * (1 - decelerationFactor)) /
          (FRAME_DURATION * (1 - Math.pow(decelerationFactor, minIterations)));
      }

      return findDecelerationFactor(
        initialScroll,
        snappedScroll,
        state.velocityX
      );
    },
    []
  );

  /**
   * Returns the deceleration factor for the momentum animation, accounting for
   * snapping if needed.
   */
  const computeMomentumDecelerationFactor = useCallback(
    (container: HTMLDivElement, minVelocity: number) => {
      const minVelocityForSnapping = 0;
      const state = scrollStateRef.current;
      const isRubberBanding =
        container.scrollLeft <= 1 ||
        container.scrollLeft >=
          container.scrollWidth - container.offsetWidth - 1;
      const rubberBandingFactor = isRubberBanding
        ? (state.velocityX * 50) / container.scrollWidth
        : 0;
      const friction = 0.05 + Math.abs(rubberBandingFactor);
      const decelerationFactor = 1 - friction;
      const initialScroll = container.scrollLeft;
      const { finalScroll } = getFinalScroll(
        initialScroll,
        state.velocityX,
        decelerationFactor,
        minVelocity
      );

      if (
        finalScroll < container.scrollWidth - container.offsetWidth &&
        finalScroll > 0 &&
        Math.abs(state.velocityX) >= minVelocityForSnapping &&
        state.scrollSnapType
      ) {
        return applyMomentumSnapping(
          container,
          initialScroll,
          finalScroll,
          decelerationFactor,
          minVelocity
        );
      }

      return decelerationFactor;
    },
    [applyMomentumSnapping]
  );

  /**
   * Start the momentum animation if needed.
   */
  const startMomentumAnimation = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const state = scrollStateRef.current;
    const minVelocity = 0.00001;
    const decelerationFactor = computeMomentumDecelerationFactor(
      container,
      minVelocity
    );

    const animate = () => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      container.style.scrollSnapType = "none";
      container.scrollLeft -= state.velocityX * FRAME_DURATION;
      state.scrollLeft = container.scrollLeft;
      state.velocityX *= decelerationFactor;

      const newScrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const offsetWidth = container.offsetWidth;
      const remainingForwards = scrollWidth - offsetWidth - newScrollLeft;
      const remainingBackwards = newScrollLeft;

      // Overscroll rubber band bounce-back
      const content = container.querySelector("[data-carousel-content]");
      if (content instanceof HTMLElement) {
        if (
          Math.abs(state.velocityX) > minVelocity &&
          (remainingForwards <= 1 || remainingBackwards < 1)
        ) {
          const theoreticalTranslate = state.velocityX * 50;
          const currentTranslate = parseFloat(content.style.translate || "0");
          const delta = theoreticalTranslate - currentTranslate;
          const items = content.querySelectorAll("[data-carousel-item]");
          // we have to translate the items instead of the content because
          // Safari scrolls the viewport if the content is translated
          items.forEach((item) => {
            if (item instanceof HTMLElement) {
              const sign = Math.sign(delta);
              const clampedDelta = Math.min(
                Math.abs(delta / 2),
                container.offsetWidth / 2
              );
              item.style.translate = `${sign * clampedDelta}px 0`;
            }
          });
          state.velocityX *= decelerationFactor;
        }
      }

      if (Math.abs(state.velocityX) > minVelocity) {
        state.animationId = requestAnimationFrame(animate);
      } else {
        state.animationId = null;
        lastFrameTime.current = null;
      }
    };

    lastFrameTime.current = null;
    state.animationId = requestAnimationFrame(animate);
  }, [computeMomentumDecelerationFactor]);

  /**
   * Trigger momentum animation when dragging stops, dispatch click if needed.
   */
  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      const container = containerRef.current;
      if ("pointerId" in event) {
        container?.releasePointerCapture(event.pointerId);
      }
      const state = scrollStateRef.current;
      if (!state.isDragging || !container) {
        return;
      }
      container.style.overflowX = "";
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
        );
      }
      state.initialTarget = null;
      state.initialPointerPosition = null;
      state.isDragging = false;
      startMomentumAnimation();
      if (event instanceof PointerEvent) {
        return;
      }
      onPointerUp?.(event);
    },
    [onPointerUp, startMomentumAnimation]
  );

  useEffect(() => {
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerUp]);

  return (
    <div
      ref={containerRef}
      {...props}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClickCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClickCapture?.(event);
      }}
      onWheel={(event) => {
        event.currentTarget.style.scrollSnapType =
          scrollStateRef.current.scrollSnapType;
        onWheel?.(event);
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
      style={
        {
          ...(contentFade
            ? {
                "--carousel-fade-size":
                  typeof contentFadeSize === "number"
                    ? `${contentFadeSize}px`
                    : contentFadeSize,
                "--carousel-fade-offset-backwards":
                  "var(--remaining-backwards, 0px)",
                "--carousel-fade-offset-forwards":
                  "var(--remaining-forwards, 0px)",
                maskImage: `linear-gradient(
              to right,
              transparent var(--carousel-fade-offset-backwards),
              #000 calc(min(var(--remaining-backwards, 0px), var(--carousel-fade-size)) + var(--carousel-fade-offset-backwards)),
              #000 calc(100% - min(var(--remaining-forwards, 0px), var(--carousel-fade-size)) - var(--carousel-fade-offset-forwards)),
              transparent calc(100% - var(--carousel-fade-offset-forwards))
            )`,
                maskSize: "100% 100%",
              }
            : {}),
          position: "relative",
          overflow: "scroll",
          msOverflowStyle: "none",
          overscrollBehaviorX: "contain",
          scrollbarColor: "transparent transparent",
          scrollbarWidth: "none",
          ...props.style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
};

type CarouselContentProps = ComponentPropsWithoutRef<"div">;

const CarouselContent = ({ children, ...props }: CarouselContentProps) => {
  return (
    <div {...props} data-carousel-content>
      {children}
    </div>
  );
};

type CarouselItemProps = ComponentPropsWithoutRef<"div">;

const CarouselItem = ({ children, ...props }: CarouselItemProps) => {
  return (
    <div {...props} data-carousel-item>
      {children}
    </div>
  );
};

type CarouselNextPageProps = ComponentPropsWithoutRef<"button">;

const CarouselNextPage = ({
  children,
  onClick,
  disabled,
  ...props
}: CarouselNextPageProps) => {
  const { scrollsForwards, handleScrollToNext } = useContext(CarouselContext);

  return (
    <button
      {...props}
      onClick={(event) => {
        handleScrollToNext();
        onClick?.(event);
      }}
      disabled={disabled ?? !scrollsForwards}
    >
      {children}
    </button>
  );
};

type CarouselPrevPageProps = ComponentPropsWithoutRef<"button">;

const CarouselPrevPage = ({
  children,
  onClick,
  disabled,
  ...props
}: CarouselPrevPageProps) => {
  const { scrollsBackwards, handleScrollToPrev } = useContext(CarouselContext);

  return (
    <button
      {...props}
      onClick={(event) => {
        handleScrollToPrev();
        onClick?.(event);
      }}
      disabled={disabled ?? !scrollsBackwards}
    >
      {children}
    </button>
  );
};

/**
 * Accounts for cases where the carousel viewport has padding or is inset within
 * a parent, so that the "next/prev item" calculation is relative to the visible
 * area rather than the raw container edge.
 *
 * For example if the carousel has margin-inline: -12px, items near the edges
 * might appear partially visible but the scroll logic would incorrectly think
 * they're fully in view without the offset adjustment.
 */
const getBoundaryOffset = (
  boundaryOffset: ContextType<typeof CarouselContext>["boundaryOffset"],
  root: HTMLElement
) => {
  return typeof boundaryOffset === "function"
    ? boundaryOffset(root)
    : boundaryOffset ?? { x: 0, y: 0 };
};

/**
 * Returns the normalized scroll-snap-align given a computed style.
 */
const getScrollSnapAlign = (computedStyle: MaybeNull<CSSStyleDeclaration>) => {
  if (computedStyle) {
    const scrollSnapAlign = computedStyle
      .getPropertyValue("scroll-snap-align")
      .split(" ");
    const [block, inline] = scrollSnapAlign;
    if (block && inline) {
      return [block, inline] as CSSProperties["scrollSnapAlign"][];
    } else if (block) {
      return [block, block] as CSSProperties["scrollSnapAlign"][];
    }
  }
  return [] as CSSProperties["scrollSnapAlign"][];
};

/**
 * Returns the deceleration factor needed to travel from initialScroll to
 * targetScroll given an initial velocity.
 */
const findDecelerationFactor = (
  initialScroll: number,
  targetScroll: number,
  velocity: number
) => {
  const totalDisplacement = targetScroll - initialScroll;
  const factor = 1 + (velocity * FRAME_DURATION) / totalDisplacement;

  if (!isFinite(factor) || factor <= 0 || factor >= 1) {
    return 0.95;
  }

  return factor;
};

/**
 * Returns the final scroll position and the number of iterations required to
 * reach it, based on the given parameters.
 */
const getFinalScroll = (
  initialScroll: number,
  velocity: number,
  decelerationFactor: number,
  minVelocity = 0.05
) => {
  // Number of frames until velocity drops below minVelocity
  const iterations = Math.ceil(
    Math.log(minVelocity / Math.abs(velocity)) / Math.log(decelerationFactor)
  );

  const finalScroll =
    initialScroll -
    (velocity *
      FRAME_DURATION *
      (1 - Math.pow(decelerationFactor, iterations))) /
      (1 - decelerationFactor);

  return { finalScroll, iterations };
};

const iOSRubberBand = (translation: number, ratio: number, dimension = 1) => {
  const constant = 0.55;
  const easedValue =
    (1 - 1 / ((translation * constant) / dimension + 1)) * dimension;
  return easedValue * (1 - ratio);
};

export const Carousel = {
  Root: CarouselRoot,
  Viewport: CarouselViewport,
  Content: CarouselContent,
  Item: CarouselItem,
  PrevPage: CarouselPrevPage,
  NextPage: CarouselNextPage,
  useCarouselContext,
};
