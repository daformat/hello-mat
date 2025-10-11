import { MaybeNull } from "@/components/Media/utils/maybe"

export enum RecognizedContentType {
  video = "video",
  photo = "photo",
  link = "link",
  rich = "rich",
}

export enum ResizeType {
  horizontal = "horizontal",
  vertical = "vertical",
  both = "both",
}

export interface EmbedResult {
  /**
   * The content original height in pixels
   */
  height?: number

  /**
   * The content original width in pixels
   */
  width?: number

  /**
   * Whether the content should be resized proportionally
   */
  keepAspectRatio?: boolean

  /**
   * The content minimum height in pixels
   */
  minHeight?: number

  /**
   * The content minimum width in pixels
   */
  minWidth?: number

  /**
   * The content minimum height in pixels
   */
  maxHeight?: number

  /**
   * The content minimum width in pixels
   */
  maxWidth?: number

  /**
   * In what dimensions can the content be resized
   */
  responsive?: ResizeType

  /**
   * The recognized content type
   */
  type: RecognizedContentType

  /**
   * The content title
   */
  title: string

  /**
   * The content URL
   */
  url: string

  /**
   * The HTML code to embed the content
   */
  html: string

  /**
   * The content thumbnail URL
   */
  thumbnail?: string

  provider: string

  favicon?: string
}

export type OEmbedPhotoPayload = {
  type: "photo"
  url: string
  html?: never
  width: number | string
  height: number | string
}

export type OEmbedVideoPayload = {
  type: "video"
  url?: never
  html: string
  width: number | string
  height: number | string
}

export type OEmbedLinkPayload = {
  type: "link"
  url?: never
  html?: never
  width?: never
  height?: never
}

export type OEmbedRichPayload = {
  type: "rich"
  url?: never
  html: string
  width: MaybeNull<number | string>
  height: MaybeNull<number | string>
}

export type OEmbedPayload = {
  version: string
  title?: string
  author_name?: string
  author_url?: string
  provider_name?: string
  provider_url?: string
  cache_age?: number | string
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
}

export type OEmbed = (
  | OEmbedPhotoPayload
  | OEmbedVideoPayload
  | OEmbedLinkPayload
  | OEmbedRichPayload
) &
  OEmbedPayload

export type OEmbedResult = {
  oEmbed: OEmbed
}
