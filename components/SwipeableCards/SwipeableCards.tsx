import {
  ButtonHTMLAttributes,
  createContext,
  CSSProperties,
  forwardRef,
  HTMLAttributes,
  JSX,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { MaybeNull } from "@/components/Media/utils/maybe";
import { getPointsBoundingBox } from "@/utils/boundingBox";
import { cssEasing } from "@/utils/cssEasing";
import { Position } from "@/utils/geometry";

import styles from "./SwipeableCards.module.scss";

const rotationFactor = 0.1;
const maxRotation = 32;
const minDistanceThreshold = 0.3;
const minVelocity = 0.15;
const rotationBasis = 250;
const sendToBackMargin = 16;

export type DraggingState = {
  // whether a card is being dragged
  dragging: boolean;
  // the id of the card being dragged, if any
  draggingId: string;
  // the x coordinate of the pointer when the drag started
  startX: number;
  // the y coordinate of the pointer when the drag started
  startY: number;
  // the latest x coordinate of the pointer
  lastX: number;
  // the latest y coordinate of the pointer
  lastY: number;
  // the x velocity of the pointer since the last update
  velocityX: number;
  // the y velocity of the pointer since the last update
  velocityY: number;
  // the last time the state was updated
  lastTime: number;
  // the pivot point of the drag, relative to the center of the card, percentage
  pivotX: number;
  // the pivot point of the drag, relative to the center of the card, percentage
  pivotY: number;
  // the element being dragged, if any
  element: MaybeNull<HTMLElement>;
};

export type CardWithId = {
  id: string;
  card: JSX.Element;
};

export type BaseSwipeableCardsProps = PropsWithChildren<{
  cards: CardWithId[];
  visibleStackLength: number;
  onSwipe?: (direction: SwipeDirection, cardId: string) => void;
  discardStyle?: DiscardStyle;
}>;

export type DiscardStyle = "fling" | "sendToBack";

export type NotLoopingSwipeableProps = BaseSwipeableCardsProps & {
  loop?: false;
  emptyView: ReactNode;
};

export type LoopingSwipeableProps = BaseSwipeableCardsProps & {
  loop: true;
  emptyView?: never;
};

export type SwipeableCardsProps =
  | NotLoopingSwipeableProps
  | LoopingSwipeableProps;

const defaultDragState: DraggingState = {
  dragging: false,
  draggingId: "",
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  velocityX: 0,
  velocityY: 0,
  lastTime: 0,
  pivotX: 0,
  pivotY: 0,
  element: null,
};

/**
 * Returns the given element to the top of the stack
 */
const animateReturnToStack = (state: DraggingState, element: HTMLElement) => {
  state.dragging = false;
  state.draggingId = "";
  state.element = null;
  const animation = element.animate(
    {
      transform: ["none"],
      translate: ["0 0"],
      rotate: ["0deg"],
      transformOrigin: ["center 0"],
    },
    {
      duration: 300,
      easing: cssEasing["--spring-easing-1"],
      fill: "forwards",
    }
  );
  animation.onfinish = () => {
    element.style.transform = "";
    element.style.translate = "";
    element.style.rotate = "";
    element.style.transformOrigin = "";
    animation.cancel();
  };
};

/**
 * Returns the element's bounding rect with all transforms temporarily stripped,
 * falling back to `rect` if there is no element on the drag state.
 */
const getUnrotatedRect = (state: DraggingState, fallback: DOMRect): DOMRect => {
  if (!state.element) {
    return fallback;
  }
  const { rotate: prevRotate, translate: prevTranslate } = state.element.style;
  state.element.style.rotate = "0deg";
  state.element.style.translate = "none";
  const unrotated = state.element.getBoundingClientRect();
  state.element.style.rotate = prevRotate;
  state.element.style.translate = prevTranslate;
  return unrotated;
};

/**
 * Ensures `state.velocityX` is large enough to carry the element past the
 * horizontal edge. On the second pass (`pass === 1`) the travel distance is
 * refined by accounting for the gap between the rotated rect and the edge.
 */
const adjustHorizontalVelocityForExit = (
  state: DraggingState,
  rect: DOMRect,
  originalRect: DOMRect,
  rotatedRect: DOMRect,
  animationDuration: number,
  discardStyle: DiscardStyle,
  pass: number
) => {
  const minEdgeDistance = Math.min(
    rect.left,
    window.innerWidth - (rect.left + rect.width)
  );
  const travelDistance =
    discardStyle === "fling"
      ? minEdgeDistance + rect.width * 1.5
      : originalRect.width -
        Math.abs(rotatedRect.left - originalRect.left) +
        (rotatedRect.width - originalRect.width);

  const minVelocity = travelDistance / animationDuration;
  if (
    Math.abs(state.velocityX) < minVelocity ||
    discardStyle === "sendToBack"
  ) {
    state.velocityX = Math.sign(state.lastX - state.startX) * minVelocity;
  }

  if (pass === 1 && discardStyle === "sendToBack") {
    const yDistance = state.velocityY * animationDuration;
    const { rotation } = getAnimationValues(state, animationDuration);
    const refinedRect = getRotatedBoundingBox(
      new DOMRect(
        originalRect.x + travelDistance * Math.sign(state.velocityX),
        originalRect.y + yDistance,
        originalRect.width,
        originalRect.height
      ),
      rotation,
      state.pivotX,
      state.pivotY
    );
    const gap = Math.max(
      refinedRect.left - (originalRect.left + originalRect.width),
      0
    );
    const refinedTravelDistance = travelDistance - gap + sendToBackMargin;
    const refinedMinVelocity = refinedTravelDistance / animationDuration;
    if (
      Math.abs(state.velocityX) < refinedMinVelocity ||
      discardStyle === "sendToBack"
    ) {
      state.velocityX =
        Math.sign(state.lastX - state.startX) * refinedMinVelocity;
    }
  }
};

/**
 * Ensures `state.velocityY` is large enough to carry the element past the
 * vertical edge. On the second pass (`pass === 1`) the travel distance is
 * refined by accounting for the gap between the rotated rect and the edge.
 */
const adjustVerticalVelocityForExit = (
  state: DraggingState,
  rect: DOMRect,
  originalRect: DOMRect,
  rotatedRect: DOMRect,
  animationDuration: number,
  discardStyle: DiscardStyle,
  pass: number
) => {
  const minEdgeDistance = Math.min(
    rect.top,
    window.innerHeight - (rect.top + rect.height)
  );
  const travelDistance =
    discardStyle === "fling"
      ? minEdgeDistance + rect.height * 1.5
      : originalRect.height -
        Math.abs(rotatedRect.top - originalRect.top) +
        (rotatedRect.height - originalRect.height);

  const minVelocity = travelDistance / 200;
  if (
    Math.abs(state.velocityY) < minVelocity ||
    discardStyle === "sendToBack"
  ) {
    state.velocityY = Math.sign(state.lastY - state.startY) * minVelocity;
  }

  if (pass === 1 && discardStyle === "sendToBack") {
    const xDistance = state.velocityX * animationDuration;
    const { rotation } = getAnimationValues(state, animationDuration);
    const refinedRect = getRotatedBoundingBox(
      new DOMRect(
        originalRect.x + xDistance,
        originalRect.y + travelDistance * Math.sign(state.velocityY),
        originalRect.width,
        originalRect.height
      ),
      rotation,
      state.pivotX,
      state.pivotY
    );
    const paddingTop = state.element
      ? parseFloat(getComputedStyle(state.element).paddingTop)
      : 0;
    const gap = Math.max(
      refinedRect.top -
        (originalRect.top + originalRect.height) +
        (Math.sign(state.velocityY) === 1 ? paddingTop : 0),
      0
    );
    const refinedTravelDistance = travelDistance - gap + sendToBackMargin;
    const refinedMinVelocity = refinedTravelDistance / animationDuration;
    if (
      Math.abs(state.velocityY) < refinedMinVelocity ||
      discardStyle === "sendToBack"
    ) {
      state.velocityY =
        Math.sign(state.lastY - state.startY) * refinedMinVelocity;
    }
  }
};

/**
 * Boosts the velocity so that the element animates out of the viewport.
 * Called twice for `sendToBack` (pass 0 then pass 1) to refine the result.
 */
const adjustVelocityForExit = (
  state: DraggingState,
  rect: DOMRect,
  animationDuration: number,
  discardStyle: DiscardStyle,
  pass = 0
) => {
  const originalRect = getUnrotatedRect(state, rect);
  const { rotation } = getAnimationValues(state, animationDuration);
  const rotatedRect = getRotatedBoundingBox(
    new DOMRect(
      originalRect.x,
      originalRect.y,
      originalRect.width,
      originalRect.height
    ),
    rotation,
    state.pivotX,
    state.pivotY
  );

  const isHorizontal =
    Math.abs(state.velocityX) >= Math.abs(state.velocityY) ||
    Math.abs(state.startX - state.lastX) >=
      Math.abs(state.startY - state.lastY);

  if (isHorizontal) {
    adjustHorizontalVelocityForExit(
      state,
      rect,
      originalRect,
      rotatedRect,
      animationDuration,
      discardStyle,
      pass
    );
  } else {
    adjustVerticalVelocityForExit(
      state,
      rect,
      originalRect,
      rotatedRect,
      animationDuration,
      discardStyle,
      pass
    );
  }

  if (pass === 0 && discardStyle === "sendToBack") {
    adjustVelocityForExit(
      state,
      rect,
      animationDuration,
      discardStyle,
      pass + 1
    );
  }
};

export type SwipeDirection = "left" | "right" | "up" | "down";

/**
 * @returns the direction of the swipe, based on velocity
 */
const getSwipeDirection = (state: DraggingState): SwipeDirection => {
  if (Math.abs(state.velocityX) >= Math.abs(state.velocityY)) {
    if (state.velocityX > 0) {
      return "right";
    } else {
      return "left";
    }
  } else {
    if (state.velocityY > 0) {
      return "down";
    } else {
      return "up";
    }
  }
};

/**
 * Calculate rotation based on horizontal movement and pivot point, the further
 * from the center the pivot is, the more rotation per pixel moved
 */
const getRotation = (
  distanceX: number,
  distanceY: number,
  pivotX: number,
  pivotY: number,
  initialRotation?: number
) => {
  const rotation =
    (initialRotation ?? 0) +
    ((distanceX * pivotY * rotationBasis - distanceY * pivotX * rotationBasis) *
      rotationFactor) /
      100;
  return Math.sign(rotation) * Math.min(Math.abs(rotation), maxRotation);
};

/**
 * @returns the final animations values
 */
const getAnimationValues = (
  state: DraggingState,
  animationDuration: number
) => {
  const distanceX = state.velocityX * animationDuration;
  const distanceY = state.velocityY * animationDuration;
  const currentTranslateX = state.lastX - state.startX;
  const currentTranslateY = state.lastY - state.startY;
  const currentRotation = getRotation(
    currentTranslateX,
    currentTranslateY,
    state.pivotX,
    state.pivotY
  );
  const rotation = getRotation(
    distanceX,
    distanceY,
    state.pivotX,
    state.pivotY,
    currentRotation
  );
  return { distanceX, distanceY, rotation };
};

/**
 * Animate the swiped element
 * @returns the animations as an array
 */
const animateSwipedElement = (
  element: HTMLElement,
  state: DraggingState,
  animationDuration: number,
  discardStyle: DiscardStyle,
  manual?: boolean
) => {
  const [_emptyView, firstChild] = element.parentElement?.children ?? [];
  const firstChildStyle = firstChild ? getComputedStyle(firstChild) : undefined;
  const { distanceX, distanceY, rotation } = getAnimationValues(
    state,
    animationDuration
  );
  const prevTransform = element.style.transform;
  const prevTranslate = element.style.translate;
  const prevRotate = element.style.rotate;
  element.style.transform = "";
  element.style.translate = "";
  element.style.rotate = "";
  const originalRect = element.getBoundingClientRect();
  element.style.transform = prevTransform;
  element.style.translate = prevTranslate;
  element.style.rotate = prevRotate;
  element.style.transformOrigin = `${
    state.pivotX * originalRect.width + originalRect.width / 2
  }px ${state.pivotY * originalRect.height + originalRect.height / 2}px`;
  const [translateX = 0, translateY = 0] = prevTranslate
    .split(" ")
    .map((v) => parseFloat(v));
  const isTranslatedEnough =
    (Math.abs(distanceX) >= Math.abs(distanceY) &&
      Math.abs(translateX) >= Math.abs(distanceX)) ||
    (Math.abs(distanceX) < Math.abs(distanceY) &&
      Math.abs(translateY) >= Math.abs(distanceY));
  const options: KeyframeAnimationOptions = {
    duration: animationDuration,
    easing: manual
      ? cssEasing["--ease-in-out-cubic"]
      : cssEasing["--ease-out-cubic"],
    fill: "forwards",
  };
  const animation = element.animate(
    {
      scale: discardStyle === "fling" ? [0.9] : [1],
      rotate: ["0deg"],
      translate: ["none"],
      transform: [
        `translate(${isTranslatedEnough ? translateX : distanceX}px, ${
          isTranslatedEnough ? translateY : distanceY
        }px) rotate(${
          isTranslatedEnough ? parseFloat(prevRotate) : rotation
        }deg)`,
      ],
    },
    { ...options, duration: isTranslatedEnough ? 0 : animationDuration }
  );
  const animation2 =
    discardStyle === "fling"
      ? element.animate(
          { opacity: [0] },
          { ...options, easing: cssEasing["--ease-in-cubic"] }
        )
      : element.animate(
          {
            scale: [firstChildStyle?.getPropertyValue("scale") ?? "0"],
            transform: ["translate(0, 0) rotate(0deg)"],
            translate: ["none"],
            transformOrigin: ["center 0"],
            rotate: ["0deg"],
            zIndex: [-1, -1],
            opacity: [0.5],
            paddingTop: [
              firstChildStyle?.getPropertyValue("padding-top") ?? "0",
            ],
            marginTop: [firstChildStyle?.getPropertyValue("margin-top") ?? "0"],
          },
          {
            ...options,
            easing: cssEasing["--ease-in-out-cubic"],
            delay: isTranslatedEnough ? 0 : animationDuration,
          }
        );
  const animations = [animation, animation2];
  return { animations };
};

export const rotate = (point: Position, center: Position, radians: number) => {
  const cos = Math.cos(radians),
    sin = Math.sin(radians),
    nx = cos * (point.x - center.x) + sin * (point.y - center.y) + center.x,
    ny = cos * (point.y - center.y) - sin * (point.x - center.x) + center.y;
  return { x: nx, y: ny };
};

function getRotatedBoundingBox(
  rect: DOMRect,
  rotationDegrees: number,
  pivotX = 0,
  pivotY = 0
) {
  const radians = -(rotationDegrees * Math.PI) / 180;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  // pivotX and pivotY are percentages from -0.5 to 0.5 relative to the center
  const pivotPointX = centerX + pivotX * rect.width;
  const pivotPointY = centerY + pivotY * rect.height;
  const topLeft = { x: rect.x, y: rect.y };
  const topRight = { x: rect.x + rect.width, y: rect.y };
  const bottomLeft = { x: rect.x, y: rect.y + rect.height };
  const bottomRight = { x: rect.x + rect.width, y: rect.y + rect.height };
  const pivot = { x: pivotPointX, y: pivotPointY };
  const rotatedTopLeft = rotate(topLeft, pivot, radians);
  const rotatedTopRight = rotate(topRight, pivot, radians);
  const rotatedBottomLeft = rotate(bottomLeft, pivot, radians);
  const rotatedBottomRight = rotate(bottomRight, pivot, radians);
  const points = [
    rotatedTopLeft,
    rotatedTopRight,
    rotatedBottomLeft,
    rotatedBottomRight,
  ];
  return getPointsBoundingBox(points);
}

/**
 * Compute the velocity of the swipe gesture for the given pointer event
 */
const computeVelocity = (state: DraggingState, event: PointerEvent) => {
  const maxAbsoluteVelocity = 1000;
  const currentTime = Date.now();
  const deltaTime = currentTime - state.lastTime;
  const deltaX = event.clientX - state.lastX;
  const deltaY = event.clientY - state.lastY;
  if (deltaTime > 0) {
    state.velocityX = deltaX / deltaTime; // (pixels per millisecond)
    if (Math.abs(state.velocityX) > maxAbsoluteVelocity) {
      state.velocityX = Math.sign(state.velocityX) * maxAbsoluteVelocity;
    }
    state.velocityY = deltaY / deltaTime; // (pixels per millisecond)
    if (Math.abs(state.velocityY) > maxAbsoluteVelocity) {
      state.velocityY = Math.sign(state.velocityY) * maxAbsoluteVelocity;
    }
  }
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  state.lastTime = currentTime;
};

const shouldReturnToStack = (state: DraggingState, rect: DOMRect) => {
  return (
    Math.abs(state.velocityX) < minVelocity &&
    Math.abs(state.velocityY) < minVelocity &&
    Math.hypot(state.startX - state.lastX, state.startY - state.lastY) <
      rect.width * minDistanceThreshold
  );
};

const useSwipeableCards = (
  cards: CardWithId[],
  loop?: boolean,
  emptyView?: ReactNode,
  onSwipe?: (direction: SwipeDirection, cardId: string) => void,
  discardStyle: DiscardStyle = "fling"
) => {
  const [stack, setStack] = useState(cards);
  const [discardedCardId, setDiscardedCardId] = useState<string>("");
  const dragStateRef = useRef<DraggingState>(defaultDragState);
  const animationRef = useRef<Animation[]>([]);

  /**
   * Update the stack when the animations are finished and reset styles
   */
  const handleAnimationsFinished = useCallback(
    (animations: Animation[], element: HTMLElement) => {
      Promise.all(animations.map((animation) => animation.finished)).then(
        (animations) => {
          setDiscardedCardId("");
          setStack((prev) => {
            const last = prev[prev.length - 1];
            if (last) {
              return loop ? [last, ...prev.slice(0, -1)] : prev.slice(0, -1);
            }
            return prev;
          });
          setTimeout(() => {
            animations.forEach((animation) => {
              animation.cancel();
            });
            element.style.transform = "";
            element.style.translate = "";
            element.style.rotate = "";
            element.style.transformOrigin = "";
          });
          animationRef.current = [];
        }
      );
    },
    [loop]
  );

  const commitSwipe = useCallback(
    (manual?: boolean, _event?: PointerEvent) => {
      const animationDuration = 300;
      const state = dragStateRef.current;
      const element = state.element;
      if (!state.dragging || !element) {
        return;
      }
      const rect = element.getBoundingClientRect();
      if (shouldReturnToStack(state, rect)) {
        animateReturnToStack(state, element);
        return;
      }
      adjustVelocityForExit(state, rect, animationDuration, discardStyle);
      const discardedCardId = element.dataset.id ?? "";
      setDiscardedCardId(discardedCardId);
      const { animations } = animateSwipedElement(
        element,
        state,
        animationDuration,
        discardStyle,
        manual
      );
      handleAnimationsFinished(animations, element);
      animationRef.current.push(...animations);
      state.dragging = false;
      state.draggingId = "";
      state.element = null;
      const swipeDirection = getSwipeDirection(state);
      onSwipe?.(swipeDirection, discardedCardId);
    },
    [discardStyle, handleAnimationsFinished, onSwipe]
  );

  return {
    loop,
    emptyView,
    cards,
    stack,
    setStack,
    discardedCardId,
    setDiscardedCardId,
    dragStateRef,
    animationRef,
    commitSwipe,
    discardStyle,
  };
};

const SwipeableCardsContext = createContext<
  ReturnType<typeof useSwipeableCards>
>({
  loop: undefined,
  emptyView: undefined,
  cards: [],
  stack: [],
  setStack: () => undefined,
  discardedCardId: "",
  setDiscardedCardId: () => undefined,
  dragStateRef: { current: defaultDragState },
  animationRef: { current: [] },
  commitSwipe: () => undefined,
  discardStyle: "fling",
});

export const SwipeableCardsRoot = ({
  cards,
  loop,
  onSwipe,
  emptyView,
  discardStyle,
  children,
}: SwipeableCardsProps) => {
  const context = useSwipeableCards(
    cards,
    loop,
    emptyView,
    onSwipe,
    discardStyle
  );
  const { dragStateRef, commitSwipe } = context;

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state.dragging || !state.element) {
        return;
      }
      event.preventDefault();
      computeVelocity(state, event);
      const translateX = state.lastX - state.startX;
      const translateY = state.lastY - state.startY;
      const rotation = getRotation(
        translateX,
        translateY,
        state.pivotX,
        state.pivotY
      );
      state.element.style.translate = `${translateX}px ${translateY}px`;
      state.element.style.rotate = `${rotation}deg`;
    };

    const handlePointerUp = (event: PointerEvent) => {
      commitSwipe(false, event);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [commitSwipe, dragStateRef]);

  return (
    <SwipeableCardsContext.Provider value={context}>
      {children}
    </SwipeableCardsContext.Provider>
  );
};

