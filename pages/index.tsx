import { JsonLd } from "@/components/PageMetas/JsonLd";
import { PageMetas } from "@/components/PageMetas/PageMetas";
import { StencilSvgAnimation } from "@/components/StencilSvg/StencilSvg";
import {
  AUTHOR_ALTERNATE_NAME,
  AUTHOR_NAME,
  AUTHOR_PROFILES,
  SITE_URL,
} from "@/constants/site";

const Homepage = () => {
  console.log(
    "Learn how to make this stencil effect with svg and javascript: https://observablehq.com/@daformat/distributing-circles-around-a-shape"
  );
  return (
    <>
      <PageMetas
        shortTitle="Hello Mat"
        title="Mathieu Jouhet, design engineer"
        description="I'm Mat, a design engineer. I build interface components for the web and write up how they work, down to the details you feel rather than see."
        url="/"
        image="https://hello-mat.com/media/hello-mat-light.png"
        imageWidth={1200}
        imageHeight={630}
      />

      {/* Ties "Mathieu Jouhet", "daformat", and this domain together as one
          person rather than three unrelated names. */}
      <JsonLd
        id="profile"
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            "@id": `${SITE_URL}#person`,
            name: AUTHOR_NAME,
            alternateName: AUTHOR_ALTERNATE_NAME,
            url: SITE_URL,
            jobTitle: "Design engineer",
            description:
              "Design engineer working on the web platform, with a bias for craft, accessibility, and the details that decide how an interface feels.",
            knowsAbout: [
              "Design engineering",
              "Front-end development",
              "React",
              "TypeScript",
              "CSS",
              "Web accessibility",
              "Interaction design",
            ],
            sameAs: AUTHOR_PROFILES,
          },
        }}
      />

      <StencilSvgAnimation />
    </>
  );
};

export default Homepage;
