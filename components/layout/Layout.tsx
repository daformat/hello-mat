import Head from "next/head"
import Link from "next/link"
import { ReactNode } from "react"
import styles from "./Layout.module.scss"
import { StartupImages } from "./StartupImages"

export const Layout = ({ children }: { children: ReactNode }) => (
  <>
    <Head>
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link rel="manifest" href="/site.webmanifest" />
      {/* <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" /> */}
      <meta name="msapplication-TileColor" content="#da532c" />
      <meta
        name="theme-color"
        content="#fff2eb"
        media="(prefers-color-scheme: light)"
      />
      <meta
        name="theme-color"
        content="#0d0a15"
        media="(prefers-color-scheme: dark)"
      />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      <meta
        name="viewport"
        content="viewport-fit=cover, user-scalable=no, width=device-width, initial-scale=1, maximum-scale=1"
      />
    </Head>
    <StartupImages />
    <div className={styles.layout}>
      <Header />
      {children}
    </div>
  </>
)

export const Header = () => (
  <div className={styles.header}>
    <Logo />
    <Link href="https://observablehq.com/@daformat">
      <a
        aria-label="Code explorations and how-to's on Observable"
        target="_blank"
        rel="noopener"
      >
        <LogoObservable />
      </a>
    </Link>
    <Link href="https://twitter.com/daformat">
      <a aria-label="Updates on twitter" target="_blank" rel="noopener">
        <LogoTwitter />
      </a>
    </Link>
    <Link href="https://daformat.medium.com">
      <a
        aria-label="Alors et la poésie, ça vaut bien le prix d'un sandwich, il faut écouter un poème"
        target="_blank"
        rel="noopener"
      >
        <LogoMedium />
      </a>
    </Link>
  </div>
)

export const Logo = () => (
  <svg
    className={styles.logo}
    width="38"
    height="38"
    viewBox="0 0 38 38"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Mathieu Jouhet</title>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M38 19C38 29.4934 29.4934 38 19 38C8.50659 38 0 29.4934 0 19C0 8.50659 8.50659 0 19 0C29.4934 0 38 8.50659 38 19ZM9.22146 27.6363H13.2332L13.261 10.3636H9.22146V12.0909H11.5338V25.9369H9.22146V27.6363ZM13.8182 10.3636L17.2728 24.1818H18.9722H20.7273L24.2097 10.3636H22.7053L18.9722 24.1818L15.2669 10.3636H13.8182ZM24.7669 10.3636V27.6363H28.8065V25.9369H26.4942V12.0909H28.8065V10.3636H24.7669Z"
      fill="currentColor"
    />
  </svg>
)

export const LogoObservable = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Code explorations on Observable</title>
    <path
      d="M18 23.3334C17.2613 23.3334 16.6213 23.1786 16.08 22.8694C15.5406 22.5612 15.1094 22.1247 14.8353 21.6095C14.544 21.0734 14.3307 20.5064 14.2007 19.9224C14.0627 19.289 13.9955 18.6451 14 18C14 17.4892 14.0347 17.0009 14.1047 16.5339C14.174 16.0676 14.3027 15.5935 14.49 15.1123C14.6773 14.6311 14.9187 14.2139 15.2127 13.8601C15.5187 13.4977 15.9145 13.2027 16.3693 12.9979C16.8467 12.7769 17.3893 12.6667 18 12.6667C18.7387 12.6667 19.3787 12.8213 19.92 13.1307C20.4594 13.4388 20.8906 13.8753 21.1647 14.3905C21.454 14.9209 21.6653 15.4833 21.7994 16.0776C21.9327 16.6714 22 17.3126 22 18C22 18.5108 21.9653 18.9991 21.8954 19.4661C21.8207 19.9509 21.6889 20.4274 21.502 20.8877C21.3087 21.3689 21.0687 21.7861 20.7793 22.1399C20.49 22.4936 20.1073 22.781 19.6307 23.0021C19.154 23.2231 18.6107 23.3334 18 23.3334ZM19.412 19.412C19.7946 19.0427 20.0074 18.5317 20 18C20 17.4506 19.8086 16.98 19.4267 16.588C19.044 16.196 18.5686 16 18 16C17.4314 16 16.956 16.196 16.5733 16.588C16.1986 16.9614 15.9917 17.4711 16 18C16 18.5494 16.1913 19.02 16.5733 19.412C16.956 19.804 17.4314 20 18 20C18.5686 20 19.0394 19.804 19.412 19.412ZM18 26C22.418 26 26 22.418 26 18C26 13.582 22.418 10 18 10C13.582 10 10 13.582 10 18C10 22.418 13.582 26 18 26Z"
      fill="currentColor"
    />
  </svg>
)

export const LogoTwitter = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>I tweet, therefore I am</title>
    <path
      d="M14.8253 25C21.2822 24.9968 24.8125 19.6108 24.8125 14.9426C24.8125 14.7895 24.8125 14.6396 24.803 14.4864C25.4891 13.9872 26.0864 13.3652 26.5554 12.6571C25.9264 12.9394 25.2498 13.1292 24.54 13.2153C25.2641 12.7767 25.8202 12.0829 26.0833 11.26C25.4051 11.6635 24.654 11.9585 23.8539 12.1164C23.2137 11.4306 22.301 11 21.2917 11C19.3523 11 17.7804 12.5853 17.7804 14.5359C17.7804 14.8134 17.8121 15.0829 17.8708 15.3413C14.9521 15.1946 12.3646 13.7879 10.6327 11.6491C10.3317 12.1707 10.1574 12.7783 10.1574 13.4258C10.1574 14.6539 10.7753 15.7352 11.7197 16.3684C11.1429 16.3525 10.6026 16.193 10.1288 15.9266V15.9713C10.1304 17.681 11.341 19.11 12.9445 19.4354C12.6514 19.5152 12.3424 19.5582 12.0207 19.5582C11.7957 19.5582 11.5771 19.5359 11.3616 19.4944C11.81 20.8979 13.1046 21.9187 14.6415 21.9506C13.4405 22.8963 11.9273 23.4609 10.2841 23.4609C9.99891 23.4609 9.72004 23.445 9.44434 23.4131C10.9972 24.4147 12.8431 25 14.8269 25"
      fill="currentColor"
    />
  </svg>
)

export const LogoMedium = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>
      Alors et la poésie, ça vaut bien le prix d’un sandwich, il faut écouter un
      poème
    </title>
    <path
      d="M19.3209 18.0001C19.3209 21.2337 16.7173 23.855 13.5059 23.855C10.2944 23.855 7.69067 21.2331 7.69067 18.0001C7.69067 14.7671 10.2942 12.145 13.5059 12.145C16.7175 12.145 19.3209 14.7665 19.3209 18.0001ZM25.7001 18.0001C25.7001 21.0439 24.3984 23.5123 22.7925 23.5123C21.1867 23.5123 19.8849 21.0439 19.8849 18.0001C19.8849 14.9564 21.1865 12.488 22.7923 12.488C24.3982 12.488 25.6999 14.9556 25.6999 18.0001M28.3094 18.0001C28.3094 20.7266 27.8516 22.9381 27.2868 22.9381C26.722 22.9381 26.2644 20.7272 26.2644 18.0001C26.2644 15.2731 26.7222 13.0621 27.2868 13.0621C27.8514 13.0621 28.3094 15.2729 28.3094 18.0001"
      fill="currentColor"
    />
  </svg>
)
