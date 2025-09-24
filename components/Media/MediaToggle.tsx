import styles from "./MediaToggle.module.scss"

export type MediaControlsProps = {
  onClick?: () => void
}

export const MediaToggle = ({ onClick }: MediaControlsProps) => {
  return (
    <div className={styles.toggle} role="button">
      <button className={styles.action} onClick={onClick}>
        <span className={styles.expand_label}>
          <svg
            className={styles.icon_expand}
            width="12"
            height="13"
            viewBox="0 0 12 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.25 7.75L10.75 11.25M10.75 7.75V11.25M7.25 11.25H10.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4.75 5.25L1.25 1.75M1.25 5.25L1.25 1.75M4.75 1.75L1.25 1.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>expand</span>
        </span>
        <span className={styles.collapse_label}>
          <svg
            className={styles.icon_collapse}
            width="12"
            height="13"
            viewBox="0 0 12 13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.75 11.25L7.25 7.75M7.25 10.75V7.75M10.25 7.75H7.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M1.25 1.75L4.75 5.25M4.75 2.25V5.25M1.75 5.25H4.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>collapse</span>
        </span>
      </button>
    </div>
  )
}
