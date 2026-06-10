# MetaMark

Add beautiful EXIF metadata overlays to your photos.

## ✨ Features

- **Privacy-First**: Complete client-side processing - your photos never leave your browser
- **Professional Templates**: Beautiful, customizable overlay designs for camera metadata
- **EXIF Extraction**: Automatically reads camera settings, lens info, and shooting parameters
- **High-Quality Output**: Export up to 4K resolution with pristine quality
- **Modern Interface**: Clean, intuitive design with drag & drop functionality

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production (static export)
npm run build

# Output will be in the 'dist/' directory
```

## 📷 How It Works

1. **Upload**: Drag & drop your photos (JPEG, PNG, HEIC)
2. **Extract**: Automatic EXIF metadata extraction
3. **Style**: Choose from professional templates
4. **Export**: Download high-quality images with beautiful overlays

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router, static export, Turbopack)
- **UI**: React 19 + TypeScript + Tailwind CSS v4
- **Components**: Radix UI primitives (Dialog, Select, Slider)
- **Animations**: Framer Motion
- **State Management**: Zustand (with `persist` for user settings)
- **EXIF Processing**: exifr
- **File Upload**: react-dropzone
- **Testing**: Vitest + Testing Library (jsdom)
- **Deployment**: Cloudflare Workers

## 🔧 Configuration

### Cloudflare Workers Setup

1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`

### Security Headers

Response headers are served from `dist/_headers` (Workers Static Assets):

- The base set (COOP/COEP, XFO, XCTO, HSTS, Referrer-Policy) and cache
  policy for `/_next/static/*` live in `public/_headers`.
- The Content Security Policy is appended after each build by
  `scripts/generate-csp.mjs` (the `postbuild` hook), because the static
  export embeds inline scripts whose hashes change every build.

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router (single page + layout)
├── components/       # React components
│   ├── workspace/    # Image preview, drag & drop, context menu
│   ├── editor/       # Template/position selectors, lens & location overrides
│   ├── export/       # Export controls
│   ├── ui/           # Toast container
│   └── ErrorBoundary.tsx
├── hooks/            # Custom React hooks (canvas, upload, pan/zoom, export, toast, ...)
├── services/         # Business logic (EXIF extraction, canvas rendering, image I/O)
├── stores/           # Zustand state management
├── templates/        # Overlay template definitions
├── types/            # TypeScript definitions
└── styles/           # Font loaders + bundled DotGothic16 woff2
```

## 🎨 Templates

- **Caption**: Footer bar with optional invert
- **Compact**: 2×2 frosted info card
- **Technical**: Detailed specs with iconography (monospaced)
- **Film**: Retro film-camera date imprint (auto-rotates for portrait)
- **Imprint**: Frameless EXIF text printed directly on the photo (white/black)
- **Gallery Placard**: Museum-style bottom placard with refined typography (with optional invert)

## 📋 Requirements

- Node.js 20+
- Modern browser with Canvas API support
- JavaScript enabled (client-side processing)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

The bundled DotGothic16 font (`src/styles/fonts/DotGothic16-Latin.woff2`) is distributed under the SIL Open Font License 1.1; see [`src/styles/fonts/DotGothic16-OFL.txt`](src/styles/fonts/DotGothic16-OFL.txt).

## 🚀 Deployment

### Cloudflare Workers

This project is configured for deployment to Cloudflare Workers with custom domain support:

1. **Prerequisites**:

   ```bash
   # Install Wrangler CLI
   npm install -g wrangler

   # Login to Cloudflare
   wrangler login
   ```

2. **Deployment Commands**:

   ```bash
   # Build the project (static export)
   npm run build

   # Deploy to preview (Workers)
   npm run deploy:preview

   # Deploy to production (Workers)
   npm run deploy
   ```

3. **Configuration**:
   - **Custom Domain**: `metamark.kiakiraki.dev`
   - **Output Directory**: `dist/`
   - **Wrangler Config**: `wrangler.toml`

4. **Notes**:
   - The Worker serves static assets from `dist/`; response headers come from `dist/_headers`.
   - Ensure DNS/custom domain is mapped to the Worker route in `wrangler.toml`.

## 🎯 MVP Status

✅ **Completed Features**:

- Image upload with drag & drop
- EXIF metadata extraction with Sony α-series model name normalization
- Lens / location manual overrides
- Template system (Caption, Compact, Technical, Film, Imprint, Gallery Placard)
- Canvas rendering with overlays, pan & zoom preview, right-click context menu
- High-quality image export (PNG/JPEG, quality control)
- Static site generation for Cloudflare Workers

🔄 **Coming Next**:

- Custom template editor
- Batch processing
- RAW image support

---

Built with ❤️ for photographers by photographers.