export type SwipeableCardsCardsProps = HTMLAttributes<HTMLDivElement> & {
  visibleStackLength?: number;
  cardsTopDistance?: string;
};

const SwipeableCardsCards = forwardRef<
  HTMLDivElement,
  SwipeableCardsCardsProps
>(
  (
    {
      visibleStackLength = 4,
      cardsTopDistance = "clamp(16px, 1vw, 32px)",
      className,
      style,
      ...rest
    },
    ref
  ) => {
    const { stack, emptyView, discardedCardId, loop } = useContext(
      SwipeableCardsContext
    );

    const shouldOffset =
      stack.length <= visibleStackLength && discardedCardId && !loop;

    return (
      <div
        ref={ref}
        {...rest}
        className={[styles.swipeable_cards, className]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            "--visible-stack-length": Math.max(
              Math.min(visibleStackLength, stack.length) -
                1 -
                (shouldOffset ? 1 : 0),
              0
            ),
            "--stack-length": Math.max(
              stack.length - (shouldOffset ? 1 : 0),
              0
            ),
            "--card-top-distance": cardsTopDistance,
            ...style,
          } as CSSProperties
        }
      >
        <div className={styles.empty_card}>{emptyView ?? null}</div>
        {stack.map((card) => (
          <SwipeableCardsCard card={card} key={card.id} />
        ))}
      </div>
    );
  }
);

