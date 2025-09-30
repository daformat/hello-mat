import Head from "next/head"
import { StencilSvgAnimation } from "../components/StencilSvg/StencilSvg"

const Homepage = () => {
  console.log(
    "Learn how to make this stencil effect with svg and javascript: https://observablehq.com/@daformat/distributing-circles-around-a-shape"
  )
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
        Hello I’m Mat, Mathieu Jouhet
      </div>
    </>
  )
}

export default Homepage
