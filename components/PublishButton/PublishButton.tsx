import {
  ComponentProps,
  createContext,
  CSSProperties,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { HiLink } from "react-icons/hi";
import { IoChevronDownOutline } from "react-icons/io5";
import { TbShare2 } from "react-icons/tb";

import { Dropdown } from "@/components/ButtonGroup/Dropdown/Dropdown";
import { DropdownItem } from "@/components/ButtonGroup/Dropdown/DropdownItem";
import { DropdownSeparator } from "@/components/ButtonGroup/Dropdown/DropdownSeparator";
import { MaybeNull, MaybeUndefined } from "@/components/Media/utils/maybe";
import { ButtonReveal } from "@/components/PublishButton/ButtonReveal";

import styles from "./ButtonReveal.module.scss";

const PublishContext = createContext<{
  published: boolean;
  setPublished: Dispatch<SetStateAction<boolean>>;
}>({ published: false, setPublished: () => undefined });

export const PublishSplitButton = ({ speed }: { speed?: number }) => {
  const [published, setPublished] = useState(false);

  return (
    <PublishContext.Provider value={{ published, setPublished }}>
      <div
        style={
          {
            "--speed": speed,
            "--transition-duration": "calc(0.18s / var(--speed, 1))",
            display: "flex",
            // fontSize: 24,
            gap: published ? "0.2em" : 0,
            transition: "gap var(--transition-duration) var(--ease-out-cubic)",
          } as CSSProperties
        }
      >
        <PublishButton speed={speed} />
        <PublishDropdown speed={speed} />
      </div>
    </PublishContext.Provider>
  );
};

const PublishDropdown = ({
  className,
  speed,
  ...props
}: ComponentProps<"button"> & { speed?: number }) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { published } = useContext(PublishContext);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const button = buttonRef.current;
    if (wrapper && button) {
      wrapper.style.setProperty("--width", `${button.offsetWidth + 1}px`);
    }
  }, []);

  const button = (
    <button
      ref={buttonRef}
      className={[styles.button, className].filter(Boolean).join(" ")}
      style={
        {
          transition:
            "border-radius var(--transition-duration) var(--ease-out-cubic)",
          borderRadius: published ? "0 6px 6px 0" : "6px",
          paddingInline: "0.6em",
        } as CSSProperties
      }
      {...props}
    >
      <IoChevronDownOutline />
    </button>
  );

  return (
    <span
      ref={wrapperRef}
      style={
        {
          "--speed": speed,
          "--transition-duration": "calc(0.18s / var(--speed, 1))",
          display: "flex",
          width: published ? "var(--width, 0)" : 0,
          opacity: published ? 1 : 0,
          overflow: "hidden",
          transition:
            "width var(--transition-duration) var(--ease-out-cubic), opacity var(--transition-duration) var(--ease-out-cubic)",
          flexShrink: 0,
          boxShadow: "0 1px 12px var(--color-shadow-1)",
        } as CSSProperties
      }
      inert={!published}
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
  );
};

const PublishButton = ({
  className,
  speed,
}: {
  className?: string;
  speed?: number;
}) => {
  const { published, setPublished } = useContext(PublishContext);
  const [buttonContent, setButtonContent] = useState<{
    icon: ReactNode;
    message: string;
  }>({ icon: <TbShare2 />, message: "Publish…" });
  const timeoutRef = useRef<MaybeNull<ReturnType<typeof setTimeout>>>(null);
  const feedbackTimeoutRef =
    useRef<MaybeNull<ReturnType<typeof setTimeout>>>(null);

  const handleTogglePublish = useCallback(() => {
    const timeout = timeoutRef.current;
    if (!timeout) {
      let published: MaybeUndefined<boolean>;
      setPublished((prev) => {
        published = prev;
        return prev;
      });
      setButtonContent({
        icon: published ? <HiLink /> : <TbShare2 />,
        message: published ? "Unpublishing…" : "Publishing…",
      });
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
        }
        if (Math.random() <= 0.75) {
          let published: MaybeUndefined<boolean>;
          setPublished((prev) => {
            published = !prev;
            return published;
          });
          setButtonContent({
            icon: <IconCheckmark />,
            message: published ? "Published!" : "Unpublished!",
          });
        } else {
          setButtonContent({
            icon: <IconError />,
            message: published ? "Failed to unpublish" : "Failed to publish",
          });
        }
        feedbackTimeoutRef.current = setTimeout(() => {
          feedbackTimeoutRef.current = null;
          let published: MaybeUndefined<boolean>;
          setPublished((prev) => {
            published = prev;
            return prev;
          });
          setButtonContent(
            published
              ? { icon: <HiLink />, message: "Unpublish…" }
              : { icon: <TbShare2 />, message: "Publish…" }
          );
        }, 2_000);
      }, Math.random() * 2_000 + 1_500);
    }
  }, [setPublished]);

  const handleEnter = () => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setPublished((published) => {
          setButtonContent(
            published
              ? { icon: <HiLink />, message: "Unpublish…" }
              : { icon: <TbShare2 />, message: "Publish…" }
          );
          return published;
        });
      }, 1_500);
    }
  };

  return (
    <ButtonReveal
      speed={speed}
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
  );
};

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
  );
};

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
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: "draw-check 0.25s ease-in-out both",
          strokeDasharray: "130%",
        }}
      />
      <path
        d="M13 3L3 13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: "draw-check 0.25s ease-in-out both 0.1s",
          strokeDasharray: "130%",
        }}
      />
    </svg>
  );
};
