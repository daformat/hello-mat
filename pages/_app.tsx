import "../styles/globals.scss"
import type { AppProps } from "next/app"
import { Layout } from "../components/layout/Layout"
import { useEffect } from "react"

function HelloMat({ Component, pageProps }: AppProps) {
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
      <Component {...pageProps} />
    </Layout>
  )
}

export default HelloMat