SwipeableCardsCards.displayName = "SwipeableCardsCards";

const SwipeableCardsCard = ({ card }: { card: CardWithId }) => {
  const { discardedCardId, stack, dragStateRef, animationRef } = useContext(
    SwipeableCardsContext
  );
  const isBeingDiscarded = discardedCardId === card.id;
  const isDiscarding = !!discardedCardId;
  const index = stack.findIndex((stackCard) => stackCard.id === card.id);
  const stackIndex =
    stack.length - (index + (isDiscarding && !isBeingDiscarded ? 1 : 0));
  const stackIndex0 = stackIndex - 1;

  return (
    <div
      className={styles.card}
      data-id={card.id}
      data-top-card={stackIndex0 ? "false" : "true"}
      style={
        {
          "--stack-index": stackIndex,
          "--stack-index0": stackIndex0,
        } as CSSProperties
      }
      onDragStart={(event) => {
        event.preventDefault();
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const dragState = dragStateRef.current;
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        dragState.dragging = true;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.lastX = event.clientX;
        dragState.lastY = event.clientY;
        dragState.velocityX = 0;
        dragState.velocityY = 0;
        dragState.lastTime = Date.now();
        dragState.draggingId = card.id;
        dragState.pivotX = (event.clientX - centerX) / rect.width / 2;
        dragState.pivotY = (event.clientY - centerY) / rect.height / 2;
        dragState.element = event.currentTarget;
        event.currentTarget.style.transformOrigin = `${
          event.clientX - rect.left
        }px ${event.clientY - rect.top}px`;
        animationRef.current.forEach((animation) => {
          animation.finish();
        });
      }}
    >
      {card.card}
    </div>
  );
};

const SwipeableCardsDeclineButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className, onClick, ...rest }, ref) => {
  const { discardedCardId, stack, dragStateRef, commitSwipe, discardStyle } =
    useContext(SwipeableCardsContext);

  return (
    <button
      ref={ref}
      {...rest}
      className={[styles.button, className].filter(Boolean).join(" ")}
      onClick={(event) => {
        onClick?.(event);
        const last = stack[stack.length - 1];
        if (discardedCardId || !last) {
          return;
        }
        const element = document.querySelector(`[data-id="${last.id}"]`);
        if (element instanceof HTMLElement) {
          const rect = element.getBoundingClientRect();
          const xModifier = rect.width / 442;
          const state = dragStateRef.current;
          state.element = element;
          state.dragging = true;
          state.draggingId = last.id;
          state.velocityX =
            discardStyle === "fling"
              ? -(Math.random() * 2 + 3) * xModifier
              : -0.15;
          state.velocityY =
            discardStyle === "fling" ? -Math.random() : Math.random() * -0.14;
          state.pivotX = -(Math.random() * 0.25 + 0.25);
          state.pivotY = Math.random() * 0.25 + 0.25;
          state.startX = 0;
          state.lastX = -1;
          commitSwipe(true);
        }
      }}
    >
      {children}
    </button>
  );
});

