import {
  AnimationEvent as ReactAnimationEvent,
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  Fragment,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useReducedMotion } from "@/hooks/useReducedMotion";

import styles from "./BeamDemo.module.scss";

/**
 * The product demo from beam's landing page, ported to React.
 *
 * One fake beam window, and a title above it that changes as the window goes
 * through the four things the app did: it was a notes app, it captured the
 * web into those notes, the notes were yours, and you could publish them. On
 * the site the demo played once as you scrolled to it and ended on a download
 * button; here it loops, and the chapter bar under it is the way through it.
 *
 * The window is a working prototype rather than a film of one: the tabs
 * switch pages, the search opens the omnibox, the switcher flips between the
 * web and the notes, and the publish button publishes.
 */

type Mode = "web" | "writing";
type WebPage = "bmail" | "beam-times" | "youtube";
type WritingPage = "journal" | "all-notes" | "note";
/** The four blocks on every web page a capture walks over, in the order the
 *  site's script visited them. */
type Slot = "first" | "second" | "third" | "last";
type ChapterId = "notes" | "capture" | "share";

/** What a capture lifts into the journal: the blocks it was aimed at, as
 *  lines, images and, on the mail page, an avatar. */
type Item = {
  kind: "p" | "img" | "circle";
  size?: "large" | "medium" | "small";
};
type Insert = { id: number; media: boolean; items: Item[]; fresh: boolean };

type PublishPhase = "idle" | "publishing" | "published" | "link";
type PublishState = { phase: PublishPhase; open: boolean; tooltip: boolean };

const WEB_TABS: {
  page: WebPage;
  label: string;
  url: string;
  pinned?: boolean;
}[] = [
  {
    page: "bmail",
    label: "Welcome to beam! - bmail",
    url: "https://www.bmail.com",
    pinned: true,
  },
  {
    page: "beam-times",
    label: "The beam Times - Breaking News",
    url: "https://www.thebeamtimes.com",
  },
  {
    page: "youtube",
    label: "You On Kazoo! - YouTube",
    url: "https://youtube.com/",
  },
];

const WRITING_TABS: { page: WritingPage; label: string }[] = [
  { page: "journal", label: "Journal" },
  { page: "all-notes", label: "All notes" },
  { page: "note", label: "Note" },
];

const WEB_PAGES: WebPage[] = ["bmail", "beam-times", "youtube"];

/** The lines the journal opens with: the site's own copy. */
const JOURNAL = {
  today: [
    "Markdown support",
    "Backlinks",
    "Encrypted end-to-end",
    "Organized around your Journal",
  ],
  yesterday: [
    "⌘K to search the web & your notes",
    "⌘D to toggle between the web & your notes",
    "Hold ⌥ & click to capture everything on the web",
  ],
};

/** The titles, in the order the site showed them. The last stood where the
 *  site had its download button: the loop needs somewhere to land, and the
 *  line the site opened on is the one it has. */
const TITLES: ReactNode[] = [
  <>
    Beneath your <br />
    <strong>browser</strong>…
  </>,
  <>
    A <br />
    <strong>powerful note</strong> app…
  </>,
  <>
    So you can <br />
    <strong>capture</strong> the web…
  </>,
  <>
    Make it <br />
    <strong>your own</strong>…
  </>,
  <>
    And <strong>share it</strong> <br />
    with the world
  </>,
  <>
    Meet the <strong>bright web</strong>
  </>,
];

const CHAPTERS: { id: ChapterId; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "capture", label: "Capture" },
  { id: "share", label: "Share" },
];

const PUBLISH_LABELS: Record<PublishPhase, string> = {
  idle: "Publish",
  publishing: "Publishing...",
  published: "Published!",
  // The site's unpublish label was empty: once published, the button is the
  // link icon and nothing else.
  link: "",
};

const IDLE_PUBLISH: PublishState = {
  phase: "idle",
  open: false,
  tooltip: false,
};

const cx = (...names: (string | undefined | false | null)[]) =>
  names.filter(Boolean).join(" ");

/** The site's omnibox easter egg: the letters of the query, and nothing
 *  else of it, beginning "beammeup". */
const BEAM_ME_UP_LABEL = "Download beam beta 😎";
const isBeamMeUp = (query: string) =>
  query.replace(/[^a-z]/g, "").startsWith("beammeup");

/** Thrown out of a wait the loop was parked in when a click takes over. */
class Interrupted extends Error {}

/* ------------------------------------------------------------------ icons */

/** "The Beam Times", in blackletter: the site's masthead, one path. The
 *  favicon is the same path with the viewBox closed in on its B. */
