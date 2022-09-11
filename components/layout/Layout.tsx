import Head from 'next/head'
import { ReactNode } from 'react'
import styles from './Layout.module.scss'
import { StartupImages } from './StartupImages'

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
      <svg
        className={styles.logo}
        width="38"
        height="38"
        viewBox="0 0 38 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M38 19C38 29.4934 29.4934 38 19 38C8.50659 38 0 29.4934 0 19C0 8.50659 8.50659 0 19 0C29.4934 0 38 8.50659 38 19ZM9.22146 27.6363H13.2332L13.261 10.3636H9.22146V12.0909H11.5338V25.9369H9.22146V27.6363ZM13.8182 10.3636L17.2728 24.1818H18.9722H20.7273L24.2097 10.3636H22.7053L18.9722 24.1818L15.2669 10.3636H13.8182ZM24.7669 10.3636V27.6363H28.8065V25.9369H26.4942V12.0909H28.8065V10.3636H24.7669Z"
          fill="currentColor"
        />
      </svg>

      {children}
    </div>
  </>
)
