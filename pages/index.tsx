import Head from "next/head"
import { StencilSvgAnimation } from "../components/StencilSvg/StencilSvg"

const Homepage = () => {
  return (
    <>
      <Head>
        <title>Hello Mat</title>
        <meta name="description" content="Crafting the web" />
      </Head>

      <StencilSvgAnimation />

      <div
        style={{
          opacity: 0.01,
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        Hello I’m Mat
      </div>
    </>
  )
}

export default Homepage
