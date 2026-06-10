// Font-family constants. The font files are self-hosted via @fontsource
// packages whose CSS is imported in src/app/layout.tsx — no build-time
// network fetches (next/font/google pulled ~120 subset files from gstatic
// and a single transient failure broke the build, see
// docs/font-build-failure.md).
//
// The `{ style: { fontFamily } }` shape matches what next/font exported so
// templates keep reading `xxx.style.fontFamily` unchanged. These strings
// must match the @font-face family names declared by the @fontsource CSS.

export const geistSans = {
  style: { fontFamily: "'Geist Variable', system-ui, sans-serif" },
};

export const geistMono = {
  style: { fontFamily: "'Geist Mono Variable', monospace" },
};

export const dotGothic = {
  style: { fontFamily: "'DotGothic16'" },
};

export const besley = {
  style: { fontFamily: "'Besley Variable', serif" },
};
