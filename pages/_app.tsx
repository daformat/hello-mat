import "../styles/globals.scss"
import type { AppProps } from "next/app"
import { Layout } from "../components/layout/Layout"
import { useEffect } from "react"
import Head from "next/head"

function HelloMat({ Component, pageProps }: AppProps) {
  // Listen to screen orientation changes
  useEffect(() => {
    const updateOrientation = () => {
      const body = document.body
      body.classList.remove(
        "orientation_landscape_primary",
        "orientation_landscape_secondary",
        "orientation_portrait_primary",
        "orientation_portrait_secondary"
      )
      if (screen.orientation) {
        body.classList.add(
          `orientation_${screen.orientation.type.replace("-", "_")}`
        )
      }
    }
    updateOrientation()
    if (screen.orientation) {
      screen.orientation.addEventListener("change", updateOrientation)
    }
    window.addEventListener("orientationchange", updateOrientation)
    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener("change", updateOrientation)
      }
      window.removeEventListener("orientationchange", updateOrientation)
    }
  }, [])

  // Listen to visual viewport changes
  useEffect(() => {
    if (window.visualViewport) {
      const handleViewportChange = () => {
        const height = window.visualViewport.height
        document.documentElement.style.setProperty(
          "--viewport-height",
          `${height}px`
        )
      }
      handleViewportChange()
      window.visualViewport.addEventListener("resize", handleViewportChange)
      return () => {
        window.visualViewport.removeEventListener(
          "resize",
          handleViewportChange
        )
      }
    }
  }, [])

  return (
    <Layout>
      <Head>
        <meta
          name="og:site_name"
          content="Hello Mat - Mathieu Jouhet - Design engineering portfolio"
        />
      </Head>
      <Component {...pageProps} />
    </Layout>
  )
}

export default HelloMat
