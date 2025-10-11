import { PropsWithChildren } from "react"

import styles from "./carousel.module.scss"

export const Carousel = ({ children }: PropsWithChildren) => {
  return <div className={styles.carousel}>{children}</div>
}

export const CarouselViewport = ({ children }: PropsWithChildren) => {
  return <div className={styles.carousel_viewport}>{children}</div>
}

export const CarouselContent = ({ children }: PropsWithChildren) => {
  return <div className={styles.carousel_content}>{children}</div>
}

export const CarouselItem = ({ children }: PropsWithChildren) => {
  return <div className={styles.carousel_item}>{children}</div>
}
