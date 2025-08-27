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

- **Framework**: Next.js 15 with App Router
- **UI**: React 19 + TypeScript + Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: Zustand
- **EXIF Processing**: exifr
- **File Upload**: react-dropzone
- **Deployment**: Cloudflare Workers/Pages

## 🔧 Configuration

### Cloudflare Workers/Pages Setup

1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **Environment Variables** (optional):
   - `NODE_VERSION`: 20
   - `NPM_VERSION`: 10
   - `NEXT_TELEMETRY_DISABLED`: 1

### Security Headers

The app includes security headers in `_headers`:

- Content Security Policy
- Cross-Origin Policies
- XSS Protection

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── upload/      # File upload components
│   ├── editor/      # Canvas and template components
│   └── export/      # Export controls
├── services/        # Business logic (EXIF, Canvas, etc.)
├── stores/          # Zustand state management
├── templates/       # Design templates
├── types/           # TypeScript definitions
└── utils/           # Utility functions
```

## 🎨 Templates

- **Minimal**: Clean, essential information
- **Classic**: Traditional film-inspired layout
- **Modern**: Contemporary design with icons
- _More templates coming soon..._

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

## 🚀 Deployment

### Cloudflare Workers/Pages

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
   # Build the project
   npm run build

   # Deploy to preview
   npm run deploy:preview

   # Deploy to production (metamark.kiakiraki.dev)
   npm run deploy:production
   ```

3. **Configuration**:
   - **Custom Domain**: `metamark.kiakiraki.dev`
   - **Output Directory**: `dist/`
   - **Wrangler Config**: `wrangler.toml`

4. **Alternative: Cloudflare Pages Dashboard**:
   - Framework preset: `Next.js (Static HTML Export)`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Deploy command: leave empty

## 🎯 MVP Status

✅ **Completed Features**:

- Image upload with drag & drop
- EXIF metadata extraction
- Basic template system (Minimal, Classic, Modern)
- Canvas rendering with overlays
- High-quality image export
- Responsive UI with dark/light themes
- Static site generation for Cloudflare Workers/Pages

🔄 **Coming Next**:

- Additional templates (Film, Technical)
- Custom template editor
- Batch processing
- RAW image support

---

Built with ❤️ for photographers by photographers.
