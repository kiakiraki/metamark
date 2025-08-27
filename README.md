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
# Build for production (static export for Cloudflare Pages)
npm run build

# Output will be in the 'out/' directory
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
- **Deployment**: Cloudflare Pages

## 🔧 Configuration

### Cloudflare Pages Setup

1. **Build Command**: `npm run build`
2. **Output Directory**: `out`
3. **Environment Variables**:
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

### Cloudflare Pages

This project is configured for deployment to Cloudflare Pages:

1. **Build Settings** (in Cloudflare Pages dashboard):
   - Framework preset: `Next.js (Static HTML Export)`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - **Deploy command: LEAVE EMPTY** (do not use wrangler)

2. **Important Notes**:
   - Do NOT use `npx wrangler deploy` in the deploy command
   - Cloudflare Pages will automatically deploy the static files from `dist/`
   - The `_headers` file is automatically included for security headers

3. **Manual Deployment**:
   ```bash
   npm run build
   # Upload the `dist/` directory to Cloudflare Pages dashboard
   ```

## 🎯 MVP Status

✅ **Completed Features**:

- Image upload with drag & drop
- EXIF metadata extraction
- Basic template system (Minimal, Classic, Modern)
- Canvas rendering with overlays
- High-quality image export
- Responsive UI with dark/light themes
- Static site generation for Cloudflare Pages

🔄 **Coming Next**:

- Additional templates (Film, Technical)
- Custom template editor
- Batch processing
- RAW image support

---

Built with ❤️ for photographers by photographers.
