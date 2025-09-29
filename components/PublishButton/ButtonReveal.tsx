import {
  ComponentProps,
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react"
import styles from "./ButtonReveal.module.scss"

type ButtonRevealProps = {
  icon?: ReactNode
  label: string
  speed?: number
} & ComponentProps<"button">

export const ButtonReveal = ({
  icon,
  label,
  className,
  style,
  speed,
  ...props
}: ButtonRevealProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const labelWrapperRef = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const lastWidthRef = useRef<number>(0)

  // Update the size of the label and trigger transition
  const updateSize = useCallback(() => {
    const button = buttonRef.current
    const labelWrapper = labelWrapperRef.current
    const label = labelRef.current
    if (button && labelWrapper && label) {
      const width = label.offsetWidth
      labelWrapper.style.setProperty("--width", `${width ?? "auto"}px`)
      if (width !== lastWidthRef.current) {
        const delta = width - lastWidthRef.current
        button.dataset.animating = delta < 0 ? "collapse" : "expand"
        labelWrapper.style.setProperty("--mask-transition-duration", "0s")
        labelWrapper.style.setProperty("mask-position", "-1em 0")
        setTimeout(() => {
          labelWrapper.style.removeProperty("--mask-transition-duration")
          labelWrapper.style.removeProperty("mask-position")
        })
        labelWrapper.addEventListener(
          "transitionend",
          () => {
            labelWrapper.style.removeProperty("--mask-transition-duration")
            delete button.dataset.animating
          },
          { once: true }
        )
        lastWidthRef.current = width
      }
    }
  }, [])

  // Observe when the label is resized
  useEffect(() => {
    const label = labelWrapperRef.current
    if (label) {
      const observer = new ResizeObserver(updateSize)
      observer.observe(label)
      return () => observer.disconnect()
    }
  }, [updateSize])

  // Update the size after the initial render
  useEffect(updateSize)

  return (
    <button
      ref={buttonRef}
      className={[styles.button_reveal, styles.button, className]
        .filter(Boolean)
        .join(" ")}
      style={{ "--speed": speed, ...style } as CSSProperties}
      {...props}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span
        ref={labelWrapperRef}
        className={styles.label_wrapper}
        onTransitionEnd={updateSize}
      >
        <span ref={labelRef} className={styles.label}>
          {label}
        </span>
      </span>
    </button>
  )
}
