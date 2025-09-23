// pages/api/oembed.ts (Pages Router)
// or app/api/oembed/route.ts (App Router)

import type { NextApiRequest, NextApiResponse } from "next"
import { NextRequest, NextResponse } from "next/server"

// -----------------------------
// Types
// -----------------------------

type AllowedDomain = string

type SupportedProviderDomain =
  | "youtube.com"
  | "youtu.be"
  | "vimeo.com"
  | "twitter.com"
  | "x.com"
  | "instagram.com"
  | "tiktok.com"
  | "soundcloud.com"
  | "spotify.com"
  | "codepen.io"
  | "flickr.com"

type OEmbedCommon = {
  type?: "photo" | "video" | "link" | "rich"
  version?: string | number
  title?: string
  author_name?: string
  author_url?: string
  provider_name?: string
  provider_url?: string
  cache_age?: string | number
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  html?: string
  width?: number
  height?: number
  url?: string
  description?: string
  // Keep index signature to be resilient to provider-specific extras
  [key: string]: unknown
}

type ErrorBody = { error: string }

// -----------------------------
// Helpers
// -----------------------------

function isValidOrigin(origin: string, allowedDomain: AllowedDomain): boolean {
  try {
    const originUrl = new URL(origin)
    const allowedUrl = new URL(
      `https://${allowedDomain.replace(/^https?:\/\//, "")}`
    )
    return originUrl.hostname === allowedUrl.hostname
  } catch {
    return false
  }
}

function isValidUrl(str: unknown): str is string {
  if (typeof str !== "string") return false
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

function isSupportedProvider(urlStr: string): boolean {
  const supportedDomains: SupportedProviderDomain[] = [
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "tiktok.com",
    "soundcloud.com",
    "spotify.com",
    "codepen.io",
    "flickr.com",
  ]
  try {
    const urlObj = new URL(urlStr)
    return supportedDomains.some(
      (domain) =>
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

function getOEmbedEndpoint(urlStr: string): string | null {
  const urlObj = new URL(urlStr)
  const hostname = urlObj.hostname

  // oEmbed endpoints for major providers
  const endpoints: Record<SupportedProviderDomain, string> = {
    "youtube.com": "https://www.youtube.com/oembed",
    "youtu.be": "https://www.youtube.com/oembed",
    "vimeo.com": "https://vimeo.com/api/oembed.json",
    "twitter.com": "https://publish.twitter.com/oembed",
    "x.com": "https://publish.twitter.com/oembed",
    "instagram.com": "https://graph.facebook.com/v18.0/instagram_oembed",
    "tiktok.com": "https://www.tiktok.com/oembed",
    "soundcloud.com": "https://soundcloud.com/oembed",
    "spotify.com": "https://open.spotify.com/oembed",
    "codepen.io": "https://codepen.io/api/oembed",
    "flickr.com": "http://www.flickr.com/services/oembed/",
  }

  for (const [domain, endpoint] of Object.entries(endpoints)) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      return endpoint
    }
  }
  return null
}

function sanitizeOEmbedData<T extends OEmbedCommon>(data: T): OEmbedCommon {
  const allowedFields: (keyof OEmbedCommon)[] = [
    "type",
    "version",
    "title",
    "author_name",
    "author_url",
    "provider_name",
    "provider_url",
    "cache_age",
    "thumbnail_url",
    "thumbnail_width",
    "thumbnail_height",
    "html",
    "width",
    "height",
    "url",
    "description",
  ]

  const sanitized: OEmbedCommon = {}
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sanitized[field] = data[field]
    }
  }
  return sanitized
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
) {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    init?.timeoutMs ?? 10_000
  )
  try {
    const resp = await fetch(input, { ...init, signal: controller.signal })
    return resp
  } finally {
    clearTimeout(timeout)
  }
}