const MASTHEAD =
  "M2.13279 5.79479C2.13279 5.00146 2.87945 4.58146 3.67279 4.58146C4.76945 4.58146 8.82945 5.88812 11.0228 6.16813V9.03812L9.50612 10.5781L11.0228 12.1181V16.0848C10.2761 16.4581 9.41279 16.6915 8.43279 16.6915C6.93945 16.6915 5.65612 16.1081 4.72279 15.1981L8.85279 13.4715V6.37812L3.71945 8.57146C4.44279 6.98479 5.65612 6.07479 6.07612 5.81812L5.84279 5.46812C2.38945 6.05146 0.33612 9.10812 0.33612 11.9781C0.33612 16.2948 3.99945 19.2581 7.80279 19.2581C11.5828 19.2581 14.5695 16.4115 14.5695 12.8648C14.5695 12.7948 14.5695 12.7015 14.5695 12.6315H14.1261C13.6595 13.7981 12.8195 14.9415 11.6761 15.7115V12.1415L13.2395 10.5781L11.6761 9.01479V6.21479C11.6995 6.21479 11.6995 6.21479 11.6995 6.21479C13.4028 6.21479 14.8728 5.30479 14.8728 3.62479C14.8728 1.92146 13.1695 0.731458 10.9761 0.894791V1.33812C11.6995 1.43146 12.7728 1.54813 12.7728 2.36479C12.7728 2.87812 12.2828 3.11146 11.7928 3.11146C9.64612 3.11146 6.56612 1.45479 4.58279 1.45479C2.31945 1.45479 0.89612 2.90146 0.89612 4.58146C0.89612 5.79479 1.61945 6.65812 2.48279 7.03146L2.71612 6.70479C2.38945 6.56479 2.13279 6.23812 2.13279 5.79479ZM3.39279 9.36479L5.84279 8.33812V14.0548L4.30279 14.7081C3.55612 13.7515 3.13612 12.5148 3.13612 11.2315C3.13612 10.5548 3.22945 9.92479 3.39279 9.36479ZM20.2985 16.5515V10.7881L21.5818 9.57479L22.9818 10.7415V16.6681C22.9818 19.0948 22.1418 21.3581 20.4152 21.3581V21.9181C20.6485 21.9415 20.8818 21.9648 21.1385 21.9648C25.1985 21.9648 25.9918 19.0715 25.9918 16.6681V10.0181L26.9952 9.20146L26.5985 8.68813L25.6652 9.43479L23.1918 7.38146L20.2985 10.1115V1.45479H19.8552L16.0518 4.13812V4.46479C17.1718 4.81479 17.1718 5.32812 17.1718 5.70146V16.3181L15.5852 17.3215L16.0052 17.8581L16.8918 17.2981L19.2952 19.3515L22.1885 17.3215L21.7685 16.8081L21.0452 17.2981L20.2985 16.5515ZM27.8159 17.8348L28.8425 16.9948L32.3192 19.5615L37.1259 15.6648L36.7759 15.1048L34.2092 17.1115L31.4092 15.1981V14.1948L36.4492 11.0681V10.9515L34.0925 7.38146L28.5159 10.2748V16.4348L27.3959 17.3215L27.8159 17.8348ZM31.4092 13.4015V9.41146L31.8525 9.15479L33.7659 11.9081L31.4092 13.4015ZM46.3972 10.7648C46.6305 10.7648 46.8872 10.7648 47.1205 10.7648C47.1205 11.3015 47.1205 11.8381 47.1205 12.3515C47.1205 14.3115 46.9805 15.8048 45.6972 16.5515L45.9072 17.1115C48.0772 16.5748 50.1305 15.1281 50.1305 12.2348V6.44812C50.1305 5.58479 50.3872 5.11813 50.9005 4.72146L54.3539 2.03812L54.4939 1.50146C53.9572 1.82812 53.2105 2.08479 52.4172 2.08479C51.2972 2.08479 50.3172 1.64146 49.2205 1.64146C47.1905 1.64146 45.7672 3.11146 45.1839 4.53479H45.7205C45.9539 3.92812 46.5372 3.50813 47.3539 3.50813C48.4039 3.50813 49.1505 4.06812 50.2239 4.06812C50.3172 4.06812 50.4105 4.04479 50.4805 4.04479C49.8272 4.46479 49.1739 4.88479 48.5205 5.30479C47.7272 5.79479 47.1205 6.26146 47.1205 7.54479V8.15146C46.6072 8.22146 46.0939 8.31479 45.6272 8.52479C44.8572 8.89812 44.2739 9.64479 44.2739 10.7415C44.2739 11.2315 44.3905 11.6981 44.6239 12.1181H45.0672C44.9039 11.2081 45.5572 10.7648 46.3972 10.7648ZM55.9172 16.3881C55.9172 16.1548 55.9172 15.9215 55.9172 15.6881L59.3239 13.9615V16.5281L57.4105 17.4148C56.9905 17.0415 56.4772 16.6915 55.9172 16.3881ZM55.9172 9.36479C57.0372 9.76146 58.0872 10.2981 58.9972 10.9281L55.9172 12.4915C55.9172 11.4415 55.9172 10.3915 55.9172 9.36479ZM55.2639 16.0848C54.4005 15.7348 53.4205 15.5248 52.3239 15.5248C52.1605 15.5248 52.0205 15.5481 51.8572 15.5481C53.0939 14.4981 54.3305 13.4248 54.3305 11.1615V5.04813C54.3305 4.32479 54.7505 3.74146 55.2639 3.34479C55.2639 7.59146 55.2639 11.8381 55.2639 16.0848ZM55.9172 13.2381L59.3239 11.5115V13.2148L55.9172 14.9415C55.9172 14.3581 55.9172 13.7981 55.9172 13.2381ZM55.9172 3.22813L59.0205 6.86812L55.9172 9.20146C55.9172 7.19479 55.9172 5.21146 55.9172 3.22813ZM59.1839 7.70812L62.1005 5.67812L58.3205 1.24479C55.4039 2.22479 52.9772 4.02146 51.2272 6.26146V13.5415C51.2272 14.4748 50.9939 15.1515 50.6205 15.6881C47.9839 16.2248 45.8839 17.9281 44.6472 20.0748H45.2305C46.3505 19.0015 47.9372 18.2781 50.0372 18.2781C51.6005 18.2781 53.1872 18.6981 54.5872 19.4215L62.3805 15.3848V9.52813C61.4705 8.78146 60.3972 8.15146 59.1839 7.70812ZM63.5815 17.8348L64.6082 16.9948L68.0848 19.5615L72.8915 15.6648L72.5415 15.1048L69.9748 17.1115L67.1748 15.1981V14.1948L72.2148 11.0681V10.9515L69.8582 7.38146L64.2815 10.2748V16.4348L63.1615 17.3215L63.5815 17.8348ZM67.1748 13.4015V9.41146L67.6182 9.15479L69.5315 11.9081L67.1748 13.4015ZM76.6146 9.24812L79.3679 10.9515C79.3679 11.6748 79.3679 12.4215 79.3679 13.1448C77.8046 12.7948 75.3313 12.1648 75.3313 10.6715C75.3313 10.0415 75.9146 9.62146 76.6146 9.24812ZM77.0113 19.4448L79.4613 17.6715L81.2579 19.4448L84.5013 17.2281L84.3846 16.7615L83.3813 17.4381L82.2613 16.3181V10.4381L83.4746 9.45812L83.0779 8.94479L82.1213 9.71479L78.6913 7.49812L76.1246 8.82812C75.4246 9.20146 74.6546 9.78479 74.6546 10.8115C74.6546 11.8848 75.4946 12.5615 76.5679 13.0281C74.8179 13.9381 73.8613 15.1281 73.8613 16.3881C73.8613 18.1148 75.5179 19.2581 77.0113 19.4448ZM79.3679 13.8448C79.3679 15.0115 79.3679 16.2015 79.3679 17.3681C79.2046 17.4148 79.0413 17.4381 78.8779 17.4381C77.4313 17.4381 76.6846 15.5948 76.6846 14.2648C76.6846 13.8215 76.8246 13.4248 76.9879 13.1915C77.7579 13.4715 78.6213 13.6815 79.3679 13.8448ZM96.1876 17.6015L94.9743 16.5281V10.2981L96.211 9.55146L97.821 11.0215V16.7615L96.841 17.6715L99.151 19.6781L102.604 17.4381V16.5748L101.601 17.3215L100.504 16.2248V10.3681L101.671 9.41146L101.251 8.92146L100.481 9.52813L98.0543 7.45146L94.8576 9.43479L92.5243 7.45146L89.4676 9.36479L87.7643 7.45146L84.521 9.66813L84.8476 10.1348L85.7343 9.57479L86.6443 10.5781V16.7615L85.7343 17.5548L88.4176 19.6781L90.6576 17.6715L89.6543 16.7615V10.1581L90.681 9.55146L92.291 11.0215V16.7615L91.311 17.6715L93.621 19.6781L96.1876 17.6015ZM112.41 5.79479C112.41 5.00146 113.157 4.58146 113.95 4.58146C115.047 4.58146 119.107 5.88812 121.3 6.16813V9.03812L119.783 10.5781L121.3 12.1181V16.0848C120.553 16.4581 119.69 16.6915 118.71 16.6915C117.217 16.6915 115.933 16.1081 115 15.1981L119.13 13.4715V6.37812L113.997 8.57146C114.72 6.98479 115.933 6.07479 116.353 5.81812L116.12 5.46812C112.667 6.05146 110.613 9.10812 110.613 11.9781C110.613 16.2948 114.277 19.2581 118.08 19.2581C121.86 19.2581 124.847 16.4115 124.847 12.8648C124.847 12.7948 124.847 12.7015 124.847 12.6315H124.403C123.937 13.7981 123.097 14.9415 121.953 15.7115V12.1415L123.517 10.5781L121.953 9.01479V6.21479C121.977 6.21479 121.977 6.21479 121.977 6.21479C123.68 6.21479 125.15 5.30479 125.15 3.62479C125.15 1.92146 123.447 0.731458 121.253 0.894791V1.33812C121.977 1.43146 123.05 1.54813 123.05 2.36479C123.05 2.87812 122.56 3.11146 122.07 3.11146C119.923 3.11146 116.843 1.45479 114.86 1.45479C112.597 1.45479 111.173 2.90146 111.173 4.58146C111.173 5.79479 111.897 6.65812 112.76 7.03146L112.993 6.70479C112.667 6.56479 112.41 6.23812 112.41 5.79479ZM113.67 9.36479L116.12 8.33812V14.0548L114.58 14.7081C113.833 13.7515 113.413 12.5148 113.413 11.2315C113.413 10.5548 113.507 9.92479 113.67 9.36479ZM132.233 16.6681L131.229 17.3215L130.436 16.5515V9.50479L128.663 7.38146L125.513 9.50479L125.863 9.94812L126.749 9.38812L127.543 10.3915V16.5515L126.073 17.5548L126.423 17.9981L127.193 17.4381L129.433 19.4448L132.793 17.1115L132.233 16.6681ZM126.796 4.23146L128.779 6.49479L130.996 4.53479L129.013 2.27146L126.796 4.23146ZM144.258 17.6015L143.045 16.5281V10.2981L144.281 9.55146L145.891 11.0215V16.7615L144.911 17.6715L147.221 19.6781L150.675 17.4381V16.5748L149.671 17.3215L148.575 16.2248V10.3681L149.741 9.41146L149.321 8.92146L148.551 9.52813L146.125 7.45146L142.928 9.43479L140.595 7.45146L137.538 9.36479L135.835 7.45146L132.591 9.66813L132.918 10.1348L133.805 9.57479L134.715 10.5781V16.7615L133.805 17.5548L136.488 19.6781L138.728 17.6715L137.725 16.7615V10.1581L138.751 9.55146L140.361 11.0215V16.7615L139.381 17.6715L141.691 19.6781L144.258 17.6015ZM151.246 17.8348L152.272 16.9948L155.749 19.5615L160.556 15.6648L160.206 15.1048L157.639 17.1115L154.839 15.1981V14.1948L159.879 11.0681V10.9515L157.522 7.38146L151.946 10.2748V16.4348L150.826 17.3215L151.246 17.8348ZM154.839 13.4015V9.41146L155.282 9.15479L157.196 11.9081L154.839 13.4015ZM162.762 20.5648L162.995 19.9348C162.809 19.8415 162.669 19.6315 162.669 19.3748C162.669 18.7915 163.205 18.4881 163.765 18.4881C164.582 18.4881 165.165 19.0248 165.492 19.5615L170.089 16.7615V13.2381L168.082 11.7681C169.389 10.5548 169.925 9.22479 170.112 7.42812H169.459C169.459 7.45146 169.459 7.45146 169.459 7.45146V7.42812C169.389 7.98812 168.899 8.40812 168.292 8.40812C167.499 8.40812 166.915 7.89479 166.589 7.38146L161.759 10.1815V13.4481L163.532 14.8481C161.689 16.5515 161.315 17.4148 161.315 18.3715C161.315 19.4681 161.969 20.2381 162.762 20.5648ZM165.795 13.7281L167.079 14.7781V17.8115C166.659 16.8548 165.702 16.0148 164.349 16.0148C163.742 16.0148 163.159 16.2248 162.715 16.5748C163.299 15.8515 164.115 15.1748 164.955 14.4515L165.795 13.7281ZM165.725 12.9348L164.769 11.9315V8.89812C165.235 10.0881 166.262 10.6248 167.289 10.6248C167.685 10.6248 168.082 10.5315 168.455 10.3681C168.129 10.8348 167.779 11.1615 167.452 11.4415L165.725 12.9348Z";

