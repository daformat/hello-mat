import {
  createContext,
  CSSProperties,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import styles from "./SwipeableCards.module.scss"
import { cssEasing } from "@/utils/cssEasing"
import { MaybeNull } from "@/components/Media/utils/maybe"
import { FaCheck, FaXmark } from "react-icons/fa6"
import { PiStarBold } from "react-icons/pi"

const rotationFactor = 0.1
const maxRotation = 32
const minDistanceThreshold = 0.3
const minVelocity = 0.15
const rotationBasis = 250

export type DraggingState = {
  dragging: boolean
  draggingId: string
  startX: number
  startY: number
  lastX: number
  lastY: number
  currentX: number
  currentY: number
  velocityX: number
  velocityY: number
  lastTime: number
  pivotX: number
  pivotY: number
  element: MaybeNull<HTMLElement>
}

export type CardWithId = {
  id: string
  card: JSX.Element
}

export type BaseSwipeableCardsProps = {
  cards: JSX.Element[]
  visibleStackLength: number
}

export type NotLoopingSwipeableProps = BaseSwipeableCardsProps & {
  loop?: false
  emptyView: ReactNode
}

export type LoopingSwipeableProps = BaseSwipeableCardsProps & {
  loop: true
  emptyView?: never
}

export type SwipeableCardsProps = PropsWithChildren<
  NotLoopingSwipeableProps | LoopingSwipeableProps
>

const defaultDragState = {
  dragging: false,
  draggingId: "",
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  currentX: 0,
  currentY: 0,
  velocityX: 0,
  velocityY: 0,
  lastTime: 0,
  pivotX: 0,
  pivotY: 0,
  element: null,
}

/**
 * Returns the given element to the top of the stack
 */
const animateReturnToStack = (state: DraggingState, element: HTMLElement) => {
  state.dragging = false
  state.draggingId = ""
  state.element = null
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
  )
  animation.onfinish = () => {
    element.style.transform = ""
    element.style.translate = ""
    element.style.rotate = ""
    element.style.transformOrigin = ""
    animation.cancel()
  }
}

/**
 * Boost the velocity so that the element animates out of the viewport
 */
const adjustVelocityForExit = (
  state: DraggingState,
  rect: DOMRect,
  animationDuration: number
) => {
  if (
    Math.abs(state.velocityX) >= Math.abs(state.velocityY) ||
    Math.abs(state.startX - state.lastX) >= Math.abs(state.startY - state.lastY)
  ) {
    const minEdgeDistance = Math.min(
      rect.left,
      window.innerWidth - (rect.left + rect.width)
    )
    const travelDistance = minEdgeDistance + rect.width
    const minVelocityForExit = travelDistance / animationDuration
    if (Math.abs(state.velocityX) < minVelocityForExit) {
      state.velocityX =
        Math.sign(state.lastX - state.startX) * minVelocityForExit
    }
  } else {
    const minEdgeDistance = Math.min(
      rect.top,
      window.innerHeight - (rect.top + rect.height)
    )
    const travelDistance = minEdgeDistance + rect.height
    const minVelocityForExit = travelDistance / 200
    if (Math.abs(state.velocityY) < minVelocityForExit) {
      state.velocityY =
        Math.sign(state.lastY - state.startY) * minVelocityForExit
    }
  }
}

export type SwipeDirection = "left" | "right" | "up" | "down"

/**
 * @returns the direction of the swipe, based on velocity
 */
const getSwipeDirection = (state: DraggingState): SwipeDirection => {
  if (Math.abs(state.velocityX) >= Math.abs(state.velocityY)) {
    if (state.velocityX > 0) {
      return "right"
    } else {
      return "left"
    }
  } else {
    if (state.velocityY > 0) {
      return "down"
    } else {
      return "up"
    }
  }
}

/**
 * @returns the final animations values
 */
