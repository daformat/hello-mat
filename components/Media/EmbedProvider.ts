import { ComponentType } from "react"
import SvgPlaceholderYoutube from "./Placeholder/SvgPlaceholderYoutube"
import SvgPlaceholderSpotify from "./Placeholder/SvgPlaceholderSpotify"
import { ResizeType } from "./EmbedResult"

export type EmbedProvider = {
  name: string
  regexp: RegExp
  Placeholder: ComponentType<{ className: string }>
  getOEmbedUrl: (url: string) => string
  responsive?: ResizeType
  keepAspectRatio?: boolean
}

export const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    name: "youtube",
    regexp:
      /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*v=|v\/)))([-a-zA-Z0-9_]{11,})/,
    Placeholder: SvgPlaceholderYoutube,
    getOEmbedUrl: (url) =>
      `https://www.youtube.com/oembed?url=${url}&format=json&autoplay=1&mute=1`,
    responsive: ResizeType.both,
    keepAspectRatio: true,
  },
  {
    name: "spotify",
    regexp:
      /https?:\/\/(www|open|play)\.?spotify\.com\/(artist|track|playlist|show|album)\/([\w\-/]+)/,
    Placeholder: SvgPlaceholderSpotify,
    getOEmbedUrl: (url) => `https://open.spotify.com/oembed?url=${url}`,
    responsive: ResizeType.horizontal,
  },
]
