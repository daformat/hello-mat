import {
  ComponentProps,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react"
import styles from "./ButtonReveal.module.scss"

type ButtonRevealProps = {
  icon?: ReactNode
  label: string
} & ComponentProps<"button">

export const ButtonReveal = ({
  icon,
  label,
  className,
  ...props
}: ButtonRevealProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const labelWrapperRef = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  const getCurrentLabelWidth = useCallback(() => {
    return labelRef.current?.offsetWidth
  }, [])

  // Update the size of the label and trigger transition
  const updateSize = useCallback(() => {
    const label = labelWrapperRef.current
    if (label) {
      const width = getCurrentLabelWidth()
      label.style.setProperty("--width", `${width ?? "auto"}px`)
    }
  }, [getCurrentLabelWidth])

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