const getAnimationValues = (
  state: DraggingState,
  animationDuration: number
) => {
  const distanceX = state.velocityX * animationDuration
  const distanceY = state.velocityY * animationDuration
  const currentTranslateX = state.lastX - state.startX
  const currentTranslateY = state.lastY - state.startY
  let currentRotation =
    ((currentTranslateX * state.pivotY * rotationBasis -
      currentTranslateY * state.pivotX * rotationBasis) *
      rotationFactor) /
    100
  currentRotation =
    Math.sign(currentRotation) *
    Math.min(Math.abs(currentRotation), maxRotation)
  let rotation =
    currentRotation +
    ((distanceX * state.pivotY * rotationBasis -
      distanceY * state.pivotX * rotationBasis) *
      rotationFactor) /
      100
  rotation = Math.sign(rotation) * Math.min(Math.abs(rotation), maxRotation)
  return { distanceX, distanceY, rotation }
}

/**
 * Animate the swiped element
 * @returns the animations as an array
 */
const animateSwipedElement = (
  element: HTMLElement,
  state: DraggingState,
  animationDuration: number,
  manual?: boolean
) => {
  const { distanceX, distanceY, rotation } = getAnimationValues(
    state,
    animationDuration
  )
  const options: KeyframeAnimationOptions = {
    duration: animationDuration,
    easing: manual
      ? cssEasing["--ease-in-out-cubic"]
      : cssEasing["--ease-out-cubic"],
    fill: "forwards",
  }
  const animation = element.animate(
    {
      scale: [0.9],
      transform: [
        `translate(${distanceX}px, ${distanceY}px) rotate(${rotation}deg)`,
      ],
    },
    options
  )
  const animation2 = element.animate(
    { opacity: [0] },
    { ...options, easing: cssEasing["--ease-in-cubic"] }
  )
  const animations = [animation, animation2]
  return { animations }
}

/**
 * Compute the velocity of the swipe gesture for the given pointer event
 */
const computeVelocity = (state: DraggingState, event: PointerEvent) => {
  const maxAbsoluteVelocity = 1000
  const currentTime = Date.now()
  const deltaTime = currentTime - state.lastTime
  const deltaX = event.clientX - state.lastX
  const deltaY = event.clientY - state.lastY
  if (deltaTime > 0) {
    state.velocityX = deltaX / deltaTime // (pixels per millisecond)
    if (Math.abs(state.velocityX) > maxAbsoluteVelocity) {
      state.velocityX = Math.sign(state.velocityX) * maxAbsoluteVelocity
    }
    state.velocityY = deltaY / deltaTime // (pixels per millisecond)
    if (Math.abs(state.velocityY) > maxAbsoluteVelocity) {
      state.velocityY = Math.sign(state.velocityY) * maxAbsoluteVelocity
    }
  }
  state.lastX = event.clientX
  state.lastY = event.clientY
  state.lastTime = currentTime
}

const shouldReturnToStack = (state: DraggingState, rect: DOMRect) => {
  return (
    Math.abs(state.velocityX) < minVelocity &&
    Math.abs(state.velocityY) < minVelocity &&
    Math.hypot(state.startX - state.lastX, state.startY - state.lastY) <
      rect.width * minDistanceThreshold
  )
}

const useSwipeableCards = (
  cards: JSX.Element[],
  loop?: boolean,
  emptyView?: ReactNode
) => {
  const cardsWithId: CardWithId[] = useMemo(
    () => cards.map((card, index) => ({ id: `${index}`, card })).reverse(),
    [cards]
  )
  const [stack, setStack] = useState(cardsWithId)
  const [discardedCardId, setDiscardedCardId] = useState<string>("")
  const dragStateRef = useRef<DraggingState>(defaultDragState)
  const animationRef = useRef<Animation[]>([])

  /**
   * Update the stack when the animations are finished and reset styles
   */
  const handleAnimationsFinished = useCallback(
    (animations: Animation[], element: HTMLElement) => {
      Promise.all(animations.map((animation) => animation.finished)).then(
        (animations) => {
          setDiscardedCardId("")
          setStack((prev) => {
            const last = prev[prev.length - 1]
            if (last) {
              return loop ? [last, ...prev.slice(0, -1)] : prev.slice(0, -1)
            }
            return prev
          })
          setTimeout(() => {
            animations.forEach((animation) => {
              animation.cancel()
            })
            element.style.transform = ""
            element.style.translate = ""
            element.style.rotate = ""
            element.style.transformOrigin = ""
          })
          animationRef.current = []
        }
      )
    },
    [loop]
  )

  const commitSwipe = useCallback(
    (manual?: boolean, _event?: PointerEvent) => {
      const animationDuration = 200
      const state = dragStateRef.current
      const element = state.element
      if (!state.dragging || !element) {
        return
      }
      const rect = element.getBoundingClientRect()
      if (shouldReturnToStack(state, rect)) {
        animateReturnToStack(state, element)
        return
      }
      adjustVelocityForExit(state, rect, animationDuration)
      setDiscardedCardId(element.dataset.id ?? "")
      const { animations } = animateSwipedElement(
        element,
        state,
        animationDuration,
        manual
      )
      handleAnimationsFinished(animations, element)
      animationRef.current.push(...animations)
      state.dragging = false
      state.draggingId = ""
      state.element = null
      const swipeDirection = getSwipeDirection(state)
      console.log(swipeDirection)
    },
    [handleAnimationsFinished]
  )

  return {
    loop,
    emptyView,
    cardsWithId,
    stack,
    setStack,
    discardedCardId,
    setDiscardedCardId,
    dragStateRef,
    animationRef,
    commitSwipe,
  }
}

