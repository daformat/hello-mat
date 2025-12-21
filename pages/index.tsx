import { PageMetas } from "@/components/PageMetas/PageMetas";
import { StencilSvgAnimation } from "@/components/StencilSvg/StencilSvg";

const Homepage = () => {
  console.log(
    "Learn how to make this stencil effect with svg and javascript: https://observablehq.com/@daformat/distributing-circles-around-a-shape"
  );
  return (
    <>
      <PageMetas
        title="Hello Mat - Design engineering"
        description="Crafting the web. Portfolio of Mathieu Jouhet, design engineer."
        url="https://hello-mat.com"
        image="https://hello-mat.com/media/hello-mat-light.png"
        imageWidth={1200}
        imageHeight={630}
      />

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
  );
};

export default Homepage;