/** "bmail", the wordmark on the mail page. */
const BMAIL_WORDMARK = [
  "M0.708984 0.25H2.97949V16.4365L2.78418 19H0.708984V0.25ZM11.9028 12.2861V12.5425C11.9028 13.5028 11.7889 14.3939 11.561 15.2158C11.3332 16.0296 10.9995 16.7376 10.5601 17.3398C10.1206 17.9421 9.5835 18.41 8.94873 18.7437C8.31396 19.0773 7.58561 19.2441 6.76367 19.2441C5.92546 19.2441 5.18896 19.1017 4.5542 18.8169C3.92757 18.5239 3.3986 18.1048 2.96729 17.5596C2.53597 17.0143 2.1901 16.3551 1.92969 15.582C1.67741 14.8089 1.50244 13.9382 1.40479 12.9697V11.8467C1.50244 10.8701 1.67741 9.99528 1.92969 9.22217C2.1901 8.44906 2.53597 7.78988 2.96729 7.24463C3.3986 6.69124 3.92757 6.27214 4.5542 5.9873C5.18083 5.69434 5.90918 5.54785 6.73926 5.54785C7.56934 5.54785 8.30583 5.71061 8.94873 6.03613C9.59163 6.35352 10.1287 6.80924 10.5601 7.40332C10.9995 7.9974 11.3332 8.70947 11.561 9.53955C11.7889 10.3615 11.9028 11.277 11.9028 12.2861ZM9.63232 12.5425V12.2861C9.63232 11.627 9.57129 11.0085 9.44922 10.4307C9.32715 9.84473 9.13184 9.33203 8.86328 8.89258C8.59473 8.44499 8.24072 8.09505 7.80127 7.84277C7.36182 7.58236 6.82064 7.45215 6.17773 7.45215C5.60807 7.45215 5.11165 7.5498 4.68848 7.74512C4.27344 7.94043 3.91943 8.20492 3.62646 8.53857C3.3335 8.8641 3.09342 9.23844 2.90625 9.66162C2.72721 10.0767 2.59294 10.508 2.50342 10.9556V13.8975C2.63363 14.4671 2.84521 15.0164 3.13818 15.5454C3.43929 16.0662 3.83805 16.4935 4.33447 16.8271C4.83903 17.1608 5.46159 17.3276 6.20215 17.3276C6.8125 17.3276 7.33333 17.2056 7.76465 16.9614C8.2041 16.7091 8.55811 16.3633 8.82666 15.9238C9.10335 15.4844 9.3068 14.9757 9.43701 14.3979C9.56722 13.8201 9.63232 13.2017 9.63232 12.5425Z",
  "M17.0054 8.4165V19H14.7349V5.79199H16.8833L17.0054 8.4165ZM16.5415 11.8955L15.4917 11.8589C15.4998 10.9556 15.6178 10.1214 15.8457 9.35645C16.0736 8.58333 16.4113 7.91195 16.8589 7.34229C17.3065 6.77262 17.8639 6.33317 18.5312 6.02393C19.1986 5.70654 19.9717 5.54785 20.8506 5.54785C21.4691 5.54785 22.0387 5.63737 22.5596 5.81641C23.0804 5.9873 23.5321 6.25993 23.9146 6.63428C24.297 7.00863 24.5941 7.48877 24.8057 8.07471C25.0173 8.66064 25.123 9.36865 25.123 10.1987V19H22.8647V10.3086C22.8647 9.61686 22.7467 9.06348 22.5107 8.64844C22.2829 8.2334 21.9574 7.93229 21.5342 7.74512C21.111 7.5498 20.6146 7.45215 20.0449 7.45215C19.3776 7.45215 18.8201 7.57015 18.3726 7.80615C17.925 8.04215 17.5669 8.36768 17.2983 8.78271C17.0298 9.19775 16.8345 9.67383 16.7124 10.2109C16.5985 10.7399 16.5415 11.3014 16.5415 11.8955ZM25.0986 10.6504L23.585 11.1143C23.5931 10.39 23.7111 9.69417 23.939 9.02686C24.175 8.35954 24.5127 7.76546 24.9521 7.24463C25.3997 6.7238 25.9491 6.31283 26.6001 6.01172C27.2511 5.70247 27.9958 5.54785 28.834 5.54785C29.542 5.54785 30.1686 5.64144 30.7139 5.82861C31.2673 6.01579 31.7311 6.30469 32.1055 6.69531C32.488 7.0778 32.7769 7.57015 32.9722 8.17236C33.1675 8.77458 33.2651 9.49072 33.2651 10.3208V19H30.9946V10.2964C30.9946 9.55583 30.8766 8.9821 30.6406 8.5752C30.4128 8.16016 30.0872 7.87126 29.6641 7.7085C29.249 7.5376 28.7526 7.45215 28.1748 7.45215C27.6784 7.45215 27.2389 7.5376 26.8564 7.7085C26.474 7.87939 26.1525 8.1154 25.8921 8.4165C25.6317 8.70947 25.4323 9.0472 25.2939 9.42969C25.1637 9.81217 25.0986 10.2191 25.0986 10.6504Z",
  "M44.4712 16.7417V9.94238C44.4712 9.42155 44.3654 8.96989 44.1538 8.5874C43.9504 8.19678 43.6411 7.89567 43.2261 7.68408C42.811 7.47249 42.2983 7.3667 41.688 7.3667C41.1183 7.3667 40.6178 7.46436 40.1865 7.65967C39.7633 7.85498 39.4297 8.11133 39.1855 8.42871C38.9495 8.74609 38.8315 9.08789 38.8315 9.4541H36.5732C36.5732 8.9821 36.6953 8.51416 36.9395 8.05029C37.1836 7.58643 37.5335 7.16732 37.9893 6.79297C38.4531 6.41048 39.0065 6.10938 39.6494 5.88965C40.3005 5.66178 41.0247 5.54785 41.8223 5.54785C42.7826 5.54785 43.6289 5.71061 44.3613 6.03613C45.1019 6.36165 45.6797 6.854 46.0947 7.51318C46.5179 8.16423 46.7295 8.9821 46.7295 9.9668V16.1191C46.7295 16.5586 46.7661 17.0265 46.8394 17.5229C46.9207 18.0194 47.0387 18.4466 47.1934 18.8047V19H44.8374C44.7235 18.7396 44.634 18.3937 44.5688 17.9624C44.5037 17.5229 44.4712 17.116 44.4712 16.7417ZM44.8618 10.9922L44.8862 12.5791H42.6035C41.9606 12.5791 41.3869 12.632 40.8823 12.7378C40.3778 12.8354 39.9546 12.986 39.6128 13.1895C39.271 13.3929 39.0106 13.6493 38.8315 13.9585C38.6525 14.2596 38.563 14.6136 38.563 15.0205C38.563 15.4355 38.6566 15.814 38.8438 16.1558C39.0309 16.4976 39.3117 16.7702 39.686 16.9736C40.0685 17.1689 40.5365 17.2666 41.0898 17.2666C41.7816 17.2666 42.3919 17.1201 42.9209 16.8271C43.4499 16.5342 43.869 16.1761 44.1782 15.7529C44.4956 15.3298 44.6665 14.9188 44.6909 14.52L45.6553 15.6064C45.5983 15.9482 45.4437 16.3267 45.1914 16.7417C44.9391 17.1567 44.6014 17.5555 44.1782 17.938C43.7632 18.3123 43.2668 18.6257 42.689 18.8779C42.1193 19.1221 41.4764 19.2441 40.7603 19.2441C39.8651 19.2441 39.0798 19.0692 38.4043 18.7192C37.737 18.3693 37.2161 17.9014 36.8418 17.3154C36.4756 16.7214 36.2925 16.0581 36.2925 15.3257C36.2925 14.6177 36.4308 13.9951 36.7075 13.458C36.9842 12.9128 37.383 12.4611 37.9038 12.103C38.4246 11.7368 39.0513 11.4601 39.7837 11.2729C40.5161 11.0858 41.334 10.9922 42.2373 10.9922H44.8618Z",
  "M52.7354 5.79199V19H50.4648V5.79199H52.7354ZM50.2939 2.28857C50.2939 1.92236 50.4038 1.61312 50.6235 1.36084C50.8514 1.10856 51.1851 0.982422 51.6245 0.982422C52.0558 0.982422 52.3854 1.10856 52.6133 1.36084C52.8493 1.61312 52.9673 1.92236 52.9673 2.28857C52.9673 2.63851 52.8493 2.93962 52.6133 3.19189C52.3854 3.43604 52.0558 3.55811 51.6245 3.55811C51.1851 3.55811 50.8514 3.43604 50.6235 3.19189C50.4038 2.93962 50.2939 2.63851 50.2939 2.28857Z",
  "M58.8145 0.25V19H56.5439V0.25H58.8145Z",
];

const BeamTimesMasthead = () => (
  <svg viewBox="0 0 171 22" fill="none" aria-hidden="true">
    <path d={MASTHEAD} fill="currentColor" />
  </svg>
);

const BmailWordmark = () => (
  <svg viewBox="0 0 59 20" fill="none" aria-hidden="true">
    {BMAIL_WORDMARK.map((d) => (
      <path key={d.slice(0, 12)} d={d} fill="currentColor" />
    ))}
  </svg>
);

const YoutubeLogo = () => (
  <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <g opacity="0.5">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M26.2071 9.55286C25.8754 6.54847 23.833 4.57015 20.8647 4.24685C16.4799 3.76928 11.5204 3.76928 7.13552 4.24685C4.1672 4.57015 2.12481 6.54847 1.79308 9.55286C1.47661 12.4191 1.47644 15.58 1.79308 18.4477C2.11859 21.3958 4.1105 23.4243 7.13552 23.7538C11.5077 24.2299 16.4925 24.2299 20.8647 23.7538C23.8897 23.4243 25.8816 21.3958 26.2071 18.4477C26.5236 15.5816 26.5238 12.4206 26.2071 9.55286ZM12.1613 9.86319C11.7725 9.62991 11.2779 9.90997 11.2779 10.3634V17.6362C11.2779 18.0896 11.7725 18.3697 12.1613 18.1364L18.222 14.5C18.5996 14.2734 18.5996 13.7261 18.222 13.4996L12.1613 9.86319Z"
        fill="currentColor"
      />
    </g>
  </svg>
);

/** The favicons. The site had these as PNGs pasted into the markup; drawn
 *  here, so the demo has no image in it: the mail one is an M in its four
 *  colours, the paper's is its own masthead's B, the video one a red badge. */
const FAVICONS: Record<WebPage, ReactNode> = {
  bmail: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285f4" d="M2 8.6l4 3v8H3.6A1.6 1.6 0 0 1 2 18z" />
      <path fill="#34a853" d="M22 8.6l-4 3v8h2.4a1.6 1.6 0 0 0 1.6-1.6z" />
      <path fill="#fbbc04" d="M18 11.6l4-3V6.5c0-2-2.3-3.2-3.9-2L18 4.7z" />
      <path fill="#c5221f" d="M6 11.6l-4-3V6.5c0-2 2.3-3.2 3.9-2L6 4.7z" />
      <path fill="#ea4335" d="M6 4.7l6 4.5 6-4.5v6.9l-6 4.5-6-4.5z" />
    </svg>
  ),
  "beam-times": (
    <svg viewBox="43.2 0.4 19.8 20.6" fill="none" aria-hidden="true">
      <path d={MASTHEAD} fill="currentColor" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#f00" />
      <path d="M9.8 8.8v6.4l5.6-3.2z" fill="#fff" />
    </svg>
  ),
};

const IconLock = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect
      x="4.75"
      y="7.75"
      width="6.5"
      height="4.5"
      rx="0.75"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M5.75 6C5.75 4.75736 6.75736 3.75 8 3.75C9.24264 3.75 10.25 4.75736 10.25 6V7.75H5.75V6Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.04954 14.8894C4.90175 12.7414 4.90191 9.25902 7.04989 7.11123C9.19786 4.96344 12.6803 4.96359 14.8281 7.11157C16.9758 9.25955 16.9757 12.742 14.8277 14.8897C12.6797 17.0375 9.19733 17.0374 7.04954 14.8894ZM5.98927 6.05052C3.25548 8.78407 3.25529 13.2162 5.98884 15.95C8.55385 18.5153 12.6145 18.6736 15.3641 16.4249L18.7196 19.7804C19.0125 20.0733 19.4874 20.0733 19.7803 19.7804C20.0732 19.4875 20.0732 19.0127 19.7803 18.7198L16.4182 15.3577C18.609 12.6097 18.4325 8.59495 15.8888 6.05096C13.1552 3.31717 8.72306 3.31697 5.98927 6.05052Z"
      fill="currentColor"
    />
  </svg>
);