const SwipeableCardsContext = createContext<
  ReturnType<typeof useSwipeableCards>
>({
  loop: undefined,
  emptyView: undefined,
  cardsWithId: [],
  stack: [],
  setStack: () => undefined,
  discardedCardId: "",
  setDiscardedCardId: () => undefined,
  dragStateRef: { current: defaultDragState },
  animationRef: { current: [] },
  commitSwipe: () => undefined,
})

export const SwipeableCardsRoot = ({
  cards,
  loop,
  emptyView,
  children,
}: SwipeableCardsProps) => {
  const context = useSwipeableCards(cards, loop, emptyView)
  const { dragStateRef, commitSwipe } = context

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const state = dragStateRef.current
      if (!state.dragging || !state.element) {
        return
      }
      event.preventDefault()
      computeVelocity(state, event)

      const translateX = state.lastX - state.startX
      const translateY = state.lastY - state.startY

      // Calculate rotation based on horizontal movement and pivot point
      // The further from center the pivot is, the more rotation per pixel moved
      let rotation =
        ((translateX * state.pivotY * rotationBasis -
          translateY * state.pivotX * rotationBasis) *
          rotationFactor) /
        100
      rotation = Math.sign(rotation) * Math.min(Math.abs(rotation), maxRotation)
      state.element.style.translate = `${translateX}px ${translateY}px`
      state.element.style.rotate = `${rotation}deg`
    }

    const handlePointerUp = (event: PointerEvent) => {
      commitSwipe(false, event)
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }, [commitSwipe, dragStateRef])

  return (
    <SwipeableCardsContext.Provider value={context}>
      {children}
    </SwipeableCardsContext.Provider>
  )
}

export type SwipeableCardsCardsProps = {
  visibleStackLength?: number
  cardsTopDistance?: string
}

const SwipeableCardsCards = ({
  visibleStackLength = 4,
  cardsTopDistance = "clamp(16px, 1vw, 32px)",
}: SwipeableCardsCardsProps) => {
  const { stack, emptyView } = useContext(SwipeableCardsContext)

  return (
    <div
      className={styles.swipeable_cards}
      style={
        {
          "--visible-stack-length": visibleStackLength - 1,
          "--stack-length": stack.length,
          "--card-top-distance": cardsTopDistance,
        } as CSSProperties
      }
    >
      <div className={styles.empty_card}>{emptyView ?? null}</div>
      {stack.map((card) => (
        <SwipeableCardsCard card={card} key={card.id} />
      ))}
    </div>
  )
}