// -----------------------------
// Pages Router handler
// -----------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OEmbedCommon | ErrorBody>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    // Check origin/referer against allowed domains
    const origin =
      (req.headers.origin as string | undefined) ??
      (req.headers.referer as string | undefined)
    const allowedDomain = process.env.ALLOWED_DOMAIN

    if (!allowedDomain) {
      return res.status(500).json({ error: "Server configuration error" })
    }

    // Validate origin
    if (!origin || !isValidOrigin(origin, allowedDomain)) {
      return res.status(403).json({ error: "Forbidden: Invalid origin" })
    }

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", allowedDomain)
    res.setHeader("Access-Control-Allow-Methods", "POST")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.setHeader("Access-Control-Allow-Credentials", "true")

    const url = req.query.url

    if (!url) {
      return res.status(400).json({ error: "URL is required" })
    }

    // Validate the URL format
    if (!isValidUrl(url)) {
      return res.status(400).json({ error: "Invalid URL format" })
    }

    // Check if URL is from a supported oEmbed provider
    if (!isSupportedProvider(url)) {
      return res.status(400).json({ error: "Unsupported provider" })
    }

    // Get oEmbed endpoint for the URL
    const oEmbedEndpoint = getOEmbedEndpoint(url)
    if (!oEmbedEndpoint) {
      return res
        .status(400)
        .json({ error: "No oEmbed endpoint found for this URL" })
    }

    // Fetch oEmbed data
    const oEmbedUrl = `${oEmbedEndpoint}?url=${encodeURIComponent(
      url
    )}&format=json`
    const response = await fetchWithTimeout(oEmbedUrl, {
      headers: {
        "User-Agent": "YourApp/1.0 (https://yourapp.com)",
      },
      timeoutMs: 10_000,
    })

    if (!response.ok) {
      throw new Error(`oEmbed request failed: ${response.status}`)
    }

    const oEmbedData = (await response.json()) as OEmbedCommon

    // Sanitize the response (remove potentially harmful content)
    const sanitizedData = sanitizeOEmbedData(oEmbedData)

    return res.status(200).json(sanitizedData)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("oEmbed fetch error:", error)
    return res.status(500).json({ error: "Failed to fetch oEmbed data" })
  }
}

// -----------------------------
// App Router handler (alternative)
// -----------------------------

export async function POST(request: NextRequest) {
  try {
    // Check origin against allowed domains
    const origin = request.headers.get("origin") ?? undefined
    const allowedDomain = process.env.ALLOWED_DOMAIN

    if (!allowedDomain) {
      return NextResponse.json<ErrorBody>(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    if (!origin || !isValidOrigin(origin, allowedDomain)) {
      return NextResponse.json<ErrorBody>(
        { error: "Forbidden: Invalid origin" },
        { status: 403 }
      )
    }

    const body = (await request.json()) as { url?: unknown }
    const url = body?.url

    if (!url || !isValidUrl(url) || !isSupportedProvider(url)) {
      return NextResponse.json<ErrorBody>(
        { error: "Invalid or unsupported URL" },
        { status: 400 }
      )
    }

    const oEmbedEndpoint = getOEmbedEndpoint(url)
    if (!oEmbedEndpoint) {
      return NextResponse.json<ErrorBody>(
        { error: "No oEmbed endpoint found" },
        { status: 400 }
      )
    }

    const oEmbedUrl = `${oEmbedEndpoint}?url=${encodeURIComponent(
      url
    )}&format=json`
    const response = await fetchWithTimeout(oEmbedUrl, {
      headers: { "User-Agent": "YourApp/1.0 (https://yourapp.com)" },
      timeoutMs: 10_000,
    })

    if (!response.ok) {
      throw new Error(`oEmbed request failed: ${response.status}`)
    }

    const oEmbedData = (await response.json()) as OEmbedCommon
    const sanitizedData = sanitizeOEmbedData(oEmbedData)

    return NextResponse.json<OEmbedCommon>(sanitizedData, {
      headers: {
        "Access-Control-Allow-Origin": allowedDomain,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("oEmbed fetch error:", error)
    return NextResponse.json<ErrorBody>(
      { error: "Failed to fetch oEmbed data" },
      { status: 500 }
    )
  }
}