SwipeableCardsDeclineButton.displayName = "SwipeableCardsDeclineButton";

const SwipeableCardsAcceptButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className, onClick, ...rest }, ref) => {
  const { discardedCardId, stack, dragStateRef, commitSwipe, discardStyle } =
    useContext(SwipeableCardsContext);

  return (
    <button
      ref={ref}
      {...rest}
      className={[styles.button, className].filter(Boolean).join(" ")}
      onClick={(event) => {
        onClick?.(event);
        const last = stack[stack.length - 1];
        if (discardedCardId || !last) {
          return;
        }
        const element = document.querySelector(`[data-id="${last.id}"]`);
        if (element instanceof HTMLElement) {
          const rect = element.getBoundingClientRect();
          const xModifier = rect.width / 442;
          const state = dragStateRef.current;
          state.element = element;
          state.dragging = true;
          state.draggingId = last.id;
          state.velocityX =
            discardStyle === "fling"
              ? (Math.random() * 2 + 3) * xModifier
              : 0.15;
          state.velocityY =
            discardStyle === "fling" ? Math.random() : Math.random() * 0.14;
          state.pivotX = Math.random() * 0.25 + 0.25;
          state.pivotY = Math.random() * 0.25 + 0.25;
          state.startX = 0;
          state.lastX = 1;
          commitSwipe(true);
        }
      }}
    >
      {children}
    </button>
  );
});