const IconSwitcher = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M11.25 20C11.6642 20 12 19.6642 12 19.25C12 18.8358 11.6642 18.5 11.25 18.5V20ZM20.5 11.75C20.5 12.1642 20.8358 12.5 21.25 12.5C21.6642 12.5 22 12.1642 22 11.75H20.5ZM3.07698 17.612L2.40873 17.9525L3.07698 17.612ZM4.38803 18.923L4.04754 19.5913L4.38803 18.923ZM19.612 5.07698L19.2715 5.74524L19.612 5.07698ZM20.923 6.38803L20.2548 6.72852L20.923 6.38803ZM7.55 5.5H16.45V4H7.55V5.5ZM3.5 14.45V9.55H2V14.45H3.5ZM11.25 18.5H7.55V20H11.25V18.5ZM20.5 9.55V11.75H22V9.55H20.5ZM2 14.45C2 15.2777 1.99942 15.9436 2.04336 16.4815C2.08803 17.0281 2.18238 17.5082 2.40873 17.9525L3.74524 17.2715C3.6446 17.074 3.57546 16.8132 3.53838 16.3593C3.50058 15.8967 3.5 15.3025 3.5 14.45H2ZM7.55 18.5C6.69755 18.5 6.10331 18.4994 5.64068 18.4616C5.1868 18.4245 4.92604 18.3554 4.72852 18.2548L4.04754 19.5913C4.49175 19.8176 4.97189 19.912 5.51853 19.9566C6.05641 20.0006 6.7223 20 7.55 20V18.5ZM2.40873 17.9525C2.76825 18.6581 3.34193 19.2317 4.04754 19.5913L4.72852 18.2548C4.30516 18.039 3.96095 17.6948 3.74524 17.2715L2.40873 17.9525ZM16.45 5.5C17.3025 5.5 17.8967 5.50058 18.3593 5.53838C18.8132 5.57546 19.074 5.6446 19.2715 5.74524L19.9525 4.40873C19.5082 4.18238 19.0281 4.08803 18.4815 4.04336C17.9436 3.99942 17.2777 4 16.45 4V5.5ZM22 9.55C22 8.7223 22.0006 8.05641 21.9566 7.51853C21.912 6.97189 21.8176 6.49175 21.5913 6.04754L20.2548 6.72852C20.3554 6.92604 20.4245 7.1868 20.4616 7.64068C20.4994 8.10331 20.5 8.69755 20.5 9.55H22ZM19.2715 5.74524C19.6948 5.96095 20.039 6.30516 20.2548 6.72852L21.5913 6.04754C21.2317 5.34193 20.6581 4.76825 19.9525 4.40873L19.2715 5.74524ZM7.55 4C6.7223 4 6.05641 3.99942 5.51853 4.04336C4.97189 4.08803 4.49175 4.18238 4.04754 4.40873L4.72852 5.74524C4.92604 5.6446 5.1868 5.57546 5.64068 5.53838C6.10331 5.50058 6.69755 5.5 7.55 5.5V4ZM3.5 9.55C3.5 8.69755 3.50058 8.10331 3.53838 7.64068C3.57546 7.1868 3.6446 6.92604 3.74524 6.72852L2.40873 6.04754C2.18238 6.49175 2.08803 6.97189 2.04336 7.51853C1.99942 8.05641 2 8.7223 2 9.55H3.5ZM4.04754 4.40873C3.34193 4.76825 2.76825 5.34193 2.40873 6.04754L3.74524 6.72852C3.96095 6.30516 4.30516 5.96095 4.72852 5.74524L4.04754 4.40873Z"
      fill="currentColor"
    />
    <path
      d="M7.75 9.25H16.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.75 12.75H13.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 16.75L18.5 19.25L21 16.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconOmniboxSearch = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.6413 10.2608C3.08903 8.70842 3.08914 6.19159 4.64154 4.63932C6.19395 3.08706 8.71078 3.08717 10.263 4.63957C11.8153 6.19197 11.8152 8.7088 10.2628 10.2611C8.71039 11.8133 6.19356 11.8132 4.6413 10.2608ZM3.58093 3.57862C1.44272 5.71664 1.44256 9.18322 3.58059 11.3214C5.53846 13.2795 8.61042 13.4446 10.7562 11.8167L13.2785 14.339C13.5714 14.6319 14.0462 14.6319 14.3391 14.339C14.632 14.0461 14.632 13.5712 14.3391 13.2783L11.8171 10.7563C13.4466 8.61059 13.2821 5.53751 11.3237 3.57896C9.18572 1.44074 5.71914 1.44059 3.58093 3.57862Z"
      fill="currentColor"
    />
  </svg>
);

/** The arrow the omnibox puts beside a note. */
const IconArrow = () => (
  <svg viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path
      d="M1.40625 4.6875C1.14737 4.6875 0.9375 4.89737 0.9375 5.15625C0.9375 5.41513 1.14737 5.625 1.40625 5.625V4.6875ZM8.59375 5.15625L8.92521 5.48771C9.10826 5.30465 9.10826 5.00785 8.92521 4.82479L8.59375 5.15625ZM6.42521 2.32479C6.24215 2.14174 5.94535 2.14174 5.76229 2.32479C5.57924 2.50785 5.57924 2.80465 5.76229 2.98771L6.42521 2.32479ZM5.76229 7.32479C5.57924 7.50785 5.57924 7.80465 5.76229 7.98771C5.94535 8.17076 6.24215 8.17076 6.42521 7.98771L5.76229 7.32479ZM1.40625 5.625H8.59375V4.6875H1.40625V5.625ZM8.92521 4.82479L6.42521 2.32479L5.76229 2.98771L8.26229 5.48771L8.92521 4.82479ZM8.26229 4.82479L5.76229 7.32479L6.42521 7.98771L8.92521 5.48771L8.26229 4.82479Z"
      fill="currentColor"
    />
  </svg>
);

const IconPublish = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M6.25 2.75H4.25C3.42157 2.75 2.75 3.42157 2.75 4.25V11.75C2.75 12.5784 3.42157 13.25 4.25 13.25H11.75C12.5784 13.25 13.25 12.5784 13.25 11.75V9.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M13.25 2.75L7.5 8.5M13.25 2.75H9.25M13.25 2.75V6.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCheck = () => (
  <svg
    className={styles.is_check}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 7.5L6.5 12.5L13.5 2.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconLink = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M13.09 5.34l-.8-.8.8.8zm5.6 5.6l.8.8-.8-.8zm-2.18 2.18l-.8-.8.8.8zm-4.78-.15a1.13 1.13 0 1 0-1.6 1.6l1.6-1.6zm.25-8.12a1.13 1.13 0 0 0 1.6 1.6l-1.6-1.6zm3.73 7.47c-1.3 1.3-2.31 1.32-2.91 1.19a2.45 2.45 0 0 1-.82-.35 1.63 1.63 0 0 1-.25-.19l-.8.8-.8.8.01.01.04.04a3.83 3.83 0 0 0 .55.43c.36.24.9.51 1.56.66 1.41.32 3.2.02 5-1.8l-1.6-1.6zm2.18-2.18l-2.18 2.18 1.6 1.6 2.18-2.18-1.6-1.6zm-4.31-3.69l.31-.31-1.6-1.6-.31.31 1.6 1.6zm.31-.31c.84-.84 1.67-1.11 2.38-1.11.72 0 1.4.32 1.91.83.5.5.82 1.19.83 1.91 0 .7-.27 1.54-1.11 2.38l1.6 1.6c1.21-1.22 1.78-2.62 1.76-4-.01-1.35-.59-2.58-1.48-3.48-.9-.89-2.13-1.47-3.48-1.48-1.38-.02-2.78.55-4 1.76l1.6 1.6z"
      fill="currentColor"
    />
    <path
      d="M10.91 18.72l.8.8-.8-.8zm-5.6-5.6l-.8-.8.8.8zm2.18-2.18l.8.8-.8-.8zm4.78.15a1.13 1.13 0 1 0 1.6-1.6l-1.6 1.6zm-.25 8.12a1.13 1.13 0 0 0-1.6-1.6l1.6 1.6zm-3.73-7.47c1.3-1.3 2.31-1.32 2.91-1.19.34.08.62.22.82.35.1.06.17.12.22.16l.04.03.8-.8.8-.8-.01-.01-.04-.04a3.83 3.83 0 0 0-.55-.43 4.3 4.3 0 0 0-1.56-.66c-1.41-.32-3.2-.02-5 1.8l1.6 1.6zm-2.18 2.18l2.18-2.18-1.6-1.6-2.18 2.18 1.6 1.6zm4.31 3.69l-.31.31 1.6 1.6.31-.31-1.6-1.6zm-.31.31c-.84.84-1.67 1.11-2.38 1.11-.72 0-1.4-.32-1.91-.83a2.73 2.73 0 0 1-.83-1.91c0-.7.27-1.54 1.11-2.38l-1.6-1.6c-1.21 1.22-1.78 2.62-1.76 4 .01 1.35.59 2.58 1.48 3.48.9.89 2.13 1.47 3.48 1.48 1.38.02 2.78-.55 4-1.76l-1.6-1.6z"
      fill="currentColor"
    />
  </svg>
);

/* ------------------------------------------------------------- the pages */

/** A line, an image or an avatar of nothing in particular, tagged with what
 *  it is so a capture can lift a copy of it into the journal. */
const Ph = ({
  kind = "p",
  size,
  slot,
}: {
  kind?: Item["kind"];
  size?: Item["size"];
  /** When the block a capture aims at is this one image. */
  slot?: Slot;
}) => {
  if (kind === "p") {
    return (
      <p
        className={cx(styles.placeholder, size && styles[size])}
        data-kind="p"
        data-size={size}
      />
    );
  }
  if (kind === "circle") {
    return (
      <div className={styles.circle} data-kind="circle" data-slot={slot} />
    );
  }
  return (
    <div
      className={cx(styles.placeholder, styles.img, size && styles[size])}
      data-kind="img"
      data-size={size}
      data-slot={slot}
    />
  );
};

/** A block a capture can be aimed at. */
const Block = ({ slot, children }: { slot: Slot; children: ReactNode }) => (
  <div className={styles.slot} data-slot={slot}>
    {children}
  </div>
);

const BeamTimesPage = () => (
  <>
    <div className={styles.doc_header}>
      <BeamTimesMasthead />
    </div>
    <div className={styles.doc_menu}>
      <span className={styles.placeholder} />
      <span className={styles.placeholder} />
      <span className={styles.placeholder} />
    </div>
    <div className={styles.doc_main}>
      <div>
        <Block slot="third">
          <Ph />
          <Ph />
          <Ph />
          <Ph size="medium" />
          <Ph />
          <Ph />
          <Ph size="small" />
        </Block>
      </div>
      <div>
        <Ph kind="img" size="large" slot="last" />
        <Block slot="second">
          <Ph size="medium" />
          <Ph />
          <Ph />
          <Ph size="small" />
        </Block>
      </div>
      <div>
        <Block slot="first">
          <Ph kind="img" size="small" />
          <Ph />
          <Ph size="medium" />
        </Block>
        <Ph kind="img" size="small" />
        <Ph />
        <Ph size="medium" />
      </div>
    </div>
  </>
);

