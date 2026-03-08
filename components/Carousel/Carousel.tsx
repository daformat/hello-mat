import {
  cloneElement,
  ComponentPropsWithoutRef,
  createContext,
  CSSProperties,
  isValidElement,
  ReactElement,
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
 * Use a fixed frame duration so that we can accurately predict snapping and
 * other momentum-based calculations. This is an acceptable tradeoff, since
 * requestAnimationFrame frame duration is variable. Using a dynamic frame
 * duration compounds into missed snap points if the actual frame duration is
 * different from the one we use for calculations ahead of the animation
 * (velocity and deceleration factor adjustments to account for snapping).
 */
const FRAME_DURATION = 16;
const RUBBER_BAND_BOUNCE_COEFFICIENT = 40;

type ScrollState = {
  isDragging: boolean;
  isDispatchingClick: boolean;
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
  mouseDirection: number;
  scrollSnapType: string;
};

type ScrollIntoView = (
  target: HTMLElement,
  container: HTMLElement,
  direction: "forwards" | "backwards" | "nearest"
) => void;

type CarouselContext = {
  ref?: RefObject<MaybeNull<HTMLElement>>;
  setRef: (ref: RefObject<MaybeNull<HTMLElement>>) => void;
  scrollsBackwards: boolean;
  scrollsForwards: boolean;
  setScrollsBackwards: (scrollsBackwards: boolean) => void;
  setScrollsForwards: (scrollsForwards: boolean) => void;
  handleScrollToNext: () => void;
  handleScrollToPrev: () => void;
  scrollIntoView: ScrollIntoView;
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
  scrollIntoView: () => {},
  rootRef: { current: null },
});

const useCarouselContext = () => {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarouselContext must be used within Carousel.Root");
  }
  return context;
};

/**
 * Default boundary offset accounts for the content fade size
 */
const defaultBoundaryOffset = (container: HTMLElement) => {
  const viewport = container.querySelector("[data-carousel-viewport]");
  if (viewport) {
    const computedStyle = getComputedStyle(viewport);
    const maskSize = computedStyle.getPropertyValue("--carousel-fade-size");
    const temp = document.createElement("div");
    temp.style.position = "absolute";
    temp.style.visibility = "hidden";
    temp.style.setProperty("--carousel-fade-size", maskSize);
    temp.style.width = "var(--carousel-fade-size)";
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp);
    const fadeSize = parseFloat(computed.getPropertyValue("width"));
    temp.remove();
    return { x: fadeSize, y: 0 };
  }
  return { x: 0, y: 0 };
};

type CarouselRootProps = {
  boundaryOffset?:
    | { x: number; y: number }
    | ((root: HTMLElement) => { x: number; y: number });
} & ComponentPropsWithoutRef<"div">;

