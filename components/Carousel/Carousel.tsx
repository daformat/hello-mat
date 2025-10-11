import { PropsWithChildren } from "react"

import styles from "./Carousel.module.scss"

const CarouselRoot = ({ children }: PropsWithChildren) => {
  return <div className={styles.carousel}>{children}</div>
}

const CarouselViewport = ({ children }: PropsWithChildren) => {
  return <div className={styles.carousel_viewport}>{children}</div>
}

const CarouselContent = ({ children }: PropsWithChildren) => {
  return <div className={styles.carousel_content}>{children}</div>
}

const CarouselItem = ({ children }: PropsWithChildren) => {
  return <div className={styles.carousel_item}>{children}</div>
}

export const Carousel = {
  Root: CarouselRoot,
  Viewport: CarouselViewport,
  Content: CarouselContent,
  Item: CarouselItem,
}