const BmailPage = () => (
  <>
    <div className={styles.doc_header}>
      <BmailWordmark />
    </div>
    <div className={styles.doc_main}>
      <div>
        <Ph />
        <Ph size="small" />
        <Ph />
        <Ph />
        <Ph size="medium" />
        <Ph />
        <Ph />
        <Ph size="small" />
        <Ph size="medium" />
      </div>
      <div>
        <div>
          <Ph kind="circle" slot="third" />
        </div>
        <div>
          <Block slot="last">
            <Ph size="small" />
            <Ph />
          </Block>
          <Ph kind="img" size="large" slot="second" />
          <Block slot="first">
            <Ph />
            <Ph size="medium" />
          </Block>
        </div>
      </div>
    </div>
  </>
);

const YoutubePage = () => (
  <>
    <div className={styles.doc_header}>
      <div>
        <YoutubeLogo />
      </div>
      <div>
        <span className={styles.circle} />
        <span className={styles.circle} />
        <span className={styles.circle} />
      </div>
    </div>
    <div className={styles.doc_main}>
      <div>
        <Ph kind="img" size="large" slot="last" />
        <Block slot="first">
          <Ph size="large" />
          <Ph size="medium" />
          <Ph size="medium" />
          <Ph size="small" />
        </Block>
      </div>
      <div>
        <Block slot="third">
          <Ph kind="img" size="small" />
          <Ph size="large" />
          <Ph size="medium" />
        </Block>
        <Block slot="second">
          <Ph kind="img" size="small" />
          <Ph size="large" />
          <Ph size="medium" />
        </Block>
      </div>
    </div>
  </>
);

const PAGES: Record<WebPage, { className?: string; content: ReactNode }> = {
  bmail: { className: styles.bmail, content: <BmailPage /> },
  "beam-times": { className: styles.beam_times, content: <BeamTimesPage /> },
  youtube: { className: styles.youtube, content: <YoutubePage /> },
};

