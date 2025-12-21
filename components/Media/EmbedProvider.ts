import { ComponentType } from "react";

import { ResizeType } from "@/components/Media/EmbedResult";
import { SizeInfo } from "@/components/Media/MediaComponent";
import SvgPlaceholderFlickr from "@/components/Media/Placeholder/SvgPlaceholderFlickr";
import SvgPlaceholderSpotify from "@/components/Media/Placeholder/SvgPlaceholderSpotify";
import SvgPlaceholderTwitter from "@/components/Media/Placeholder/SvgPlaceholderTwitter";
import SvgPlaceholderYoutube from "@/components/Media/Placeholder/SvgPlaceholderYoutube";

export type EmbedProvider = {
  name: string;
  regexp: RegExp;
  Placeholder: ComponentType<{ className?: string }>;
  getOEmbedUrl: (url: string) => string;
  responsive?: ResizeType;
  keepAspectRatio?: boolean;
  sizeInfo?: SizeInfo;
  isResizingDynamically?: boolean;
};

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
  {
    name: "flickr",
    regexp: /https?:\/\/(?:www\.)?(?:flic\.kr\/p|flickr.com\/photos)\/[^\s]+/i,
    Placeholder: SvgPlaceholderFlickr,
    getOEmbedUrl: (url) => `/api/oembed?url=${url}`,
    responsive: ResizeType.both,
    keepAspectRatio: true,
  },
  {
    name: "twitter/x",
    regexp:
      /https?:\/\/(?:www\.)?(twitter|x)\.com\/\w+\/status\/[0-9]+(?:\?s=[0-9]+)?/i,
    Placeholder: SvgPlaceholderTwitter,
    getOEmbedUrl: (url) => `/api/oembed?url=${url}`,
    responsive: ResizeType.horizontal,
    sizeInfo: {
      maxWidth: 550,
      minWidth: 250,
    },
    isResizingDynamically: true,
  },
];