const CarouselRoot = ({
  boundaryOffset = defaultBoundaryOffset,
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
   * Scroll the whole page (the container client width)
   */
  const handleScrollPage = useCallback(
    (
      direction: "forwards" | "backwards",
      container: HTMLElement,
      items: HTMLElement[]
    ) => {
      const currentScroll = container.scrollLeft;
      const offset = rootRef.current
        ? getBoundaryOffset(boundaryOffset, rootRef.current).x
        : 0;
      let delta =
        (container.clientWidth - offset * 2) *
        (direction === "forwards" ? 1 : -1);
      // If multiple items, we can be more precise and scroll so the next / prev
      // item that is not fully visible becomes fully visible after page scroll.
      if (items.length > 1) {
        if (direction === "forwards") {
          const nextItem = items.find(
            (item) =>
              item.offsetLeft + item.offsetWidth >
              currentScroll + container.offsetWidth - offset
          );
          if (nextItem) {
            delta = nextItem.offsetLeft - container.scrollLeft - offset;
          }
        } else {
          const prevItem = items
            .filter((item) => item.offsetLeft < currentScroll + offset)
            .reverse()[0];
          if (prevItem) {
            delta =
              container.scrollLeft -
              prevItem.offsetLeft -
              container.offsetWidth -
              offset;
          }
        }
      }
      const scrollPosition = currentScroll + delta;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const nextScrollPosition = Math.max(
        0,
        Math.min(scrollPosition, maxScroll)
      );
      container.scrollTo({ left: nextScrollPosition, behavior: "smooth" });
    },
    [boundaryOffset]
  );

  /**
   * Custom scrollIntoViewNearest to prevent ancestors scrolling when doing
   * native element.scrollIntoView()
   */
  const scrollIntoViewNearest = useCallback(
    (target: HTMLElement, container: HTMLElement) => {
      const offset = rootRef.current
        ? getBoundaryOffset(boundaryOffset, rootRef.current).x
        : 0;
      const getIsBeforeAfter = () => {
        const isBefore = target.offsetLeft < container.scrollLeft + offset;
        const isAfter =
          target.offsetLeft + target.offsetWidth >
          container.scrollLeft + container.offsetWidth - offset;
        return { isBefore, isAfter };
      };
      let { isBefore, isAfter } = getIsBeforeAfter();
      // Default when the target is larger than the container
      if (isBefore && isAfter) {
        const scrollPosition = target.offsetLeft - offset;
        container.scrollTo({
          left: scrollPosition <= offset ? 0 : scrollPosition,
          behavior: "smooth",
        });
      } else if (isBefore || isAfter) {
        const currentScroll = container.scrollLeft;
        let scrollPosition = isBefore
          ? target.offsetLeft - offset
          : target.offsetLeft -
            container.offsetWidth +
            target.offsetWidth +
            offset;
        let iterations = 0;
        const maxIterations = 20;
        // Adjust scroll position to account for snapping, if the target is
        // still before or after, we increment / decrement the scroll position
        while (
          scrollPosition > 0 &&
          scrollPosition < container.scrollWidth - container.offsetWidth &&
          (isBefore || isAfter) &&
          iterations < maxIterations
        ) {
          container.scrollTo({
            left: scrollPosition <= offset ? 0 : scrollPosition,
            behavior: "instant",
          });
          const newState = getIsBeforeAfter();
          isBefore = newState.isBefore;
          isAfter = newState.isAfter;
          if (isBefore) {
            scrollPosition -= target.offsetWidth / 2;
          } else if (isAfter) {
            scrollPosition += target.offsetWidth / 2;
          }
          iterations++;
        }
        container.scrollTo({ left: currentScroll, behavior: "instant" });
        // request animation frame to prevent Safari from being Safari
        requestAnimationFrame(() => {
          container.scrollTo({
            left: scrollPosition <= offset ? 0 : scrollPosition,
            behavior: "smooth",
          });
        });
      }
    },
    [boundaryOffset]
  );

  /**
   * Custom scrollIntoView to prevent ancestors scrolling when doing native
   * element.scrollIntoView()
   */
  const scrollIntoView = useCallback<ScrollIntoView>(
    (target, container, direction) => {
      const [_, inline] = getScrollSnapAlign(getComputedStyle(target));
      if (direction === "nearest") {
        scrollIntoViewNearest(target, container);
        return;
      }
      let scrollPosition =
        direction === "forwards"
          ? target.offsetLeft - target.offsetWidth * 0.5
          : target.offsetLeft -
            container.offsetWidth +
            target.offsetWidth * 1.5;
      if (inline === "center") {
        scrollPosition =
          target.offsetLeft - (container.offsetWidth - target.offsetWidth) / 2;
      } else if (inline === "end") {
        scrollPosition =
          direction === "forwards"
            ? target.offsetLeft - target.offsetWidth
            : target.offsetLeft - container.offsetWidth + target.offsetWidth;
      }
      container.scrollTo({ left: scrollPosition, behavior: "smooth" });
    },
    [scrollIntoViewNearest]
  );

  /**
   * Scrolls the container to the next slide until hitting the end of the container
   */
  const handleScrollToNext = useCallback(() => {
    cancelAnimationFrame(scrollStateRef?.current?.animationId ?? 0);
    const container = ref?.current;
    const root = rootRef?.current;
    if (root && container && container.scrollLeft < container.scrollWidth) {
      container.style.scrollSnapType =
        scrollStateRef?.current?.scrollSnapType ?? "";
      const items = Array.from(
        container.querySelectorAll(":scope [data-carousel-content] > *")
      ) as HTMLElement[];
      if (items.length === 1) {
        handleScrollPage("forwards", container, items);
        return;
      }
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
        scrollIntoView(nextItem, container, "forwards");
      }
    }
  }, [boundaryOffset, handleScrollPage, ref, scrollIntoView, scrollStateRef]);

  /**
   * Scrolls the container to the previous slide until hitting the start of the container
   */
  const handleScrollToPrev = useCallback(() => {
    cancelAnimationFrame(scrollStateRef?.current?.animationId ?? 0);
    const container = ref?.current;
    const root = rootRef?.current;
    if (root && container && container.scrollLeft > 0) {
      container.style.scrollSnapType =
        scrollStateRef?.current?.scrollSnapType ?? "";
      const items = Array.from(
        container.querySelectorAll(":scope [data-carousel-content] > *")
      ) as HTMLElement[];
      if (items.length === 1) {
        handleScrollPage("backwards", container, items);
        return;
      }
      const currentScroll = container.scrollLeft;
      const { x: boundaryOffsetX } = getBoundaryOffset(boundaryOffset, root);
      const isPrevItem = (item: HTMLElement) => {
        return currentScroll > item.offsetLeft - boundaryOffsetX;
      };
      const prevItems = items.filter(isPrevItem);
      const prevItem = prevItems[prevItems.length - 1] ?? items[0];
      if (prevItem) {
        scrollIntoView(prevItem, container, "backwards");
      }
    }
  }, [boundaryOffset, handleScrollPage, ref, scrollIntoView, scrollStateRef]);

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
        scrollIntoView,
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
  style,
  className,
  ...props
}: CarouselViewportProps) => {
  const {
    setRef,
    setScrollsBackwards,
    setScrollsForwards,
    scrollsForwards,
    scrollsBackwards,
    scrollIntoView,
    setRemainingForwards,
    setRemainingBackwards,
    setScrollStateRef,
  } = useContext(CarouselContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollStateRef = useRef<ScrollState>({
    isDragging: false,
    isDispatchingClick: false,
    startX: 0,
    scrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    animationId: null as number | null,
    initialTarget: null as MaybeNull<EventTarget>,
    initialPointerPosition: null as MaybeNull<{ x: number; y: number }>,
    mouseDirection: 0,
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
  }, [/* effect dep */ className, /* effect dep */ style]);

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
    return;
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
      event.preventDefault();
      event.stopPropagation();
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
      const items = container.querySelectorAll(
        ":scope [data-carousel-content] > *"
      );
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

      state.velocityX =
        -sign *
        Math.max(
          easedDistance / RUBBER_BAND_BOUNCE_COEFFICIENT,
          Math.abs(state.velocityX)
        );
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
      }
      container.scrollLeft = state.scrollLeft + scrollDelta;
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
        ? (state.velocityX * 25) / container.scrollWidth
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
        !isRubberBanding &&
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
      const container2 = containerRef.current;
      if (!container2) {
        return;
      }

      container2.style.scrollSnapType = "none";
      container2.scrollLeft -= state.velocityX * FRAME_DURATION;
      state.scrollLeft = container2.scrollLeft;
      state.velocityX *= decelerationFactor;

      const newScrollLeft = container2.scrollLeft;
      const scrollWidth = container2.scrollWidth;
      const offsetWidth = container2.offsetWidth;
      const remainingForwards = scrollWidth - offsetWidth - newScrollLeft;
      const remainingBackwards = newScrollLeft;

      // Overscroll rubber band bounce-back
      if (
        Math.abs(state.velocityX) > minVelocity &&
        (remainingForwards <= 1 || remainingBackwards < 1)
      ) {
        const content = container2.querySelector("[data-carousel-content]");
        if (content instanceof HTMLElement) {
          const items = content.querySelectorAll(":scope > *");
          // we have to translate the items instead of the content because
          // Safari scrolls the viewport if the content is translated
          const theoreticalTranslate =
            state.velocityX * RUBBER_BAND_BOUNCE_COEFFICIENT;
          const clampedTranslate =
            Math.sign(theoreticalTranslate) *
            Math.min(
              Math.abs(theoreticalTranslate),
              container2.offsetWidth / 2
            );
          items.forEach((item) => {
            if (item instanceof HTMLElement) {
              item.style.translate = `${clampedTranslate}px 0`;
            }
          });
          state.velocityX *= decelerationFactor;
        }
      }

      if (Math.abs(state.velocityX) > minVelocity) {
        state.animationId = requestAnimationFrame(animate);
      } else {
        state.animationId = null;
        container2.style.scrollSnapType = state.scrollSnapType;
        const allItems = container2.querySelectorAll(
          ":scope [data-carousel-content] > *"
        );
        allItems.forEach((item) => {
          if (item instanceof HTMLElement) {
            item.style.translate = "";
          }
        });
      }
    };

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
        state.isDispatchingClick = true;
        state.initialTarget?.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
        state.isDispatchingClick = false;
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

  const lastTabScrollLeft = useRef<MaybeNull<number>>(null);

  /**
   * Scroll to the focused element into view if it's not already visible
   */
  const handleFocus = useCallback(
    (event: FocusEvent) => {
      const container = containerRef.current;
      const { target } = event;
      if (
        container &&
        target instanceof HTMLElement &&
        target !== event.currentTarget
      ) {
        if (lastTabScrollLeft.current !== null) {
          container.scrollLeft = lastTabScrollLeft.current;
        }
        scrollIntoView(target, container, "nearest");
        void container.offsetWidth;
        lastTabScrollLeft.current = null;
      }
    },
    [scrollIntoView]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        if (
          event.target instanceof HTMLElement &&
          container.contains(event.target)
        ) {
          lastTabScrollLeft.current = container.scrollLeft;
        }
      }
    };

    container.addEventListener("focus", handleFocus, { capture: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("focus", handleFocus, { capture: true });
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleFocus]);

  return (
    <div
      ref={containerRef}
      {...props}
      onPointerDownCapture={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClickCapture={(event) => {
        // detail === 0 means the click was synthesized by the keyboard (Enter/Space),
        // not by a pointer device — let it through unconditionally
        if (!scrollStateRef.current.isDispatchingClick && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
        }
        onClickCapture?.(event);
      }}
      onWheel={(event) => {
        event.currentTarget.style.scrollSnapType =
          scrollStateRef.current.scrollSnapType;
        onWheel?.(event);
      }}
      data-carousel-viewport=""
      data-can-scroll={
        scrollsForwards && scrollsBackwards
          ? "both"
          : scrollsForwards
          ? "forwards"
          : scrollsBackwards
          ? "backwards"
          : "none"
      }
      className={className}
      style={
        {
          ...(contentFade
            ? {
                "--carousel-fade-size":
                  typeof contentFadeSize === "number"
                    ? `${contentFadeSize}px`
                    : contentFadeSize,
                "--carousel-fade-offset-backwards":
                  "min(var(--remaining-backwards, 0px), 0px)",
                "--carousel-fade-offset-forwards":
                  "min(var(--remaining-forwards, 0px), 0px)",
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
          ...style,
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
    <div
      {...props}
      style={{ width: "fit-content", ...props.style }}
      data-carousel-content=""
    >
      {children}
    </div>
  );
};

type CarouselItemProps = ComponentPropsWithoutRef<"div"> & {
  asChild?: boolean;
};

const CarouselItem = ({ children, asChild, ...props }: CarouselItemProps) => {
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<Record<string, unknown>>, {
      ...props,
      "data-carousel-item": "",
    });
  }
  return (
    <div {...props} data-carousel-item="">
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
 * Returns the computed boundary offset (used for adjusting prev / next scroll)
 */
const getBoundaryOffset = (
  boundaryOffset: CarouselContext["boundaryOffset"],
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
  if (decelerationFactor >= 1) {
    return { finalScroll: initialScroll, iterations: 0 };
  }
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
  defaultBoundaryOffset,
};
