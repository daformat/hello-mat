/*
 * JS mirrors of the CSS expressions the lab demonstrates.
 *
 * Only used when a browser cannot compute the relative-colour syntax itself.
 * Everywhere else the panes read what the engine actually painted, because a
 * simulation of a CSS bug is not evidence that the bug exists.
 *
 * These live here rather than in @daformat/contrast-color because they exist to
 * reproduce a declaration on this page, not to be used by anybody.
 */

import { type Rgb, yiqLuma } from "@daformat/contrast-color";

export const cssYiqFallback = (bgRgb: Rgb, steep: number): Rgb => {
  const v = Math.min(255, Math.max(0, (yiqLuma(bgRgb) - 128) * -steep));
  return [v / 255, v / 255, v / 255];
};

export const cssLumFallback = (bgRgb: Rgb): Rgb => {
  const Y =
    0.2126 * Math.pow(bgRgb[0], 2.2) +
    0.7152 * Math.pow(bgRgb[1], 2.2) +
    0.0722 * Math.pow(bgRgb[2], 2.2);
  const v = Math.min(255, Math.max(0, (Y - 0.1791288) * -100000));
  return [v / 255, v / 255, v / 255];
};
