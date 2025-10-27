import {
  CSSProperties,
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import styles from "./SwipeableCards.module.scss"
import { cssEasing } from "@/utils/cssEasing"
import { MaybeNull } from "@/components/Media/utils/maybe"

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
  emptyStackView:
    | ReactNode
    | (({
        cardsWithId,
        setStack,
      }: {
        cardsWithId: CardWithId[]
        setStack: Dispatch<SetStateAction<CardWithId[]>>
      }) => ReactNode)
}

export type LoopingSwipeableProps = BaseSwipeableCardsProps & {
  loop: true
  emptyStackView?: never
}

export type SwipeableCardsProps =
  | NotLoopingSwipeableProps
  | LoopingSwipeableProps

export const SwipeableCards = ({
  cards,
  loop,
  visibleStackLength,
  emptyStackView,
}: SwipeableCardsProps) => {
  const cardsWithId: CardWithId[] = useMemo(
    () => cards.map((card, index) => ({ id: `${index}`, card })).reverse(),
    [cards]
  )
  const [stack, setStack] = useState(cardsWithId)
  const cardsTopDistance = "clamp(16px, 1vw, 32px)"
  const [discardedCardId, setDiscardedCardId] = useState<string>("")
  const dragStateRef = useRef<DraggingState>({
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
  })
  const animationRef = useRef<Animation[]>([])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const state = dragStateRef.current
      if (!state.dragging || !state.element) {
        return
      }
      event.preventDefault()
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

    const handlePointerUp = () => {
      const state = dragStateRef.current
      const element = state.element
      if (!state.dragging || !element) {
        return
      }
      const rect = element.getBoundingClientRect()
      if (
        Math.abs(state.velocityX) < minVelocity &&
        Math.abs(state.velocityY) < minVelocity &&
        Math.hypot(state.startX - state.lastX, state.startY - state.lastY) <
          rect.width * minDistanceThreshold
      ) {
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
            duration: 200,
            easing: cssEasing["--easing-bounce-strong"],
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
        return
      }
      setDiscardedCardId(element.dataset.id ?? "")
      const distanceX = state.velocityX * 200
      const distanceY = state.velocityY * 200

      // Calculate final rotation based on velocity and pivot
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
      let finalRotation =
        currentRotation +
        ((distanceX * state.pivotY * rotationBasis -
          distanceY * state.pivotX * rotationBasis) *
          rotationFactor) /
          100
      finalRotation =
        Math.sign(finalRotation) *
        Math.min(Math.abs(finalRotation), maxRotation)
      const options: KeyframeAnimationOptions = {
        duration: 200,
        easing: cssEasing["--ease-out-cubic"],
        fill: "forwards",
      }
      const animation = element.animate(
        {
          scale: [0.9],
          transform: [
            `translate(${distanceX}px, ${distanceY}px) rotate(${finalRotation}deg)`,
          ],
        },
        options
      )
      const animation2 = element.animate(
        { opacity: [0] },
        { ...options, easing: cssEasing["--ease-in-cubic"] }
      )
      Promise.all([animation.finished, animation2.finished]).then(
        (animations) => {
          setDiscardedCardId("")
          setStack((prev) => {
            if (prev.length === 0) {
              return prev
            }
            const last = prev[prev.length - 1]
            return loop ? [last, ...prev.slice(0, -1)] : prev.slice(0, -1)
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

      state.dragging = false
      state.draggingId = ""
      state.element = null
      animationRef.current.push(animation, animation2)
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }
  })

  return (
    <div
      className={styles.swipeable_cards}
      style={
        {
          "--visible-stack-length": visibleStackLength,
          "--stack-length": stack.length,
          "--card-top-distance": cardsTopDistance,
        } as CSSProperties
      }
    >
      <div className={styles.empty_card}>
        {emptyStackView
          ? typeof emptyStackView === "function"
            ? emptyStackView({ cardsWithId, setStack })
            : emptyStackView
          : null}
      </div>
      {stack.map((card, index) => {
        const isBeingDiscarded = discardedCardId === card.id
        const isDiscarding = !!discardedCardId
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
      })}
    </div>
  )
}
