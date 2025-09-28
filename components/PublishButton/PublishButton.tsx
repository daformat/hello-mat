import { ButtonReveal } from "./ButtonReveal"
import { TbShare2 } from "react-icons/tb"
import { HiLink } from "react-icons/hi"
import { IoChevronDownOutline } from "react-icons/io5"

import {
  ComponentProps,
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { MaybeNull } from "../Media/utils/maybe"
import { Dropdown } from "../ButtonGroup/Dropdown/Dropdown"
import { DropdownItem } from "../ButtonGroup/Dropdown/DropdownItem"
import { DropdownSeparator } from "../ButtonGroup/Dropdown/DropdownSeparator"
import styles from "./ButtonReveal.module.scss"

const PublishContext = createContext<{
  published: boolean
  setPublished: Dispatch<SetStateAction<boolean>>
}>({ published: false, setPublished: () => undefined })

export const PublishSplitButton = () => {
  const [published, setPublished] = useState(false)

  return (
    <div className="page prose">
      <h1>Design engineering: a publish button</h1>
      <PublishContext.Provider value={{ published, setPublished }}>
        <div
          style={{
            display: "flex",
            // fontSize: 24,
            gap: published ? "0.2em" : 0,
            transition: "gap 0.18s var(--ease-out-cubic)",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <PublishButton />
          <PublishDropdown />
        </div>
      </PublishContext.Provider>
    </div>
  )
}

const PublishDropdown = ({ className, ...props }: ComponentProps<"button">) => {
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { published } = useContext(PublishContext)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const button = buttonRef.current
    if (wrapper && button) {
      wrapper.style.setProperty("--width", `${button.offsetWidth}px`)
    }
  }, [])

  const button = (
    <button
      ref={buttonRef}
      className={[styles.button, className].filter(Boolean).join(" ")}
      style={{
        transition: "border-radius 0.18s var(--ease-out-cubic)",
        borderRadius: published ? "0 6px 6px 0" : "6px",
        paddingInline: "0.6em",
      }}
      {...props}
    >
      <IoChevronDownOutline />
    </button>
  )

  return (
    <span
      ref={wrapperRef}
      style={{
        display: "flex",
        width: published ? "var(--width, 0)" : 0,
        opacity: published ? 1 : 0,
        overflow: "hidden",
        transition:
          "width 0.18s var(--ease-out-cubic), opacity 0.18s var(--ease-out-cubic)",
        flexShrink: 0,
        boxShadow: "0 1px 12px var(--color-shadow-1)",
      }}
      // @ts-expect-error: inert is a valid attribute, but we're lagging behind
      // on our react version, so we need to disable the ts rule
      inert={!published ? "" : undefined}
      aria-hidden={published ? "false" : "true"}
    >
      {published ? (
        <Dropdown trigger={button}>
          <DropdownItem>Add to profile</DropdownItem>
          <DropdownItem>Share…</DropdownItem>
          <DropdownSeparator />
          <DropdownItem>Unpublish</DropdownItem>
        </Dropdown>
      ) : (
        button
      )}
    </span>
  )
}

const PublishButton = ({ className }: { className?: string }) => {
  const { published, setPublished } = useContext(PublishContext)
  const [buttonContent, setButtonContent] = useState<{
    icon: ReactNode
    message: string
  }>({ icon: <TbShare2 />, message: "Publish…" })
  const timeoutRef = useRef<MaybeNull<ReturnType<typeof setTimeout>>>(null)
  const feedbackTimeoutRef =
    useRef<MaybeNull<ReturnType<typeof setTimeout>>>(null)

  const handleTogglePublish = useCallback(() => {
    const timeout = timeoutRef.current
    if (!timeout) {
      setButtonContent({
        icon: published ? <HiLink /> : <TbShare2 />,
        message: published ? "Unpublishing…" : "Publishing…",
      })
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current)
        }
        if (Math.random() <= 0.75) {
          setPublished((prev) => !prev)
          setButtonContent({
            icon: <IconCheckmark />,
            message: published ? "Unpublished!" : "Published!",
          })
        } else {
          setButtonContent({
            icon: <IconError />,
            message: published ? "Failed to unpublish" : "Failed to publish",
          })
        }
        feedbackTimeoutRef.current = setTimeout(() => {
          feedbackTimeoutRef.current = null
          setPublished((published) => {
            setButtonContent(
              published
                ? { icon: <HiLink />, message: "Unpublish…" }
                : { icon: <TbShare2 />, message: "Publish…" }
            )
            return published
          })
        }, 1_500)
      }, Math.random() * 2_000 + 1_000)
    }
  }, [published, setPublished])

  const handleEnter = () => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = setTimeout(() => {
        setPublished((published) => {
          setButtonContent(
            published
              ? { icon: <HiLink />, message: "Unpublish…" }
              : { icon: <TbShare2 />, message: "Publish…" }
          )
          return published
        })
      }, 1_500)
    }
  }

  return (
    <ButtonReveal
      icon={buttonContent.icon}
      label={buttonContent.message}
      onClick={handleTogglePublish}
      className={className}
      onMouseEnter={handleEnter}
      onTouchStart={handleEnter}
      style={{
        transition: "border-radius 0.18s var(--ease-out-cubic)",
        borderRadius: published ? "6px 0 0 6px" : "6px",
      }}
    />
  )
}

const IconCheckmark = () => {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 7.5L6.5 12.5L13.5 2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: "draw-check 0.25s ease-in-out both",
          strokeDasharray: "130%",
        }}
      />
    </svg>
  )
}

const IconError = () => {
  return (
    <svg
      className="error"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 3L13 13"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        style={{
          animation: "draw-check 0.25s ease-in-out both",
          strokeDasharray: "130%",
        }}
      />
      <path
        d="M13 3L3 13"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        style={{
          animation: "draw-check 0.25s ease-in-out both 0.1s",
          strokeDasharray: "130%",
        }}
      />
    </svg>
  )
}
