import Head from "next/head";
import React from "react";

enum Theme {
  dark = "dark",
  light = "light",
}

export type StartupImage = {
  // the target device width
  width: number;
  // the target device height
  height: number;
  // the target device pixel ratio
  pixel_ratio: number;
  // the portrait image filename
  portrait: string;
  // the landscape image filename
  landscape: string;
};

// Base list of all the images we need, we use this to compute subsequent variations
// iOS requires us to have a list of every possible variation and be verbose about the startup images
// Make sure the images are not too heavy (= use less colors and details to keep minimal file size)
export const defaultStartupImages: StartupImage[] = [
  {
    width: 1024,
    height: 1366,
    pixel_ratio: 2,
    portrait: "12.9__iPad_Pro_portrait.png",
    landscape: "12.9__iPad_Pro_landscape.png",
  },
  {
    width: 834,
    height: 1194,
    pixel_ratio: 2,
    portrait: "11__iPad_Pro__10.5__iPad_Pro_portrait.png",
    landscape: "11__iPad_Pro__10.5__iPad_Pro_landscape.png",
  },
  {
    width: 820,
    height: 1180,
    pixel_ratio: 2,
    portrait: "10.9__iPad_Air_portrait.png",
    landscape: "10.9__iPad_Air_landscape.png",
  },
  {
    width: 834,
    height: 1112,
    pixel_ratio: 2,
    portrait: "10.5__iPad_Air_portrait.png",
    landscape: "10.5__iPad_Air_landscape.png",
  },
  {
    width: 810,
    height: 1080,
    pixel_ratio: 2,
    portrait: "10.2__iPad_portrait.png",
    landscape: "10.2__iPad_landscape.png",
  },
  {
    width: 768,
    height: 1024,
    pixel_ratio: 2,
    portrait:
      "9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad_portrait.png",
    landscape:
      "9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad_landscape.png",
  },
  {
    width: 428,
    height: 926,
    pixel_ratio: 3,
    portrait:
      "iPhone_14_Pro_Max__iPhone_14_Max__iPhone_13_Pro_Max__iPhone_12_Pro_Max_portrait.png",
    landscape:
      "iPhone_14_Pro_Max__iPhone_14_Max__iPhone_13_Pro_Max__iPhone_12_Pro_Max_landscape.png",
  },
  {
    width: 390,
    height: 844,
    pixel_ratio: 3,
    portrait:
      "iPhone_14_Pro__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_portrait.png",
    landscape:
      "iPhone_14_Pro__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_landscape.png",
  },
  {
    width: 375,
    height: 812,
    pixel_ratio: 3,
    portrait:
      "iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_portrait.png",
    landscape:
      "iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_landscape.png",
  },
  {
    width: 414,
    height: 896,
    pixel_ratio: 3,
    portrait: "iPhone_11_Pro_Max__iPhone_XS_Max_portrait.png",
    landscape: "iPhone_11_Pro_Max__iPhone_XS_Max_landscape.png",
  },
  {
    width: 414,
    height: 896,
    pixel_ratio: 2,
    portrait: "iPhone_11__iPhone_XR_portrait.png",
    landscape: "iPhone_11__iPhone_XR_landscape.png",
  },
  {
    width: 414,
    height: 736,
    pixel_ratio: 3,
    portrait:
      "iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus_portrait.png",
    landscape:
      "iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus_landscape.png",
  },
  {
    width: 375,
    height: 667,
    pixel_ratio: 2,
    portrait:
      "iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE_portrait.png",
    landscape:
      "iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE_landscape.png",
  },
  {
    width: 320,
    height: 568,
    pixel_ratio: 2,
    portrait: "4__iPhone_SE__iPod_touch_5th_generation_and_later_portrait.png",
    landscape:
      "4__iPhone_SE__iPod_touch_5th_generation_and_later_landscape.png",
  },
];

// Generate the image path for the given image
const imagePath = (filename: string, _mode?: Theme): string =>
  `/splash_screens/${filename}`;

// Precomputed image variations
const createThemedStartupImages = (startupImages: StartupImage[]) =>
  startupImages.flatMap((imageInfos) => [
    {
      ...imageInfos,
      orientation: "portrait",
      image: imagePath(imageInfos.portrait),
    },
    {
      ...imageInfos,
      orientation: "landscape",
      image: imagePath(imageInfos.landscape),
    },
  ]);

/**
 * Create the markup for iOS startup images
 */
export const StartupImages = ({
  startupImages = defaultStartupImages,
}: {
  startupImages?: StartupImage[];
}) => {
  const themedImages = createThemedStartupImages(startupImages);
  return (
    <Head>
      {themedImages.map((startupImageInfos) => {
        const { width, height, pixel_ratio, orientation, image } =
          startupImageInfos;
        return (
          <link
            key={`${image}`}
            rel="apple-touch-startup-image"
            media={`screen and (device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${pixel_ratio}) and (orientation: ${orientation})`}
            href={image}
          />
        );
      })}
    </Head>
  );
};