const AllNotesPage = () => (
  <div className={styles.view}>
    <div className={styles.notes_header}>
      <span className={cx(styles.placeholder, styles.small)} />
    </div>
    <div className={styles.notes_main}>
      {(
        [
          "large",
          "medium",
          "large",
          "small",
          "medium",
          "large",
          "small",
          "medium",
          "large",
        ] as const
      ).map((size, index) => (
        <div key={index} className={styles.notes_row}>
          <div>
            <span className={cx(styles.placeholder, styles[size])} />
          </div>
          <div>
            <span className={cx(styles.placeholder, styles.large)} />
          </div>
          <div>
            <span className={cx(styles.placeholder, styles.large)} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** One captured block, as it lands in the journal. Lit until its entrance
 *  has played, then a block like any other. */
const InsertedItems = ({
  insert,
  onSettle,
}: {
  insert: Insert;
  onSettle: (id: number) => void;
}) => {
  const settle = (event: ReactAnimationEvent) => {
    if (event.animationName.includes("placeholder-in")) {
      onSettle(insert.id);
    }
  };
  return (
    <li
      className={cx(
        insert.fresh && styles.is_insert,
        insert.media && styles.media
      )}
      onAnimationEnd={settle}
    >
      {insert.items.map((item, index) =>
        item.kind === "p" ? (
          <p
            key={index}
            className={cx(styles.placeholder, item.size && styles[item.size])}
          />
        ) : item.kind === "circle" ? (
          <div key={index} className={cx(styles.placeholder, styles.circle)} />
        ) : (
          <div
            key={index}
            className={cx(
              styles.placeholder,
              styles.img,
              item.size && styles[item.size]
            )}
          />
        )
      )}
    </li>
  );
};

/* ----------------------------------------------------------- the window */

/** beam's reveal button, as the note's header wears it: an icon, and its
 *  label when hovered, focused, or held open by the script. The label's
 *  width is measured and handed to the stylesheet, which is what lets the
 *  reveal be a transition rather than a jump. */
const PublishButton = ({
  state,
  onClick,
}: {
  state: PublishState;
  onClick?: () => void;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const label = PUBLISH_LABELS[state.phase];

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const span = labelRef.current;
    if (button && span) {
      // + 1 for Safari, which rounds the width down and clips the last letter.
      button.style.setProperty(
        "--label-width",
        `${label ? span.scrollWidth + 1 : 0}px`
      );
    }
  }, [label]);

  return (
    <button
      ref={buttonRef}
      type="button"
      tabIndex={-1}
      className={cx(
        styles.reveal,
        state.open && styles.is_active,
        state.phase === "link" && styles.is_published
      )}
      onClick={onClick}
    >
      <span className={styles.reveal_icon}>
        {state.phase === "published" ? (
          <IconCheck />
        ) : state.phase === "link" ? (
          <IconLink />
        ) : (
          <IconPublish />
        )}
      </span>
      <span ref={labelRef} className={styles.reveal_label}>
        {label}
      </span>
      <span className={cx(styles.tooltip, state.tooltip && styles.is_shown)}>
        URL copied
      </span>
    </button>
  );
};

type WindowProps = {
  mode: Mode;
  webPage: WebPage;
  writingPage: WritingPage;
  inserts: Insert[];
  onSettleInsert: (id: number) => void;
  publish: PublishState;
  /** The front window has the capture frame, the omnibox and the handlers;
   *  the double behind it is the same drawing with none of them. */
  front?: {
    capturing: boolean;
    shot: boolean;
    onShotEnd: () => void;
    contentRef: RefObject<HTMLDivElement | null>;
    highlightRef: RefObject<HTMLDivElement | null>;
    omnibox: boolean;
    query: string;
    inputRef: RefObject<HTMLInputElement | null>;
    onQuery: (value: string) => void;
    onOmniboxKey: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
    onOmniboxBlur: (event: ReactFocusEvent<HTMLDivElement>) => void;
    onSearch: () => void;
    onToggleMode: () => void;
    onWebTab: (page: WebPage) => void;
    onWritingTab: (page: WritingPage) => void;
    onPick: (mode: Mode, page: WebPage | WritingPage) => void;
    onPublish: () => void;
    /** The easter egg's row, shaking its head at a click. */
    refused: boolean;
    onRefuse: () => void;
    onRefused: () => void;
  };
};

const Window = ({
  mode,
  webPage,
  writingPage,
  inserts,
  onSettleInsert,
  publish,
  front,
}: WindowProps) => {
  const query = front?.query.trim().toLowerCase() ?? "";
  const hits = [
    ...WEB_TABS.map((tab) => ({
      key: tab.page,
      mode: "web" as Mode,
      page: tab.page as WebPage | WritingPage,
      label: tab.label,
      icon: FAVICONS[tab.page],
    })),
    ...WRITING_TABS.map((tab) => ({
      key: tab.page,
      mode: "writing" as Mode,
      page: tab.page as WebPage | WritingPage,
      label: tab.label,
      icon: <IconArrow />,
    })),
  ].filter((hit) => !query || hit.label.toLowerCase().includes(query));
  const beamMeUp = isBeamMeUp(query);

  return (
    <div
      className={cx(
        styles.window,
        mode === "web" ? styles.is_web : styles.is_writing,
        front?.capturing && styles.is_capturing,
        front?.omnibox && styles.is_omnibox
      )}
    >
      <header className={styles.header}>
        <div className={styles.traffic_lights}>
          <button
            type="button"
            tabIndex={-1}
            className={styles.traffic_close}
            aria-label="Close"
          />
          <button
            type="button"
            tabIndex={-1}
            className={styles.traffic_minimize}
            aria-label="Minimize"
          />
          <button
            type="button"
            tabIndex={-1}
            className={styles.traffic_expand}
            aria-label="Expand"
          />
        </div>
        <div className={styles.tabs}>
          {WEB_TABS.map((tab, index) => (
            <Fragment key={tab.page}>
              {index > 0 ? <span className={styles.separator} /> : null}
              <button
                type="button"
                tabIndex={-1}
                disabled={mode !== "web"}
                className={cx(
                  styles.tab,
                  tab.pinned && styles.is_pinned,
                  webPage === tab.page && styles.is_current
                )}
                aria-label={tab.pinned ? tab.label : undefined}
                onClick={() => front?.onWebTab(tab.page)}
              >
                <span className={styles.favicon}>{FAVICONS[tab.page]}</span>
                <span className={styles.tab_label}>{tab.label}</span>
                <span className={styles.tab_url}>
                  <IconLock />
                  <span className={styles.tab_label}>{tab.url}</span>
                </span>
              </button>
            </Fragment>
          ))}
          <div className={styles.tabs_writing}>
            {WRITING_TABS.map((tab, index) => (
              <Fragment key={tab.page}>
                {index > 0 ? <span className={styles.separator} /> : null}
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={mode !== "writing"}
                  className={cx(
                    styles.tab,
                    writingPage === tab.page && styles.is_current
                  )}
                  onClick={() => front?.onWritingTab(tab.page)}
                >
                  {tab.label}
                </button>
              </Fragment>
            ))}
          </div>
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Search"
            onClick={front?.onSearch}
          >
            <IconSearch />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Switch mode"
            onClick={front?.onToggleMode}
          >
            <IconSwitcher />
          </button>
        </div>
      </header>
      <div ref={front?.contentRef} className={styles.content}>
        <div className={styles.writing}>
          <div
            className={cx(
              styles.journal,
              writingPage === "journal" && styles.is_current
            )}
            data-page="journal"
          >
            <ul className={styles.view}>
              <li>
                <div className={styles.heading}>Today</div>
                <ul className={styles.note_content}>
                  {inserts.map((insert) => (
                    <InsertedItems
                      key={insert.id}
                      insert={insert}
                      onSettle={onSettleInsert}
                    />
                  ))}
                  {JOURNAL.today.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </li>
              <li>
                <div className={styles.heading}>Yesterday</div>
                <ul className={styles.note_content}>
                  {JOURNAL.yesterday.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </li>
            </ul>
          </div>
          <div
            className={cx(
              styles.all_notes,
              writingPage === "all-notes" && styles.is_current
            )}
            data-page="all-notes"
          >
            <AllNotesPage />
          </div>
          <div
            className={cx(
              styles.note_page,
              writingPage === "note" && styles.is_current
            )}
            data-page="note"
          >
            <div className={styles.view}>
              <div className={styles.note_header}>
                <div className={styles.heading}>Note</div>
                <div>
                  <PublishButton state={publish} onClick={front?.onPublish} />
                </div>
              </div>
              <ul className={styles.note_content}>
                <li>
                  <p className={cx(styles.placeholder, styles.large)} />
                </li>
                <li>
                  <p className={cx(styles.placeholder, styles.large)} />
                </li>
                <li>
                  <p className={cx(styles.placeholder, styles.small)} />
                </li>
                <li className={styles.media}>
                  <div
                    className={cx(styles.placeholder, styles.img, styles.large)}
                  />
                </li>
                <li>
                  <p className={cx(styles.placeholder, styles.medium)} />
                </li>
                <li>
                  <p className={cx(styles.placeholder, styles.small)} />
                </li>
              </ul>
            </div>
          </div>
        </div>
        {WEB_PAGES.map((page) => (
          <div
            key={page}
            className={cx(
              styles.html_doc,
              PAGES[page].className,
              webPage === page && styles.is_current
            )}
            data-page={page}
          >
            {PAGES[page].content}
          </div>
        ))}
        {front ? (
          <>
            <div className={styles.capture_frame}>
              <div
                ref={front.highlightRef}
                className={cx(styles.highlight, front.shot && styles.is_shot)}
                onAnimationEnd={front.onShotEnd}
              />
            </div>
            <div className={styles.omnibox_frame}>
              <div
                className={styles.omnibox}
                onBlur={front.onOmniboxBlur}
                onKeyDown={front.onOmniboxKey}
              >
                <div className={styles.omnibox_row}>
                  <div className={styles.omnibox_icon}>
                    <IconOmniboxSearch />
                  </div>
                  <div className={styles.omnibox_content}>
                    <input
                      ref={front.inputRef}
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Search the web and your notes"
                      aria-label="Search the web and your notes"
                      value={front.query}
                      onChange={(event) => front.onQuery(event.target.value)}
                    />
                  </div>
                </div>
                {hits.map((hit, index) => (
                  <button
                    key={hit.key}
                    type="button"
                    tabIndex={-1}
                    className={cx(
                      styles.omnibox_row,
                      styles.is_result,
                      index === 0 && query && styles.is_selected
                    )}
                    onClick={() => front.onPick(hit.mode, hit.page)}
                  >
                    <div className={styles.omnibox_icon}>{hit.icon}</div>
                    <div className={styles.omnibox_content}>{hit.label}</div>
                  </button>
                ))}
                {/* The site's easter egg: "beam me up" in the omnibox offered
                    the beta for download. The offer is still made; the
                    download is gone with the app, so the row shakes its head. */}
                {beamMeUp ? (
                  <button
                    key="beam-me-up"
                    type="button"
                    tabIndex={-1}
                    className={cx(
                      styles.omnibox_row,
                      styles.is_result,
                      hits.length === 0 && styles.is_selected,
                      front.refused && styles.is_refused
                    )}
                    onClick={front.onRefuse}
                    onAnimationEnd={front.onRefused}
                  >
                    <div className={styles.omnibox_icon}>
                      <IconArrow />
                    </div>
                    <div className={styles.omnibox_content}>
                      {BEAM_ME_UP_LABEL}
                    </div>
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ the title */

/** The line above the window. One title in, one out: the outgoing one is
 *  kept until its own fade has ended, then dropped. */
const Title = ({ index }: { index: number }) => {
  const [current, setCurrent] = useState(index);
  const [leaving, setLeaving] = useState<number | null>(null);

  useEffect(() => {
    if (index !== current) {
      setLeaving(current);
      setCurrent(index);
    }
  }, [index, current]);

  return (
    <p className={styles.title}>
      {leaving !== null ? (
        <span
          key={`out-${leaving}`}
          className={cx(styles.title_line, styles.is_out)}
          aria-hidden="true"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) {
              setLeaving(null);
            }
          }}
        >
          {TITLES[leaving]}
        </span>
      ) : null}
      <span
        key={`in-${current}`}
        className={cx(styles.title_line, styles.is_in)}
      >
        {TITLES[current]}
      </span>
    </p>
  );
};

/* ------------------------------------------------------------- the demo */

/** One beat of the script: wait, then do. */
type Step = { ms: number; act?: () => void };

export const BeamDemo = ({
  /** What the page has above the demo, as a length: the demo is pushed down
   *  so the window peeks up from under the fold of a page that has just
   *  loaded, and this is what it is pushed down from. */
  lead,
  /** The rest of the page. It slides up with the demo as the demo is
   *  scrolled to, and back down as it is scrolled away from, so it goes
   *  inside the block that slides. */
  children,
}: {
  lead?: string;
  children?: ReactNode;
}) => {
  const reducedMotion = useReducedMotion();

  const [mode, setModeState] = useState<Mode>("web");
  const [webPage, setWebPageState] = useState<WebPage>("beam-times");
  const [writingPage, setWritingPage] = useState<WritingPage>("journal");
  const [slot, setSlotState] = useState<Slot | null>(null);
  const [shot, setShot] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [inserts, setInserts] = useState<Insert[]>([]);
  const [title, setTitle] = useState(0);
  const [omnibox, setOmnibox] = useState(false);
  const [query, setQuery] = useState("");
  const [publish, setPublish] = useState<PublishState>(IDLE_PUBLISH);
  const [chapter, setChapter] = useState<ChapterId>("notes");
  const [progress, setProgress] = useState({ value: 0, ms: 0 });
  const [arriving, setArriving] = useState(false);
  const [refused, setRefused] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // What the script reads between beats, kept beside the state so a beat
  // sees the page the last one set rather than the one it rendered with.
  const model = useRef({ mode, webPage, slot });
  const insertId = useRef(0);
  const publishTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // The loop's controls: a token every beat checks, so a click that takes
  // over ends the run that was going; the cancel for the beat in flight; and
  // the wake for a beat parked while the omnibox was open.
  const loop = useRef<{
    token: number;
    cancel?: () => void;
    wake?: () => void;
  }>({ token: 0 });
  const pausedRef = useRef(false);
  const omniboxRef = useRef(false);
  // The scroll's side of it: how much of the window is in view, in three
  // states, and the chapter to come back to, so a run stopped by a scroll
  // starts its chapter again rather than the whole loop.
  const viewRef = useRef<"out" | "partly" | "in">("out");
  const chapterRef = useRef<ChapterId>("notes");
  const runningRef = useRef(false);
  const bumpedRef = useRef(false);

  const setMode = useCallback((next: Mode) => {
    model.current.mode = next;
    setModeState(next);
  }, []);
  const setWebPage = useCallback((next: WebPage) => {
    model.current.webPage = next;
    setWebPageState(next);
  }, []);
  const setSlot = useCallback((next: Slot | null) => {
    model.current.slot = next;
    setSlotState(next);
  }, []);
  const go = useCallback(
    (nextMode: Mode, page: WebPage | WritingPage) => {
      setMode(nextMode);
      if (nextMode === "web") {
        setWebPage(page as WebPage);
      } else {
        setWritingPage(page as WritingPage);
      }
    },
    [setMode, setWebPage]
  );
  /** Back to a window at rest: nothing lit, nothing leaning. */
  const settle = useCallback(() => {
    setSlot(null);
    setRotated(false);
  }, [setSlot]);

  /** Lift the block the highlight is on into the journal. */
  const shoot = useCallback(() => {
    const { webPage: page, slot: current } = model.current;
    const content = contentRef.current;
    if (!content || !current) {
      return;
    }
    const target = content.querySelector<HTMLElement>(
      `[data-page="${page}"] [data-slot="${current}"]`
    );
    if (!target) {
      return;
    }
    const read = (el: HTMLElement): Item => ({
      kind: (el.dataset.kind as Item["kind"]) ?? "p",
      size: el.dataset.size as Item["size"],
    });
    // An image, or the avatar, is captured on its own; a block of lines is
    // captured as its lines.
    const media =
      target.dataset.kind === "img" || target.dataset.kind === "circle";
    const items = media
      ? [read(target)]
      : Array.from(target.children, (el) => read(el as HTMLElement));
    setShot(true);
    setInserts((prev) => [
      { id: insertId.current++, media, items, fresh: true },
      ...prev,
    ]);
  }, []);

  const settleInsert = useCallback((id: number) => {
    setInserts((prev) =>
      prev.map((insert) =>
        insert.id === id ? { ...insert, fresh: false } : insert
      )
    );
  }, []);

  const clearPublishTimers = () => {
    publishTimers.current.forEach(clearTimeout);
    publishTimers.current = [];
  };
  const later = (ms: number, act: () => void) => {
    publishTimers.current.push(setTimeout(act, ms));
  };

  /** The publish button's own script, the site's PublishButton beat for beat:
   *  the label shows what is happening, the icon draws a tick, the tooltip
   *  says the link was copied, and the button settles into a link. Published
   *  already, a click shows the tooltip again. */
  const runPublish = useCallback(() => {
    setPublish((state) => {
      if (state.phase === "link") {
        clearPublishTimers();
        later(2000, () =>
          setPublish((s) => ({ ...s, open: false, tooltip: false }))
        );
        return { ...state, open: true, tooltip: true };
      }
      if (state.phase !== "idle") {
        return state;
      }
      clearPublishTimers();
      later(1000, () => {
        setPublish({ phase: "published", open: true, tooltip: true });
        later(2000, () =>
          setPublish({ phase: "link", open: false, tooltip: false })
        );
      });
      return { phase: "publishing", open: true, tooltip: false };
    });
  }, []);

  const resetPublish = useCallback(() => {
    clearPublishTimers();
    setPublish(IDLE_PUBLISH);
  }, []);

  /* ------------------------------------------------------------ the loop */

  /** The loop parks while the omnibox is open, and goes on when it closes. */
  const syncPaused = useCallback(() => {
    pausedRef.current = omniboxRef.current;
    if (!pausedRef.current) {
      loop.current.wake?.();
    }
  }, []);

  /** One beat: the timer, then, if the omnibox is open, the wait for it to
   *  close, and at every point the check that this run is still the one that
   *  should be playing. */
  const beat = useCallback(
    (ms: number, token: number) =>
      new Promise<void>((resolve, reject) => {
        const check = () => {
          if (loop.current.token !== token) {
            reject(new Interrupted());
          } else if (pausedRef.current) {
            loop.current.wake = check;
          } else {
            loop.current.wake = undefined;
            resolve();
          }
        };
        const timer = setTimeout(check, ms);
        loop.current.cancel = () => {
          clearTimeout(timer);
          loop.current.wake = undefined;
          reject(new Interrupted());
        };
      }),
    []
  );

  /** The chapters, as beats. Each waits, then acts, so a chapter's own
   *  length is the sum of its waits, which is what the bar under the demo
   *  fills against. */
  const chapters = useCallback((): Record<ChapterId, Step[]> => {
    const another = (page: WebPage) => {
      const others = WEB_PAGES.filter((candidate) => candidate !== page);
      return others[Math.floor(Math.random() * others.length)] ?? page;
    };
    // The capture, as the site's capturePage ran it: the highlight walks the
    // page's four blocks, the window leans back on the last, and the block
    // is shot into the journal.
    const capturePage = (pick: () => WebPage): Step[] => [
      { ms: 250, act: () => setSlot(null) },
      { ms: 100, act: () => setWebPage(pick()) },
      { ms: 250, act: () => setSlot("first") },
      { ms: 500, act: () => setSlot("second") },
      { ms: 400, act: () => setSlot("third") },
      {
        ms: 600,
        act: () => {
          setSlot("last");
          setRotated(true);
        },
      },
      { ms: 500, act: shoot },
      { ms: 250 },
    ];
    return {
      notes: [
        {
          ms: 0,
          act: () => {
            settle();
            setTitle(0);
            go("web", "beam-times");
            setWritingPage("journal");
          },
        },
        // The journal's captures go once the notes are out of sight.
        { ms: 300, act: () => setInserts([]) },
        { ms: 1050, act: () => setTitle(1) },
        { ms: 1350, act: () => go("writing", "journal") },
        { ms: 2000 },
      ],
      capture: [
        {
          ms: 0,
          act: () => {
            settle();
            setTitle(2);
          },
        },
        { ms: 1350, act: () => setMode("web") },
        { ms: 250 },
        ...capturePage(() => model.current.webPage),
        { ms: 1000 },
        ...capturePage(() => another(model.current.webPage)),
        { ms: 500, act: () => setSlot(null) },
        {
          ms: 250,
          act: () => {
            setTitle(3);
            setRotated(false);
          },
        },
        { ms: 1500, act: () => go("writing", "journal") },
        { ms: 2000 },
      ],
      share: [
        {
          ms: 0,
          act: () => {
            settle();
            setTitle(4);
          },
        },
        { ms: 1350, act: () => go("writing", "note") },
        // The label is shown first, as a hand hovering would, and the click
        // comes a second later.
        {
          ms: 1350,
          act: () => setPublish((state) => ({ ...state, open: true })),
        },
        { ms: 1000, act: runPublish },
        { ms: 3000 },
        { ms: 1100, act: () => setTitle(5) },
        { ms: 3000 },
      ],
    };
  }, [go, runPublish, setMode, setSlot, setWebPage, settle, shoot]);

  const play = useCallback(
    (start: ChapterId) => {
      loop.current.cancel?.();
      const token = ++loop.current.token;
      runningRef.current = true;
      const order: ChapterId[] = ["notes", "capture", "share"];
      const run = async () => {
        let index = order.indexOf(start);
        for (;;) {
          const id = order[index % order.length] as ChapterId;
          const steps = chapters()[id];
          const total = steps.reduce((sum, step) => sum + step.ms, 0);
          let elapsed = 0;
          chapterRef.current = id;
          setChapter(id);
          setProgress({ value: 0, ms: 0 });
          for (const step of steps) {
            if (step.ms > 0) {
              elapsed += step.ms;
              setProgress({ value: elapsed / total, ms: step.ms });
            }
            await beat(step.ms, token);
            step.act?.();
          }
          index += 1;
        }
      };
      run().catch((error) => {
        if (!(error instanceof Interrupted)) {
          throw error;
        }
        if (loop.current.token === token) {
          runningRef.current = false;
        }
      });
    },
    [beat, chapters]
  );

  /** Ends the run that is going, wherever it is, and leaves the window at
   *  rest. */
  const stop = useCallback(() => {
    loop.current.cancel?.();
    loop.current.token += 1;
    runningRef.current = false;
    settle();
  }, [settle]);

  /** Reduced motion: no loop, and each chapter is placed rather than played. */
  const place = useCallback(
    (id: ChapterId) => {
      setChapter(id);
      setProgress({ value: 0, ms: 0 });
      if (id === "notes") {
        settle();
        setTitle(1);
        go("writing", "journal");
      } else if (id === "capture") {
        setTitle(2);
        setMode("web");
        setSlot("last");
        setRotated(true);
      } else {
        settle();
        setTitle(4);
        go("writing", "note");
        clearPublishTimers();
        setPublish({ phase: "link", open: false, tooltip: false });
      }
    },
    [go, setMode, setSlot, settle]
  );

  /** The demo as the page loads it, and as it goes back to once it has been
   *  scrolled out of sight: the site's handleFullyOut. */
  const rewind = useCallback(() => {
    stop();
    chapterRef.current = "notes";
    setChapter("notes");
    setProgress({ value: 0, ms: 0 });
    setTitle(0);
    go("web", "beam-times");
    setWritingPage("journal");
    setInserts([]);
    resetPublish();
  }, [go, resetPublish, stop]);

  useEffect(() => clearPublishTimers, []);

  // The reveal on scroll, as the site had it. The window's share of the
  // viewport drives three things: the window's own scale, 0.9 to 1 as it
  // comes up, with a small bump as it first appears; the title, which slides
  // up into place and fades in over the top of that; and the script, which
  // plays only once the window is nearly all in view, starts its chapter
  // again if the window is scrolled half away and back, and goes back to the
  // beginning once the window has been scrolled out of sight altogether.
  // A hidden tab counts as scrolled half away: its timers are throttled to
  // about one a second, which would wreck the pacing.
  //
  // The window rather than the whole demo, because on a phone the demo with
  // its bar and its help line can be taller than the viewport, and a share
  // of it that never reaches four fifths would be a demo that never plays.
  //
  // Where the browser has view timelines, the scale and the title are the
  // stylesheet's, driven by the stage's own timeline, and are right on the
  // first paint. Where it does not, older Safari and Firefox, they are
  // written here, and the first pair is written in this layout effect, from
  // a measurement, rather than left to the observer's first callback, so
  // the page hydrates with the window at the size the scroll has it rather
  // than painting once and then correcting itself.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const marker = markerRef.current;
    if (!root || !marker) {
      return;
    }
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const map = (value: number, from: number, to: number) =>
      clamp((value - from) / (to - from));
    // The observer keeps 40px off the bottom of the viewport, so the window
    // has to be that far up before it counts as in; the measurement here
    // keeps the same.
    const margin = 40;
    const scripted = !CSS.supports("animation-timeline: view()");
    // What is measured is the marker, the box the stage is drawn in on a
    // page that has just loaded, which never moves: the stage itself is on
    // the block that slides, by the whole of the room, so its own box says
    // nothing about the scroll. The scroll's timeline in the stylesheet
    // reads the same marker, so the fallback reveals at the same scroll.
    const share = (rect: DOMRect, bottom: number) => {
      const visible = Math.min(rect.bottom, bottom) - Math.max(rect.top, 0);
      return rect.height > 0 ? clamp(visible / rect.height) : 0;
    };

    let ratio = 0;
    const sync = () => {
      const inView = ratio >= 0.8 && !document.hidden;
      const outOfView = ratio <= 0.4;
      if (inView) {
        if (viewRef.current !== "in") {
          viewRef.current = "in";
          if (!reducedMotion && !runningRef.current) {
            play(chapterRef.current);
          }
        }
      } else if (outOfView) {
        if (viewRef.current !== "out") {
          viewRef.current = "out";
          if (!reducedMotion) {
            rewind();
          }
        }
      } else if (viewRef.current === "in") {
        viewRef.current = "partly";
        if (!reducedMotion) {
          stop();
        }
      }
    };
    const reveal = (next: number) => {
      ratio = next;
      if (!reducedMotion) {
        // The stylesheet's own bands: the scale and the block's slide from
        // the quarter the page opens on, the title from the half.
        if (scripted) {
          root.style.setProperty(
            "--window-scale",
            `${0.9 + map(ratio, 0.25, 0.65) * 0.1}`
          );
          root.style.setProperty("--title-t", `${map(ratio, 0.5, 0.8)}`);
          root.style.setProperty("--slide-t", `${map(ratio, 0.25, 0.8)}`);
        }
        // The bump plays while the window is peeking and nothing has yet
        // been revealed: any share under the half at which the title starts
        // to come in, which takes in the quarter the page opens on. The
        // bump on load is the nudge to scroll.
        setArriving(ratio < 0.5);
      }
      sync();
    };

    // Now, from where the marker is, before the browser paints.
    reveal(share(marker.getBoundingClientRect(), window.innerHeight - margin));

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          reveal(
            share(
              entry.boundingClientRect,
              entry.rootBounds?.bottom ?? window.innerHeight - margin
            )
          );
        }
      },
      {
        rootMargin: `0px 0px -${margin}px 0px`,
        threshold: Array.from({ length: 101 }, (_, i) => i / 100),
      }
    );
    observer.observe(marker);
    document.addEventListener("visibilitychange", sync);
    const current = loop.current;
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      current.cancel?.();
      current.token += 1;
      runningRef.current = false;
      viewRef.current = "out";
    };
  }, [play, reducedMotion, rewind, stop]);

  // Going back to the web puts the publish button back the way it was, once
  // the notes have faded: the site did the same on the fade's transitionend.
  useEffect(() => {
    if (mode !== "web") {
      return;
    }
    const timer = setTimeout(resetPublish, 200);
    return () => clearTimeout(timer);
  }, [mode, resetPublish]);

  /* ------------------------------------------------------------ the panes */

  // A pane is only a scroll container once its content overflows it. One
  // that could scroll but had nothing to scroll still took the wheel, and
  // on a Mac bounced, over content that plainly did not move; and it kept
  // the page from scrolling under the pointer. Checked again when the window
  // is resized, since the panes are laid out in em of it, and when the
  // journal gains a capture.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }
    const panes = Array.from(
      content.querySelectorAll<HTMLElement>("[data-page]")
    );
    const check = () => {
      panes.forEach((pane) => {
        pane.classList.toggle(
          styles.is_scrollable ?? "",
          pane.scrollHeight > pane.clientHeight + 1
        );
      });
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(content);
    return () => observer.disconnect();
  }, [inserts.length]);

  /* --------------------------------------------------------- the highlight */

  // The lit rectangle is placed over the block by measuring it: offsets up
  // the chain to the content box, less what the page has scrolled, written
  // as custom properties the stylesheet transitions between. Measured again
  // when the page under it changes, when the page scrolls, and when the
  // window is resized, since the blocks are laid out in em of it.
  useLayoutEffect(() => {
    const content = contentRef.current;
    const highlight = highlightRef.current;
    if (!content || !highlight) {
      return;
    }
    const doc = content.querySelector<HTMLElement>(`[data-page="${webPage}"]`);
    const measure = () => {
      const target = slot
        ? content.querySelector<HTMLElement>(
            `[data-page="${webPage}"] [data-slot="${slot}"]`
          )
        : null;
      if (!target) {
        highlight.style.setProperty("--x", "50%");
        highlight.style.setProperty("--y", "50%");
        highlight.style.setProperty("--width", "0px");
        highlight.style.setProperty("--height", "0px");
        return;
      }
      let x = 0;
      let y = 0;
      for (
        let el: HTMLElement | null = target;
        el && el !== content;
        el = el.offsetParent as HTMLElement | null
      ) {
        x += el.offsetLeft;
        y += el.offsetTop;
      }
      y -= doc?.scrollTop ?? 0;
      highlight.style.setProperty("--x", `${x}px`);
      highlight.style.setProperty("--y", `${y}px`);
      highlight.style.setProperty("--width", `${target.offsetWidth}px`);
      highlight.style.setProperty("--height", `${target.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    doc?.addEventListener("scroll", measure);
    return () => {
      observer.disconnect();
      doc?.removeEventListener("scroll", measure);
    };
  }, [slot, webPage]);

  /* ------------------------------------------------------- the handlers */

  const takeOver = useCallback(
    (nextMode: Mode) => {
      if (reducedMotion) {
        place(nextMode === "web" ? "capture" : "share");
      } else {
        play(nextMode === "web" ? "capture" : "share");
      }
    },
    [place, play, reducedMotion]
  );

  const closeOmnibox = useCallback(() => {
    omniboxRef.current = false;
    setOmnibox(false);
    syncPaused();
  }, [syncPaused]);

  const openOmnibox = useCallback(() => {
    setSlot(null);
    setQuery("");
    omniboxRef.current = true;
    setOmnibox(true);
    syncPaused();
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [setSlot, syncPaused]);

  const pick = useCallback(
    (nextMode: Mode, page: WebPage | WritingPage) => {
      closeOmnibox();
      if (nextMode !== model.current.mode) {
        go(nextMode, page);
        takeOver(nextMode);
      } else {
        go(nextMode, page);
      }
    },
    [closeOmnibox, go, takeOver]
  );

  // The omnibox's keys, on the box rather than the field, since the rows
  // take the focus too: Escape closes; the arrows walk the rows, down from
  // the field into the first, up from the first back into the field, and
  // round the ends; Enter in the field takes the first hit, and on a row is
  // the row's own click; and any key that would type, pressed on a row,
  // puts the focus back in the field first, so it types there.
  const onOmniboxKey = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      const rows = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>("button")
      );
      const index = rows.indexOf(event.target as HTMLButtonElement);
      if (event.key === "Escape") {
        event.preventDefault();
        input?.blur();
        closeOmnibox();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (rows.length === 0) {
          return;
        }
        const down = event.key === "ArrowDown";
        const next = down ? index + 1 : index - 1;
        if (next < 0 || next >= rows.length) {
          // Off either end of the rows is the field; from the field, the
          // arrows go to the nearer end.
          if (index === -1) {
            (down ? rows[0] : rows[rows.length - 1])?.focus();
          } else {
            input?.focus();
          }
        } else {
          rows[next]?.focus();
        }
        return;
      }
      if (index >= 0) {
        if (event.key === "Enter" || event.key === " " || event.key === "Tab") {
          return;
        }
        if (
          (event.key.length === 1 && !event.metaKey && !event.ctrlKey) ||
          event.key === "Backspace"
        ) {
          input?.focus();
        }
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const value = input?.value.trim().toLowerCase() ?? "";
        if (isBeamMeUp(value)) {
          setRefused(true);
          return;
        }
        const hit = WEB_TABS.map((tab) => ({
          mode: "web" as Mode,
          page: tab.page as WebPage | WritingPage,
          label: tab.label,
        }))
          .concat(
            WRITING_TABS.map((tab) => ({
              mode: "writing" as Mode,
              page: tab.page,
              label: tab.label,
            }))
          )
          .find(
            (candidate) =>
              !value || candidate.label.toLowerCase().includes(value)
          );
        if (hit) {
          pick(hit.mode, hit.page);
        }
      }
    },
    [closeOmnibox, pick]
  );

  const onOmniboxBlur = useCallback(
    (event: ReactFocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        closeOmnibox();
      }
    },
    [closeOmnibox]
  );

  const onToggleMode = useCallback(() => {
    const next: Mode = model.current.mode === "web" ? "writing" : "web";
    setMode(next);
    takeOver(next);
  }, [setMode, takeOver]);

  const onSearch = useCallback(() => {
    if (omniboxRef.current) {
      closeOmnibox();
    } else {
      openOmnibox();
    }
  }, [closeOmnibox, openOmnibox]);

  // ⌘K opens the omnibox, and closes it, as it did in the app; ⌃K too, for
  // a keyboard without a ⌘. Only while the window is on screen, so the key
  // is the page's own everywhere else on it, and never from a field the
  // reader is typing in.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "k" ||
        !(event.metaKey || event.ctrlKey) ||
        event.shiftKey ||
        event.altKey ||
        event.repeat ||
        viewRef.current === "out"
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        target !== inputRef.current &&
        (target.isContentEditable ||
          /^(input|textarea|select)$/i.test(target.tagName));
      if (typing) {
        return;
      }
      event.preventDefault();
      onSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSearch]);

  const onChapter = useCallback(
    (id: ChapterId) => {
      if (id === chapter && !reducedMotion) {
        return;
      }
      if (reducedMotion) {
        place(id);
      } else {
        play(id);
      }
    },
    [chapter, place, play, reducedMotion]
  );

  const onRefuse = useCallback(() => setRefused(true), []);
  const onRefused = useCallback(() => setRefused(false), []);

  const front: NonNullable<WindowProps["front"]> = {
    capturing: slot !== null,
    shot,
    onShotEnd: () => setShot(false),
    contentRef,
    highlightRef,
    omnibox,
    query,
    inputRef,
    onQuery: setQuery,
    onOmniboxKey,
    onOmniboxBlur,
    onSearch,
    onToggleMode,
    onWebTab: setWebPage,
    onWritingTab: setWritingPage,
    onPick: pick,
    onPublish: runPublish,
    refused,
    onRefuse,
    onRefused,
  };

  return (
    <div
      ref={rootRef}
      className={styles.scroll_reveal}
      style={{ "--demo-lead": lead } as CSSProperties}
    >
      <div className={styles.room}>
        {/* The room above the demo on a page that has just loaded, with an
            arrow in the middle of it, since a window peeking up from under
            the fold is an invitation and this says so. The arrow is a way
            down as well. */}
        <div ref={markerRef} className={styles.marker} aria-hidden="true" />
        <div className={styles.lead_space}>
          <button
            type="button"
            className={styles.hint}
            aria-label="Scroll to the demo"
            onClick={() =>
              stageRef.current?.scrollIntoView({
                block: "center",
                behavior: reducedMotion ? "auto" : "smooth",
              })
            }
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 9l7 7 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* The block that slides: the demo, and whatever the page has after
            it. */}
        <div className={styles.slide}>
          <div className={styles.demo}>
            <Title index={title} />

            {/* The window is a drawing of an app running a script, so it is hidden
          from assistive tech; the title above and the chapter bar below are
          what a screen reader gets, and the bar is the way through it. */}
            <div ref={stageRef} className={styles.stage} aria-hidden="true">
              <div className={styles.scene}>
                <div
                  className={cx(
                    styles.windows,
                    rotated && styles.is_rotated,
                    arriving && styles.is_arriving
                  )}
                  // The site's first bump waited half a second for the page to
                  // settle, and the ones after it did not.
                  style={
                    {
                      "--bump-delay": bumpedRef.current ? "0s" : "0.5s",
                    } as CSSProperties
                  }
                  onAnimationEnd={(event) => {
                    if (event.animationName.includes("bump")) {
                      bumpedRef.current = true;
                    }
                  }}
                >
                  {/* The double: the journal, standing behind the browser while a
                capture lands in it, so the page and the note it goes into
                are in view together. */}
                  <div className={cx(styles.host, styles.is_double)} inert>
                    <Window
                      mode="writing"
                      webPage={webPage}
                      writingPage="journal"
                      inserts={inserts}
                      onSettleInsert={settleInsert}
                      publish={publish}
                    />
                  </div>
                  <div className={styles.host}>
                    <Window
                      mode={mode}
                      webPage={webPage}
                      writingPage={writingPage}
                      inserts={inserts}
                      onSettleInsert={settleInsert}
                      publish={publish}
                      front={front}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.chapters}>
              {CHAPTERS.map((item, index) => {
                const current = item.id === chapter;
                const passed =
                  CHAPTERS.findIndex((candidate) => candidate.id === chapter) >
                  index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cx(
                      styles.chapter_button,
                      current && styles.is_current
                    )}
                    aria-current={current ? "true" : undefined}
                    onClick={() => onChapter(item.id)}
                  >
                    <span className={styles.chapter_track}>
                      <span
                        className={styles.chapter_fill}
                        style={{
                          transform: `scaleX(${
                            passed ? 1 : current ? progress.value : 0
                          })`,
                          transitionDuration: `${current ? progress.ms : 0}ms`,
                        }}
                      />
                    </span>
                    <span className={styles.chapter_label}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <p className={cx(styles.caption, styles.caption_try)}>
              The window works: switch tabs, open the search, or press{" "}
              <kbd>⌘</kbd>
              <kbd>K</kbd>, flip between the web and the notes, and publish the
              note.
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
