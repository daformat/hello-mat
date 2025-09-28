import styles from "./MediaSource.module.scss"

export const MediaSource = ({ source }: { source: string }) => {
  return (
    <a
      className={styles.source}
      href={source}
      target="_blank"
      rel="noopener"
      aria-label="Open source in new tab"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4.5 11.5L11.5 4.5M11.5 4.5V9.94444M11.5 4.5H6.05556"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  )
}