const SwipeableCardsCard = ({ card }: { card: CardWithId }) => {
  const { discardedCardId, stack, dragStateRef, animationRef } = useContext(
    SwipeableCardsContext
  )
  const isBeingDiscarded = discardedCardId === card.id
  const isDiscarding = !!discardedCardId
  const index = stack.findIndex((stackCard) => stackCard.id === card.id)
  const stackIndex =
    stack.length - (index + (isDiscarding && !isBeingDiscarded ? 1 : 0))
  const stackIndex0 = stackIndex - 1
  return (
    <div
      key={card.id}
      className={styles.card}
      data-id={card.id}
      style={
        {
          "--stack-index": stackIndex,
          "--stack-index0": stackIndex0,
        } as CSSProperties
      }
      onDragStart={(event) => {
        event.preventDefault()
      }}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        const dragState = dragStateRef.current
        const rect = event.currentTarget.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        dragState.dragging = true
        dragState.startX = event.clientX
        dragState.startY = event.clientY
        dragState.lastX = event.clientX
        dragState.lastY = event.clientY
        dragState.velocityX = 0
        dragState.velocityY = 0
        dragState.lastTime = Date.now()
        dragState.draggingId = card.id
        dragState.pivotX = (event.clientX - centerX) / rect.width / 2
        dragState.pivotY = (event.clientY - centerY) / rect.height / 2
        dragState.element = event.currentTarget
        event.currentTarget.style.transformOrigin = `${
          event.clientX - rect.left
        }px ${event.clientY - rect.top}px`
        animationRef.current.forEach((animation) => {
          animation.finish()
        })
      }}
    >
      {card.card}
    </div>
  )
}

const SwipeableCardsDeclineButton = () => {
  const { discardedCardId, stack, dragStateRef, commitSwipe } = useContext(
    SwipeableCardsContext
  )

  return (
    <button
      className={styles.button}
      onClick={() => {
        if (discardedCardId) {
          return
        }
        const last = stack[stack.length - 1]
        const element = document.querySelector(`[data-id="${last.id}"]`)
        if (element instanceof HTMLElement) {
          const rect = element.getBoundingClientRect()
          const xModifier = rect.width / 442
          const state = dragStateRef.current
          state.element = element
          state.dragging = true
          state.draggingId = last.id
          state.velocityX = -(Math.random() * 2 + 3) * xModifier
          state.velocityY = Math.random()
          state.pivotX = -(Math.random() * 0.25 + 0.25)
          state.pivotY = Math.random() * 0.25 + 0.25
          state.startX = 0
          state.lastX = -1
          commitSwipe(true)
        }
      }}
    >
      <FaXmark />
    </button>
  )
}

const SwipeableCardsAcceptButton = () => {
  const { discardedCardId, stack, dragStateRef, commitSwipe } = useContext(
    SwipeableCardsContext
  )

  return (
    <button
      className={styles.button}
      onClick={() => {
        if (discardedCardId) {
          return
        }
        const last = stack[stack.length - 1]
        const element = document.querySelector(`[data-id="${last.id}"]`)
        if (element instanceof HTMLElement) {
          const rect = element.getBoundingClientRect()
          const xModifier = rect.width / 442
          const state = dragStateRef.current
          state.element = element
          state.dragging = true
          state.draggingId = last.id
          state.velocityX = (Math.random() * 2 + 3) * xModifier
          state.velocityY = Math.random()
          state.pivotX = Math.random() * 0.25 + 0.25
          state.pivotY = Math.random() * 0.25 + 0.25
          state.startX = 0
          state.lastX = 1
          commitSwipe(true)
        }
      }}
    >
      <FaCheck />
    </button>
  )
}

const SwipeableCardsStarButton = () => {
  const { discardedCardId, stack, dragStateRef, commitSwipe } = useContext(
    SwipeableCardsContext
  )

  return (
    <button
      className={styles.button}
      onClick={() => {
        if (discardedCardId) {
          return
        }
        const last = stack[stack.length - 1]
        const element = document.querySelector(`[data-id="${last.id}"]`)
        if (element instanceof HTMLElement) {
          const rect = element.getBoundingClientRect()
          const yModifier = rect.height / 442
          const state = dragStateRef.current
          state.element = element
          state.dragging = true
          state.draggingId = last.id
          state.velocityX = Math.random() * 2 - 1
          state.velocityY = -(Math.random() * 2 + 3) * yModifier
          state.pivotX = Math.random() * 0.125 - 0.25
          state.pivotY = -(Math.random() * 0.25 + 0.25)
          state.startX = 0
          state.lastX = 0
          state.startY = 0
          state.lastY = -1
          commitSwipe(true)
        }
      }}
    >
      <PiStarBold />
    </button>
  )
}

export const SwipeableCards = {
  Root: SwipeableCardsRoot,
  Context: SwipeableCardsContext,
  Cards: SwipeableCardsCards,
  AcceptButton: SwipeableCardsAcceptButton,
  DeclineButton: SwipeableCardsDeclineButton,
  StarButton: SwipeableCardsStarButton,
}