SwipeableCardsAcceptButton.displayName = "SwipeableCardsAcceptButton";

const SwipeableCardsStarButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className, onClick, ...rest }, ref) => {
  const { discardedCardId, stack, dragStateRef, commitSwipe, discardStyle } =
    useContext(SwipeableCardsContext);

  return (
    <button
      ref={ref}
      {...rest}
      className={[styles.button, className].filter(Boolean).join(" ")}
      onClick={(event) => {
        onClick?.(event);
        const last = stack[stack.length - 1];
        if (discardedCardId || !last) {
          return;
        }
        const element = document.querySelector(`[data-id="${last.id}"]`);
        if (element instanceof HTMLElement) {
          const rect = element.getBoundingClientRect();
          const yModifier = rect.height / 442;
          const state = dragStateRef.current;
          state.element = element;
          state.dragging = true;
          state.draggingId = last.id;
          state.velocityX =
            discardStyle === "fling"
              ? Math.random() * 2 - 1
              : Math.random() * 0.1 - 0.1;
          state.velocityY =
            discardStyle === "fling"
              ? -(Math.random() * 2 + 3) * yModifier
              : -0.15;
          state.pivotX = Math.random() * 0.125 - 0.25;
          state.pivotY = -(Math.random() * 0.25 + 0.25);
          state.startX = 0;
          state.lastX = 0;
          state.startY = 0;
          state.lastY = -1;
          commitSwipe(true);
        }
      }}
    >
      {children}
    </button>
  );
});

SwipeableCardsStarButton.displayName = "SwipeableCardsStarButton";

export const SwipeableCards = {
  Root: SwipeableCardsRoot,
  Context: SwipeableCardsContext,
  Cards: SwipeableCardsCards,
  AcceptButton: SwipeableCardsAcceptButton,
  DeclineButton: SwipeableCardsDeclineButton,
  StarButton: SwipeableCardsStarButton,
  useSwipeableCardsContext: () => useContext(SwipeableCardsContext),
};
