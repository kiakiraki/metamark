import type { RenderOptions, CanvasSettings } from '@/types/canvas';
import type { Template, PositionPreset } from '@/types/template';
import type { NormalizedExifData } from '@/types/exif';

// Cached measurement canvas/context to avoid repeated DOM element creation
let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof document === 'undefined') return null;
  measureCanvas = document.createElement('canvas');
  measureCtx = measureCanvas.getContext('2d');
  return measureCtx;
}

// Font load promise cache to avoid redundant document.fonts.load() calls
const fontLoadCache = new Map<string, Promise<FontFace[]>>();

function loadFontCached(spec: string): Promise<FontFace[]> {
  const cached = fontLoadCache.get(spec);
  if (cached) return cached;
  const fonts = typeof document !== 'undefined' ? document.fonts : null;
  if (!fonts?.load) return Promise.resolve([]);
  const promise = fonts.load(spec);
  fontLoadCache.set(spec, promise);
  return promise;
}

// Caption layout cache: avoids re-computing buildCaptionLayout multiple times
// within a single render cycle (height calc + position calc + draw).
interface CaptionLayout {
  height: number;
  padding: number;
  bodyFontSize: number;
  bodyLineHeight: number;
  paramsFontSize: number;
  paramsLineHeight: number;
  titleFontSize: number;
  titleLineHeight: number;
  makeFontSize: number;
  makeLineHeight: number;
  makeLetterSpacing: string;
  metaFontSize: number;
  metaLineHeight: number;
  columnGap: number;
  leftColumnWidth: number;
  rightColumnWidth: number;
  contentHeight: number;
  makeToTitleGap: number;
  rightRowGap: number;
  makeText: string | null;
  titleLines: string[];
  paramsLines: string[];
  dateLines: string[];
  locationLines: string[];
}

let captionLayoutCache: {
  key: string;
  layout: CaptionLayout;
} | null = null;

type TechnicalIconKind =
  | 'lens'
  | 'focal'
  | 'aperture'
  | 'shutter'
  | 'iso'
  | 'date'
  | 'location';

interface TechnicalRow {
  kind: TechnicalIconKind;
  label: string;
  value: string;
}

interface TechnicalLayout {
  padding: number;
  borderRadius: number;
  makeText: string | null;
  modelText: string | null;
  makeFontSize: number;
  modelFontSize: number;
  makeToModelGap: number;
  headerToDividerGap: number;
  dividerThickness: number;
  dividerToRowsGap: number;
  rows: TechnicalRow[];
  rowGap: number;
  rowHeight: number;
  iconRadius: number;
  iconStrokeWidth: number;
  iconToTextGap: number;
  rowLabelFontSize: number;
  rowValueFontSize: number;
  rowLabelToValueGap: number;
  rowLabelOpacity: number;
}

let technicalLayoutCache: {
  key: string;
  layout: TechnicalLayout;
} | null = null;

interface TechnicalHorizontalLayout {
  width: number;
  height: number;
  padding: number;
  borderRadius: number;
  makeText: string | null;
  modelText: string | null;
  makeFontSize: number;
  modelFontSize: number;
  makeToModelGap: number;
  headerHeight: number;
  headerToDividerGap: number;
  dividerThickness: number;
  dividerToItemsGap: number;
  rows: TechnicalRow[];
  gridRows: number;
  gridCols: number;
  itemColumnGap: number;
  itemColumnWidth: number;
  itemRowHeight: number;
  itemRowGap: number;
  iconRadius: number;
  iconStrokeWidth: number;
  iconToTextGap: number;
  itemLabelFontSize: number;
  itemValueFontSize: number;
  itemLabelToValueGap: number;
  itemValueLineHeight: number;
  itemValueLines: string[][];
  itemValueMaxLines: number;
  itemLabelOpacity: number;
}

let technicalHorizontalLayoutCache: {
  key: string;
  layout: TechnicalHorizontalLayout;
} | null = null;

function isTechnicalHorizontalPosition(
  position: PositionPreset | undefined
): boolean {
  // Glass template position mapping (each position name matches one corner the
  // panel touches): top-left & bottom-right are horizontal banners (top/bottom
  // edges); top-right & bottom-left are vertical panels (right/left edges).
  return position === 'top-left' || position === 'bottom-right';
}

type CompactIconKind = 'camera' | 'lens-aperture' | 'location';

interface CompactLayout {
  panelHeight: number;
  padding: number;
  borderRadius: number;
  cellWidth: number;
  fullRowWidth: number;
  columnGap: number;
  rowGap: number;
  rowHeight: number;
  labelFontSize: number;
  valueFontSize: number;
  labelToValueGap: number;
  iconSize: number;
  iconStrokeWidth: number;
  iconToLabelGap: number;
  cameraValue: string;
  lensValue: string;
  settingsValue: string;
  dateValue: string;
  locationValue: string | null;
}

let compactLayoutCache: {
  key: string;
  layout: CompactLayout;
} | null = null;

interface ImprintLayout {
  padding: number;
  height: number;
  contentHeight: number;
  rowGap: number;
  baseFontSize: number;
  makeText: string | null;
  modelText: string | null;
  headlineFontSize: number;
  headlineWeightMake: number;
  headlineWeightModel: number;
  headlineGap: number;
  headlineHeight: number;
  makeLetterSpacing: string;
  paramsText: string | null;
  paramsFontSize: number;
  paramsOpacity: number;
  locationText: string | null;
  locationFontSize: number;
  locationOpacity: number;
}

let imprintLayoutCache: {
  key: string;
  layout: ImprintLayout;
} | null = null;

export class CanvasRenderer {
  static async render(options: RenderOptions): Promise<string> {
    const { canvas, image, template, exifData, settings } = options;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Unable to get canvas context');
    }

    // Get device pixel ratio for high-DPI displays
    const devicePixelRatio =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const baseWidth = settings.width;
    const baseHeight = settings.height;
    const scaleFactor = Math.min(baseWidth, baseHeight) / 1000; // Base scale for 1000px
    const isBottomPadding = template.layout === 'bottom-padding';
    const bottomPaddingHeight = isBottomPadding
      ? this.calculateDynamicTemplateHeight(
          template,
          exifData,
          scaleFactor,
          baseWidth
        )
      : 0;
    const canvasWidth = baseWidth;
    const canvasHeight = baseHeight + bottomPaddingHeight;

    // Set actual size in memory (scaled for device pixel ratio)
    canvas.width = canvasWidth * devicePixelRatio;
    canvas.height = canvasHeight * devicePixelRatio;

    // Scale the context to ensure correct drawing operations
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Use high-quality interpolation when the browser scales the source image
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    let drawWidth, drawHeight, drawX, drawY;

    if (isBottomPadding) {
      drawWidth = baseWidth;
      drawHeight = baseHeight;
      drawX = 0;
      drawY = 0;
    } else {
      // Use the original image aspect ratio for accurate drawing
      const originalImageAspectRatio = image.width / image.height;
      const canvasAspectRatio = canvasWidth / canvasHeight;

      if (originalImageAspectRatio > canvasAspectRatio) {
        // Image is wider than canvas - fit width, calculate height from original aspect ratio
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / originalImageAspectRatio;
        drawX = 0;
        drawY = (canvasHeight - drawHeight) / 2;
      } else {
        // Image is taller than canvas - fit height, calculate width from original aspect ratio
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * originalImageAspectRatio;
        drawX = (canvasWidth - drawWidth) / 2;
        drawY = 0;
      }
    }

    // Draw image with preserved aspect ratio. For very large source images
    // we step the source down by halves first — repeated bilinear passes
    // approximate Lanczos and avoid the moire/aliasing a single big drawImage
    // produces when the destination is much smaller than the source.
    const targetPixelWidth = Math.max(
      1,
      Math.round(drawWidth * devicePixelRatio)
    );
    const targetPixelHeight = Math.max(
      1,
      Math.round(drawHeight * devicePixelRatio)
    );
    const drawableSource = this.stepDownSource(
      image,
      targetPixelWidth,
      targetPixelHeight
    );
    ctx.drawImage(drawableSource, drawX, drawY, drawWidth, drawHeight);

    // Load required fonts declared by the template
    if (template.fontRequirements?.length) {
      try {
        const baseFontSize = Math.max(
          12,
          template.style.fontSize * scaleFactor
        );
        const promises = template.fontRequirements.map((req) => {
          const weights = req.weights ?? [400];
          return Promise.all(
            weights.map((w) => {
              const fontSize =
                w > 400
                  ? Math.max(baseFontSize * 1.6, baseFontSize + 6)
                  : baseFontSize;
              const prefix = w !== 400 ? `${w} ` : '';
              return loadFontCached(`${prefix}${fontSize}px ${req.family}`);
            })
          );
        });
        await Promise.all(promises);
      } catch {
        // noop
      }
    }

    // Calculate dynamic position based on overlay position setting and exif data
    const isPortraitImage = image.height > image.width;
    let effectiveSettings: CanvasSettings = settings;
    if (template.positionOverride) {
      effectiveSettings = {
        ...settings,
        overlayPosition: template.positionOverride(isPortraitImage),
      };
    } else if (isBottomPadding) {
      effectiveSettings = { ...settings, overlayPosition: 'bottom-left' };
    }

    const dynamicTemplate = this.calculateDynamicPosition(
      template,
      effectiveSettings,
      canvasWidth,
      canvasHeight,
      exifData,
      { drawX, drawY, drawWidth, drawHeight },
      scaleFactor
    );

    // Draw template overlay with scaling
    this.drawTemplate(ctx, dynamicTemplate, exifData, scaleFactor, {
      imageIsPortrait: isPortraitImage,
      overlayPosition: effectiveSettings.overlayPosition,
    });

    // Return as data URL
    return canvas.toDataURL(
      settings.format === 'png' ? 'image/png' : 'image/jpeg',
      settings.quality
    );
  }

  private static calculateDynamicPosition(
    template: Template,
    settings: CanvasSettings,
    canvasWidth: number,
    canvasHeight: number,
    exifData: NormalizedExifData,
    drawRect?: {
      drawX: number;
      drawY: number;
      drawWidth: number;
      drawHeight: number;
    },
    scaleFactor: number = 1
  ): Template {
    const { overlayPosition } = settings;

    // Calculate responsive margin based on canvas size
    const baseMargin = 20;
    const margin = Math.max(10, Math.min(40, baseMargin * scaleFactor)); // Clamp between 10-40px

    // Calculate scaled template dimensions
    const isBottomPadding = template.layout === 'bottom-padding';
    const isTechnical = template.customDraw === 'technical';
    const useTechnicalHorizontal =
      isTechnical && isTechnicalHorizontalPosition(overlayPosition);
    let scaledWidth: number;
    let scaledHeight: number;
    if (isBottomPadding) {
      scaledWidth = canvasWidth;
      scaledHeight = this.calculateDynamicTemplateHeight(
        template,
        exifData,
        scaleFactor,
        scaledWidth
      );
    } else if (useTechnicalHorizontal) {
      // Horizontal banner: spans the image width with symmetric margins
      const imageAreaWidth = drawRect ? drawRect.drawWidth : canvasWidth;
      scaledWidth = Math.max(0, imageAreaWidth - margin * 2);
      const layout = this.buildTechnicalHorizontalLayout(
        template,
        exifData,
        scaleFactor,
        scaledWidth
      );
      scaledHeight = layout.height;
    } else if (isTechnical) {
      // Technical panel fills the image vertically with symmetric margins
      scaledWidth = template.position.width * scaleFactor;
      const imageAreaHeight = drawRect ? drawRect.drawHeight : canvasHeight;
      scaledHeight = Math.max(0, imageAreaHeight - margin * 2);
    } else {
      scaledWidth = template.position.width * scaleFactor;
      scaledHeight = this.calculateDynamicTemplateHeight(
        template,
        exifData,
        scaleFactor,
        scaledWidth
      );
    }

    let x: number, y: number;

    // If we know where the image was drawn, align overlay to the image bounds
    const hasDrawRect = !!drawRect;
    const imageLeft = hasDrawRect ? drawRect!.drawX : 0;
    const imageTop = hasDrawRect ? drawRect!.drawY : 0;
    const imageRight = hasDrawRect
      ? drawRect!.drawX + drawRect!.drawWidth
      : canvasWidth;
    const imageBottom = hasDrawRect
      ? drawRect!.drawY + drawRect!.drawHeight
      : canvasHeight;

    if (isBottomPadding) {
      x = hasDrawRect ? imageLeft : 0;
      y = hasDrawRect ? imageBottom : Math.max(0, canvasHeight - scaledHeight);
    } else {
      const extraInset = template.textShadow ? margin : 0; // nudge inward for overlay-only templates

      switch (overlayPosition) {
        case 'top-left':
          x = (hasDrawRect ? imageLeft : 0) + margin;
          y = (hasDrawRect ? imageTop : 0) + margin;
          break;
        case 'top-right':
          x =
            (hasDrawRect ? imageRight : canvasWidth) -
            scaledWidth -
            (margin + extraInset);
          y = (hasDrawRect ? imageTop : 0) + (margin + extraInset);
          break;
        case 'bottom-left':
          x = (hasDrawRect ? imageLeft : 0) + margin;
          y =
            (hasDrawRect ? imageBottom : canvasHeight) - scaledHeight - margin;
          break;
        case 'bottom-right':
          x =
            (hasDrawRect ? imageRight : canvasWidth) -
            scaledWidth -
            (margin + extraInset);
          y =
            (hasDrawRect ? imageBottom : canvasHeight) -
            scaledHeight -
            (margin + extraInset);
          break;
        default:
          x = template.position.x;
          y = template.position.y;
      }
    }

    return {
      ...template,
      position: {
        ...template.position,
        x,
        y,
        width:
          isBottomPadding || useTechnicalHorizontal
            ? scaledWidth / scaleFactor
            : template.position.width,
        height: scaledHeight / scaleFactor, // Store the calculated height back to template
      },
    };
  }

  private static calculateDynamicTemplateHeight(
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number,
    availableWidth?: number
  ): number {
    const scaledFontSize = Math.max(12, template.style.fontSize * scaleFactor);
    const scaledPadding = template.style.padding * scaleFactor;
    const lineHeight = scaledFontSize * 1.4;

    // Use cached measurement canvas to avoid repeated DOM element creation
    const tempCtx = getMeasureContext();

    if (!tempCtx) {
      // Fallback: count visible fields without wrapping
      const visibleFields = template.fields.filter((field) => field.visible);
      const linesToDisplay = visibleFields.length;
      return (
        scaledPadding + // top padding
        scaledFontSize + // first line baseline
        (linesToDisplay - 1) * lineHeight + // additional lines
        scaledPadding // bottom padding
      );
    }

    if (template.customDraw === 'caption') {
      const layout = this.buildCaptionLayout(
        template,
        exifData,
        scaleFactor,
        availableWidth ?? template.position.width * scaleFactor,
        tempCtx
      );
      return layout.height;
    }

    if (template.customDraw === 'compact') {
      const layout = this.buildCompactLayout(template, exifData, scaleFactor);
      return layout.panelHeight;
    }

    if (template.customDraw === 'imprint') {
      const layout = this.buildImprintLayout(template, exifData, scaleFactor);
      return layout.height;
    }

    tempCtx.font = `${scaledFontSize}px ${template.style.fontFamily}`;

    // Calculate available width for text
    const templateWidth =
      availableWidth ?? template.position.width * scaleFactor;
    const maxTextWidth = templateWidth - scaledPadding * 2;

    // Count total lines including wrapped text
    const visibleFields = template.fields.filter((field) => field.visible);
    let totalLines = 0;

    for (const field of visibleFields) {
      const value = exifData[field.key];
      const text = value
        ? field.format
          ? field.format(value)
          : `${field.label}: ${value}`
        : `${field.label}: N/A`;

      // Calculate wrapped lines for this text
      const wrappedLines = this.wrapText(tempCtx, text, maxTextWidth);
      totalLines += wrappedLines.length;
    }

    // Calculate dynamic height based on total wrapped lines
    return (
      scaledPadding + // top padding
      scaledFontSize + // first line baseline
      (totalLines - 1) * lineHeight + // additional lines
      scaledPadding // bottom padding
    );
  }

  private static wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private static getCaptionCameraParts(exifData: NormalizedExifData): {
    make: string | null;
    model: string | null;
  } {
    let make = exifData.cameraMake;
    let model = exifData.cameraModel;

    if (make && model) {
      const lowerMake = make.toLowerCase();
      const lowerModel = model.toLowerCase();
      if (lowerModel.startsWith(lowerMake)) {
        const trimmed = model.slice(make.length).trim();
        model = trimmed ? trimmed : null;
      }
    }

    if (!make && !model && exifData.camera) {
      const tokens = exifData.camera.trim().split(/\s+/);
      if (tokens.length > 1) {
        make = tokens[0];
        model = tokens.slice(1).join(' ');
      } else {
        model = exifData.camera;
      }
    }

    return { make: make || null, model: model || null };
  }

  private static buildCaptionLayout(
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number,
    availableWidth: number,
    ctx: CanvasRenderingContext2D
  ): CaptionLayout {
    // Check cache: same template id + scaleFactor + availableWidth + exif keys
    const cacheKey = JSON.stringify([
      template.id,
      scaleFactor,
      availableWidth,
      exifData,
    ]);
    if (captionLayoutCache?.key === cacheKey) {
      return captionLayoutCache.layout;
    }
    const measureCtx = ctx;
    const padding = template.style.padding * scaleFactor;
    const bodyFontSize = Math.max(12, template.style.fontSize * scaleFactor);
    const titleFontSize = Math.max(bodyFontSize * 1.7, bodyFontSize + 8);
    const titleLineHeight = titleFontSize * 1.15;
    const bodyLineHeight = bodyFontSize * 1.4;
    const paramsFontSize = Math.max(13, bodyFontSize * 1.15);
    const paramsLineHeight = paramsFontSize * 1.4;
    const makeFontSize = Math.max(12, bodyFontSize * 1.05);
    const makeLineHeight = makeFontSize * 1.2;
    const makeLetterSpacing = '0.18em';
    const metaFontSize = Math.max(11, bodyFontSize * 0.85);
    const metaLineHeight = metaFontSize * 1.3;
    const columnGap = Math.max(16, bodyFontSize * 1.25);
    const makeToTitleGap = makeFontSize * 0.55;
    const rightRowGap = bodyFontSize * 0.45;
    const textAreaWidth = Math.max(0, availableWidth - padding * 2);

    const leftColumnWidth = Math.max(
      0,
      Math.floor((textAreaWidth - columnGap) * 0.62)
    );
    const rightColumnWidth = Math.max(
      0,
      textAreaWidth - leftColumnWidth - columnGap
    );

    const { make, model } = this.getCaptionCameraParts(exifData);
    const makeText = make ? make.toUpperCase() : null;

    const titlePieces = [model, exifData.lens].filter(
      (value): value is string => !!value
    );
    const titleText =
      titlePieces.length > 0 ? titlePieces.join('  ') : makeText ? null : 'N/A';
    const titleWeight = 600;
    measureCtx.font = `${titleWeight} ${titleFontSize}px ${template.style.fontFamily}`;
    const titleLines = titleText
      ? this.wrapText(measureCtx, titleText, leftColumnWidth)
      : [];

    const apertureText = exifData.aperture
      ? exifData.aperture.replace(/^f\//i, 'ƒ/')
      : null;
    const paramsParts = [
      exifData.focalLength,
      apertureText,
      exifData.shutterSpeed,
      exifData.iso,
    ].filter((value): value is string => !!value);
    const paramsText =
      paramsParts.length > 0 ? paramsParts.join('  ·  ') : null;

    measureCtx.font = `${paramsFontSize}px ${template.style.fontFamily}`;
    const paramsLines = paramsText
      ? this.wrapText(measureCtx, paramsText, rightColumnWidth)
      : [];

    const dateText = exifData.dateTime
      ? exifData.dateTime.replace(/\//g, '.')
      : null;
    measureCtx.font = `${metaFontSize}px ${template.style.fontFamily}`;
    const dateLines = dateText
      ? this.wrapText(measureCtx, dateText, rightColumnWidth)
      : [];

    const locationText = exifData.location ?? null;
    const locationLines = locationText
      ? this.wrapText(measureCtx, locationText, rightColumnWidth)
      : [];

    const blockHeight = (
      lines: string[],
      fontSize: number,
      lineHeight: number
    ) => (lines.length === 0 ? 0 : fontSize + (lines.length - 1) * lineHeight);

    const makeBlockHeight = makeText ? makeFontSize : 0;
    const titleBlockHeight = blockHeight(
      titleLines,
      titleFontSize,
      titleLineHeight
    );
    const leftHeight =
      makeBlockHeight +
      (makeBlockHeight && titleBlockHeight ? makeToTitleGap : 0) +
      titleBlockHeight;

    const paramsBlockHeight = blockHeight(
      paramsLines,
      paramsFontSize,
      paramsLineHeight
    );
    const dateBlockHeight = blockHeight(
      dateLines,
      metaFontSize,
      metaLineHeight
    );
    const locationBlockHeight = blockHeight(
      locationLines,
      metaFontSize,
      metaLineHeight
    );
    const rightBlocks = [
      paramsBlockHeight,
      dateBlockHeight,
      locationBlockHeight,
    ].filter((h) => h > 0);
    const rightHeight =
      rightBlocks.reduce((sum, h) => sum + h, 0) +
      Math.max(0, rightBlocks.length - 1) * rightRowGap;

    const contentHeight = Math.max(leftHeight, rightHeight);

    const layout: CaptionLayout = {
      height: padding + contentHeight + padding,
      padding,
      bodyFontSize,
      bodyLineHeight,
      paramsFontSize,
      paramsLineHeight,
      titleFontSize,
      titleLineHeight,
      makeFontSize,
      makeLineHeight,
      makeLetterSpacing,
      metaFontSize,
      metaLineHeight,
      columnGap,
      leftColumnWidth,
      rightColumnWidth,
      contentHeight,
      makeToTitleGap,
      rightRowGap,
      makeText,
      titleLines,
      paramsLines,
      dateLines,
      locationLines,
    };
    captionLayoutCache = { key: cacheKey, layout };
    return layout;
  }

  private static drawCaptionTemplate(
    ctx: CanvasRenderingContext2D,
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number
  ): void {
    const { style, position } = template;

    const scaledBorderRadius = style.borderRadius * scaleFactor;
    const scaledX = position.x;
    const scaledY = position.y;
    const scaledWidth = position.width * scaleFactor;

    const layout = this.buildCaptionLayout(
      template,
      exifData,
      scaleFactor,
      scaledWidth,
      ctx
    );

    // Draw background
    ctx.globalAlpha = style.opacity;
    ctx.fillStyle = style.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      scaledX,
      scaledY,
      scaledWidth,
      layout.height,
      scaledBorderRadius
    );
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = style.textColor;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const leftX = scaledX + layout.padding;
    const rightEdgeX = scaledX + scaledWidth - layout.padding;
    const dividerX =
      leftX + layout.leftColumnWidth + Math.round(layout.columnGap / 2);
    const contentTop = scaledY + (layout.height - layout.contentHeight) / 2;

    ctx.save();
    ctx.textBaseline = 'alphabetic';

    // Hairline divider between columns
    if (layout.contentHeight > 0) {
      const lineWidth = Math.max(1, Math.round(scaleFactor));
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = style.textColor;
      ctx.fillRect(
        Math.round(dividerX - lineWidth / 2),
        contentTop,
        lineWidth,
        layout.contentHeight
      );
      ctx.restore();
    }

    // Left column: small-caps make + bold model, vertically centered
    const makeBlockHeight = layout.makeText ? layout.makeFontSize : 0;
    const titleBlockHeight =
      layout.titleLines.length > 0
        ? layout.titleFontSize +
          (layout.titleLines.length - 1) * layout.titleLineHeight
        : 0;
    const leftBlockHeight =
      makeBlockHeight +
      (makeBlockHeight && titleBlockHeight ? layout.makeToTitleGap : 0) +
      titleBlockHeight;
    let leftY = contentTop + (layout.contentHeight - leftBlockHeight) / 2;

    if (layout.makeText) {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = `${layout.makeFontSize}px ${style.fontFamily}`;
      ctx.letterSpacing = layout.makeLetterSpacing;
      ctx.fillText(layout.makeText, leftX, leftY + layout.makeFontSize);
      ctx.restore();
      leftY += layout.makeFontSize + layout.makeToTitleGap;
    }

    if (layout.titleLines.length > 0) {
      ctx.save();
      ctx.textAlign = 'left';
      const titleWeight = 600;
      ctx.font = `${titleWeight} ${layout.titleFontSize}px ${style.fontFamily}`;
      let cursorY = leftY + layout.titleFontSize;
      for (const line of layout.titleLines) {
        ctx.fillText(line, leftX, cursorY);
        cursorY += layout.titleLineHeight;
      }
      ctx.restore();
    }

    // Right column: params / date, right-aligned, vertically centered
    const rightBlocks: Array<{ height: number; draw: (top: number) => void }> =
      [];

    if (layout.paramsLines.length > 0) {
      rightBlocks.push({
        height:
          layout.paramsFontSize +
          (layout.paramsLines.length - 1) * layout.paramsLineHeight,
        draw: (top) => {
          ctx.save();
          ctx.textAlign = 'right';
          ctx.font = `${layout.paramsFontSize}px ${style.fontFamily}`;
          let cursorY = top + layout.paramsFontSize;
          for (const line of layout.paramsLines) {
            ctx.fillText(line, rightEdgeX, cursorY);
            cursorY += layout.paramsLineHeight;
          }
          ctx.restore();
        },
      });
    }

    if (layout.dateLines.length > 0) {
      rightBlocks.push({
        height:
          layout.metaFontSize +
          (layout.dateLines.length - 1) * layout.metaLineHeight,
        draw: (top) => {
          ctx.save();
          ctx.textAlign = 'right';
          ctx.globalAlpha = 0.6;
          ctx.font = `${layout.metaFontSize}px ${style.fontFamily}`;
          let cursorY = top + layout.metaFontSize;
          for (const line of layout.dateLines) {
            ctx.fillText(line, rightEdgeX, cursorY);
            cursorY += layout.metaLineHeight;
          }
          ctx.restore();
        },
      });
    }

    if (layout.locationLines.length > 0) {
      rightBlocks.push({
        height:
          layout.metaFontSize +
          (layout.locationLines.length - 1) * layout.metaLineHeight,
        draw: (top) => {
          ctx.save();
          ctx.textAlign = 'right';
          ctx.globalAlpha = 0.6;
          ctx.font = `${layout.metaFontSize}px ${style.fontFamily}`;
          let cursorY = top + layout.metaFontSize;
          for (const line of layout.locationLines) {
            ctx.fillText(line, rightEdgeX, cursorY);
            cursorY += layout.metaLineHeight;
          }
          ctx.restore();
        },
      });
    }

    if (rightBlocks.length > 0) {
      const totalRightHeight =
        rightBlocks.reduce((sum, b) => sum + b.height, 0) +
        (rightBlocks.length - 1) * layout.rightRowGap;
      let rightTop = contentTop + (layout.contentHeight - totalRightHeight) / 2;
      for (const block of rightBlocks) {
        block.draw(rightTop);
        rightTop += block.height + layout.rightRowGap;
      }
    }

    ctx.restore();
  }

  private static buildTechnicalLayout(
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number
  ): TechnicalLayout {
    const cacheKey = JSON.stringify(['technical', scaleFactor, exifData]);
    if (technicalLayoutCache?.key === cacheKey) {
      return technicalLayoutCache.layout;
    }

    const padding = template.style.padding * scaleFactor;
    const borderRadius = template.style.borderRadius * scaleFactor;
    const baseFontSize = Math.max(11, template.style.fontSize * scaleFactor);

    const makeFontSize = Math.max(11, baseFontSize * 0.85);
    const modelFontSize = Math.max(20, baseFontSize * 1.95);
    const makeToModelGap = makeFontSize * 0.55;
    const headerToDividerGap = baseFontSize * 1.4;
    const dividerThickness = Math.max(1, scaleFactor);
    const dividerToRowsGap = baseFontSize * 1.3;

    const iconRadius = Math.max(14, baseFontSize * 1.55);
    const iconStrokeWidth = Math.max(1, scaleFactor * 1.1);
    const iconToTextGap = Math.max(10, baseFontSize * 0.95);
    const rowLabelFontSize = Math.max(9, baseFontSize * 0.72);
    const rowValueFontSize = Math.max(13, baseFontSize * 1.05);
    const rowLabelToValueGap = rowValueFontSize * 0.18;
    const rowLabelOpacity = 0.65;
    const rowMinHeight = iconRadius * 2 + 4;
    const rowTextHeight =
      rowLabelFontSize + rowLabelToValueGap + rowValueFontSize;
    const rowHeight = Math.max(rowMinHeight, rowTextHeight);
    const rowGap = baseFontSize * 1.3;

    const { make, model } = this.getCaptionCameraParts(exifData);
    const makeText = make ? make.toUpperCase() : null;
    const modelText = model ?? null;

    const rows: TechnicalRow[] = [];
    if (exifData.lens) {
      rows.push({ kind: 'lens', label: 'Lens', value: exifData.lens });
    }
    if (exifData.focalLength) {
      rows.push({
        kind: 'focal',
        label: 'Focal',
        value: exifData.focalLength,
      });
    }
    if (exifData.aperture) {
      rows.push({
        kind: 'aperture',
        label: 'Aperture',
        value: exifData.aperture.replace(/^f\//i, 'ƒ/'),
      });
    }
    if (exifData.shutterSpeed) {
      rows.push({
        kind: 'shutter',
        label: 'Shutter',
        value: exifData.shutterSpeed,
      });
    }
    if (exifData.iso) {
      rows.push({ kind: 'iso', label: 'ISO', value: exifData.iso });
    }
    if (exifData.dateTime) {
      rows.push({ kind: 'date', label: 'Date', value: exifData.dateTime });
    }
    if (exifData.location) {
      rows.push({
        kind: 'location',
        label: 'Location',
        value: exifData.location,
      });
    }

    const layout: TechnicalLayout = {
      padding,
      borderRadius,
      makeText,
      modelText,
      makeFontSize,
      modelFontSize,
      makeToModelGap,
      headerToDividerGap,
      dividerThickness,
      dividerToRowsGap,
      rows,
      rowGap,
      rowHeight,
      iconRadius,
      iconStrokeWidth,
      iconToTextGap,
      rowLabelFontSize,
      rowValueFontSize,
      rowLabelToValueGap,
      rowLabelOpacity,
    };
    technicalLayoutCache = { key: cacheKey, layout };
    return layout;
  }

  private static buildTechnicalHorizontalLayout(
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number,
    panelWidth: number
  ): TechnicalHorizontalLayout {
    const cacheKey = JSON.stringify([
      'technical-horizontal',
      scaleFactor,
      panelWidth,
      exifData,
    ]);
    if (technicalHorizontalLayoutCache?.key === cacheKey) {
      return technicalHorizontalLayoutCache.layout;
    }

    const padding = template.style.padding * scaleFactor;
    const borderRadius = template.style.borderRadius * scaleFactor;
    const baseFontSize = Math.max(11, template.style.fontSize * scaleFactor);

    const makeFontSize = Math.max(11, baseFontSize * 0.85);
    const modelFontSize = Math.max(20, baseFontSize * 2.0);
    const makeToModelGap = makeFontSize * 0.45;
    const headerToDividerGap = baseFontSize * 0.95;
    const dividerThickness = Math.max(1, scaleFactor);
    const dividerToItemsGap = baseFontSize * 1.0;

    const iconRadius = Math.max(13, baseFontSize * 1.25);
    const iconStrokeWidth = Math.max(1, scaleFactor * 1.1);
    const iconToTextGap = Math.max(8, baseFontSize * 0.55);
    const itemLabelFontSize = Math.max(9, baseFontSize * 0.7);
    const itemValueFontSize = Math.max(12, baseFontSize * 0.98);
    const itemLabelToValueGap = itemValueFontSize * 0.18;
    const itemValueLineHeight = itemValueFontSize * 1.18;
    const itemColumnGap = Math.max(8, baseFontSize * 0.6);
    const itemLabelOpacity = 0.65;

    const { make, model } = this.getCaptionCameraParts(exifData);
    const makeText = make ? make.toUpperCase() : null;
    const modelText = model ?? null;

    const rows: TechnicalRow[] = [];
    if (exifData.lens) {
      rows.push({ kind: 'lens', label: 'Lens', value: exifData.lens });
    }
    if (exifData.focalLength) {
      rows.push({
        kind: 'focal',
        label: 'Focal',
        value: exifData.focalLength,
      });
    }
    if (exifData.aperture) {
      rows.push({
        kind: 'aperture',
        label: 'Aperture',
        value: exifData.aperture.replace(/^f\//i, 'ƒ/'),
      });
    }
    if (exifData.shutterSpeed) {
      rows.push({
        kind: 'shutter',
        label: 'Shutter',
        value: exifData.shutterSpeed,
      });
    }
    if (exifData.iso) {
      rows.push({ kind: 'iso', label: 'ISO', value: exifData.iso });
    }
    if (exifData.dateTime) {
      rows.push({ kind: 'date', label: 'Date', value: exifData.dateTime });
    }
    if (exifData.location) {
      rows.push({
        kind: 'location',
        label: 'Location',
        value: exifData.location,
      });
    }

    const innerWidth = Math.max(0, panelWidth - padding * 2);
    // Wrap to a 2-row grid once we exceed 4 items so each cell stays wide
    // enough for values like the date and location to render without being
    // truncated on narrow (portrait) panels.
    const gridRows = rows.length > 4 ? 2 : 1;
    const gridCols = Math.max(1, Math.ceil(rows.length / gridRows));
    const itemRowGap = baseFontSize * 0.85;
    const totalGapWidth = (gridCols - 1) * itemColumnGap;
    const itemColumnWidth = Math.max(
      0,
      (innerWidth - totalGapWidth) / gridCols
    );

    const valueMaxWidth = Math.max(
      0,
      itemColumnWidth - iconRadius * 2 - iconToTextGap
    );

    const measureCtx = getMeasureContext();
    const itemValueLines: string[][] = [];
    let itemValueMaxLines = 1;

    for (const row of rows) {
      let lines: string[] = [row.value];
      if (measureCtx) {
        measureCtx.font = `500 ${itemValueFontSize}px ${template.style.fontFamily}`;
        const wrapped = this.wrapText(measureCtx, row.value, valueMaxWidth);
        // Collapse to at most 2 lines; the merged tail will be ellipsized at draw
        lines =
          wrapped.length <= 2
            ? wrapped
            : [wrapped[0], wrapped.slice(1).join(' ')];
      }
      itemValueLines.push(lines);
      itemValueMaxLines = Math.max(itemValueMaxLines, lines.length);
    }

    const valueBlockHeight =
      itemValueFontSize +
      Math.max(0, itemValueMaxLines - 1) * itemValueLineHeight;
    const textBlockHeight =
      itemLabelFontSize + itemLabelToValueGap + valueBlockHeight;
    const iconHeight = iconRadius * 2;
    const itemRowHeight = Math.max(textBlockHeight, iconHeight);

    const headerHeight =
      (makeText ? makeFontSize : 0) +
      (makeText && modelText ? makeToModelGap : 0) +
      (modelText ? modelFontSize : 0);

    const dividerSpace =
      headerHeight && rows.length
        ? headerToDividerGap + dividerThickness + dividerToItemsGap
        : 0;

    const itemsTotalHeight = rows.length
      ? gridRows * itemRowHeight + (gridRows - 1) * itemRowGap
      : 0;
    const contentHeight = headerHeight + dividerSpace + itemsTotalHeight;
    const totalHeight = padding * 2 + contentHeight;

    const layout: TechnicalHorizontalLayout = {
      width: panelWidth,
      height: totalHeight,
      padding,
      borderRadius,
      makeText,
      modelText,
      makeFontSize,
      modelFontSize,
      makeToModelGap,
      headerHeight,
      headerToDividerGap,
      dividerThickness,
      dividerToItemsGap,
      rows,
      gridRows,
      gridCols,
      itemColumnGap,
      itemColumnWidth,
      itemRowHeight,
      itemRowGap,
      iconRadius,
      iconStrokeWidth,
      iconToTextGap,
      itemLabelFontSize,
      itemValueFontSize,
      itemLabelToValueGap,
      itemValueLineHeight,
      itemValueLines,
      itemValueMaxLines,
      itemLabelOpacity,
    };
    technicalHorizontalLayoutCache = { key: cacheKey, layout };
    return layout;
  }

  private static drawTechnicalHorizontalTemplate(
    ctx: CanvasRenderingContext2D,
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number
  ): void {
    const { style, position } = template;
    const panelX = position.x;
    const panelY = position.y;
    const panelW = position.width * scaleFactor;
    const panelH = position.height * scaleFactor;

    const layout = this.buildTechnicalHorizontalLayout(
      template,
      exifData,
      scaleFactor,
      panelW
    );

    this.drawFrostedPanel(
      ctx,
      panelX,
      panelY,
      panelW,
      panelH,
      layout.borderRadius,
      scaleFactor,
      style.backgroundColor
    );

    const innerLeft = panelX + layout.padding;
    const innerTop = panelY + layout.padding;
    const innerRight = panelX + panelW - layout.padding;
    let cursorY = innerTop;

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    if (layout.makeText) {
      ctx.save();
      ctx.font = `${layout.makeFontSize}px ${style.fontFamily}`;
      ctx.globalAlpha = 0.85;
      ctx.letterSpacing = '0.16em';
      ctx.fillText(layout.makeText, innerLeft, cursorY + layout.makeFontSize);
      ctx.restore();
      cursorY +=
        layout.makeFontSize + (layout.modelText ? layout.makeToModelGap : 0);
    }

    if (layout.modelText) {
      ctx.save();
      ctx.font = `500 ${layout.modelFontSize}px ${style.fontFamily}`;
      ctx.globalAlpha = 1;
      this.fillTextEllipsis(
        ctx,
        layout.modelText,
        innerLeft,
        cursorY + layout.modelFontSize,
        Math.max(0, panelW - layout.padding * 2)
      );
      ctx.restore();
      cursorY += layout.modelFontSize;
    }

    if (layout.headerHeight && layout.rows.length) {
      cursorY += layout.headerToDividerGap;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(
        innerLeft,
        cursorY,
        Math.max(0, innerRight - innerLeft),
        layout.dividerThickness
      );
      ctx.restore();
      cursorY += layout.dividerThickness + layout.dividerToItemsGap;
    }

    if (layout.rows.length === 0) {
      ctx.restore();
      return;
    }

    const itemRowTop = cursorY;
    const labelMaxWidth = Math.max(
      0,
      layout.itemColumnWidth - layout.iconRadius * 2 - layout.iconToTextGap
    );

    for (let i = 0; i < layout.rows.length; i++) {
      const row = layout.rows[i];
      const col = i % layout.gridCols;
      const gridRow = Math.floor(i / layout.gridCols);
      const cellX =
        innerLeft + col * (layout.itemColumnWidth + layout.itemColumnGap);
      const cellTop =
        itemRowTop + gridRow * (layout.itemRowHeight + layout.itemRowGap);
      const iconCx = cellX + layout.iconRadius;
      const iconCy = cellTop + layout.itemRowHeight / 2;

      this.drawTechnicalIcon(
        ctx,
        row.kind,
        iconCx,
        iconCy,
        layout.iconRadius,
        layout.iconStrokeWidth,
        style.fontFamily
      );

      const valueLines = layout.itemValueLines[i] ?? [row.value];
      const valueBlockHeight =
        layout.itemValueFontSize +
        Math.max(0, valueLines.length - 1) * layout.itemValueLineHeight;
      const textBlockHeight =
        layout.itemLabelFontSize +
        layout.itemLabelToValueGap +
        valueBlockHeight;
      const textTop = cellTop + (layout.itemRowHeight - textBlockHeight) / 2;
      const textX = cellX + layout.iconRadius * 2 + layout.iconToTextGap;

      ctx.save();
      ctx.font = `${layout.itemLabelFontSize}px ${style.fontFamily}`;
      ctx.globalAlpha = layout.itemLabelOpacity;
      this.fillTextEllipsis(
        ctx,
        row.label,
        textX,
        textTop + layout.itemLabelFontSize,
        labelMaxWidth
      );
      ctx.restore();

      ctx.save();
      ctx.font = `500 ${layout.itemValueFontSize}px ${style.fontFamily}`;
      ctx.globalAlpha = 1;
      let valueY =
        textTop +
        layout.itemLabelFontSize +
        layout.itemLabelToValueGap +
        layout.itemValueFontSize;
      for (const line of valueLines) {
        this.fillTextEllipsis(ctx, line, textX, valueY, labelMaxWidth);
        valueY += layout.itemValueLineHeight;
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private static drawFrostedPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    scaleFactor: number,
    backgroundColor: string
  ): void {
    const dpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const canCreateOffscreen =
      typeof document !== 'undefined' && w > 0 && h > 0;

    let blurredFilled = false;
    if (canCreateOffscreen) {
      const off = document.createElement('canvas');
      off.width = Math.max(1, Math.ceil(w * dpr));
      off.height = Math.max(1, Math.ceil(h * dpr));
      const offCtx = off.getContext('2d');
      if (offCtx) {
        offCtx.scale(dpr, dpr);
        offCtx.imageSmoothingEnabled = true;
        offCtx.imageSmoothingQuality = 'high';
        const blurAmount = Math.max(8, 22 * scaleFactor);
        offCtx.filter = `blur(${blurAmount}px)`;
        // Sample the already-drawn image region behind the panel
        offCtx.drawImage(
          ctx.canvas,
          x * dpr,
          y * dpr,
          w * dpr,
          h * dpr,
          0,
          0,
          w,
          h
        );

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.clip();
        ctx.drawImage(off, x, y, w, h);
        // Glass tint on top of blurred backdrop
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
        blurredFilled = true;
      }
    }

    if (!blurredFilled) {
      // Fallback when blur unavailable: solid translucent panel
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      ctx.restore();
    }

    // Hairline border for crisp edge
    ctx.save();
    ctx.beginPath();
    const inset = Math.max(0.5, scaleFactor * 0.5);
    ctx.roundRect(
      x + inset,
      y + inset,
      Math.max(0, w - inset * 2),
      Math.max(0, h - inset * 2),
      Math.max(0, radius - inset)
    );
    ctx.lineWidth = Math.max(1, scaleFactor);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.stroke();
    ctx.restore();
  }

  private static drawTechnicalIcon(
    ctx: CanvasRenderingContext2D,
    kind: TechnicalIconKind,
    cx: number,
    cy: number,
    r: number,
    lineWidth: number,
    fontFamily: string
  ): void {
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer ring shared by all icons
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    switch (kind) {
      case 'lens': {
        // Front lens element: nested rings + center dot
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, r * 0.12), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'focal': {
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, r * 0.16), 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI / 2) * i;
          ctx.beginPath();
          ctx.moveTo(
            cx + Math.cos(angle) * r * 0.5,
            cy + Math.sin(angle) * r * 0.5
          );
          ctx.lineTo(
            cx + Math.cos(angle) * r * 0.72,
            cy + Math.sin(angle) * r * 0.72
          );
          ctx.stroke();
        }
        break;
      }
      case 'aperture': {
        const blades = 6;
        const innerR = r * 0.62;
        ctx.beginPath();
        for (let i = 0; i < blades; i++) {
          const a = (Math.PI * 2 * i) / blades - Math.PI / 2;
          const x = cx + Math.cos(a) * innerR;
          const y = cy + Math.sin(a) * innerR;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        for (let i = 0; i < blades; i++) {
          const a = (Math.PI * 2 * i) / blades - Math.PI / 2 + Math.PI / blades;
          ctx.beginPath();
          ctx.moveTo(
            cx + Math.cos(a) * innerR * 0.05,
            cy + Math.sin(a) * innerR * 0.05
          );
          ctx.lineTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
          ctx.stroke();
        }
        break;
      }
      case 'shutter': {
        // Hand at ~10 o'clock
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(-Math.PI * 0.7) * r * 0.55,
          cy + Math.sin(-Math.PI * 0.7) * r * 0.55
        );
        ctx.stroke();
        // Top tick mark
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx, cy - r * 0.72);
        ctx.stroke();
        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, r * 0.08), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'iso': {
        const fontSize = Math.max(8, Math.round(r * 0.6));
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ISO', cx, cy + r * 0.04);
        break;
      }
      case 'date': {
        const w = r * 1.25;
        const h = r * 1.15;
        const x = cx - w / 2;
        const y = cy - h / 2 + r * 0.08;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r * 0.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + r * 0.08, y + h * 0.32);
        ctx.lineTo(x + w - r * 0.08, y + h * 0.32);
        ctx.stroke();
        const tabH = r * 0.22;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.28, y - tabH * 0.8);
        ctx.lineTo(x + w * 0.28, y + tabH * 0.4);
        ctx.moveTo(x + w * 0.72, y - tabH * 0.8);
        ctx.lineTo(x + w * 0.72, y + tabH * 0.4);
        ctx.stroke();
        break;
      }
      case 'location': {
        // Map pin: circular head joined to a downward tip via tangent lines.
        const headR = r * 0.42;
        const headCy = cy - r * 0.2;
        const tipY = cy + r * 0.7;
        const dy = tipY - headCy;
        // Tangent points from external tip to head circle (symmetric about cx).
        const ty = (headR * headR) / dy;
        const tx = Math.sqrt(Math.max(0, headR * headR - ty * ty));
        const angRight = Math.atan2(ty, tx);
        const angLeft = Math.atan2(ty, -tx);
        ctx.beginPath();
        // Major arc of head circle from right tangent over the top to left tangent.
        ctx.arc(cx, headCy, headR, angRight, angLeft, true);
        ctx.lineTo(cx, tipY);
        ctx.closePath();
        ctx.stroke();
        // Inner dot
        ctx.beginPath();
        ctx.arc(cx, headCy, Math.max(1, headR * 0.38), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  private static fillTextEllipsis(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number
  ): void {
    if (maxWidth <= 0) return;
    if (ctx.measureText(text).width <= maxWidth) {
      ctx.fillText(text, x, y);
      return;
    }
    const ellipsis = '…';
    let truncated = text;
    while (
      truncated.length > 0 &&
      ctx.measureText(truncated + ellipsis).width > maxWidth
    ) {
      truncated = truncated.slice(0, -1);
    }
    ctx.fillText(truncated + ellipsis, x, y);
  }

  private static drawTechnicalTemplate(
    ctx: CanvasRenderingContext2D,
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number
  ): void {
    const { style, position } = template;
    const panelX = position.x;
    const panelY = position.y;
    const panelW = position.width * scaleFactor;
    const panelH = position.height * scaleFactor;

    const layout = this.buildTechnicalLayout(template, exifData, scaleFactor);

    this.drawFrostedPanel(
      ctx,
      panelX,
      panelY,
      panelW,
      panelH,
      layout.borderRadius,
      scaleFactor,
      style.backgroundColor
    );

    const headerHeight =
      (layout.makeText ? layout.makeFontSize : 0) +
      (layout.makeText && layout.modelText ? layout.makeToModelGap : 0) +
      (layout.modelText ? layout.modelFontSize : 0);

    const rowsTotalHeight =
      layout.rows.length > 0
        ? layout.rowHeight * layout.rows.length +
          layout.rowGap * (layout.rows.length - 1)
        : 0;

    const dividerSpace =
      headerHeight && rowsTotalHeight
        ? layout.headerToDividerGap +
          layout.dividerThickness +
          layout.dividerToRowsGap
        : 0;

    const contentHeight = headerHeight + dividerSpace + rowsTotalHeight;

    const innerLeft = panelX + layout.padding;
    const innerTop = panelY + layout.padding;
    const innerBottom = panelY + panelH - layout.padding;
    const innerHeight = Math.max(0, innerBottom - innerTop);
    let cursorY = innerTop + Math.max(0, (innerHeight - contentHeight) / 2);

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // Header: make (small caps tracked) + model (large)
    if (layout.makeText) {
      ctx.save();
      ctx.font = `${layout.makeFontSize}px ${style.fontFamily}`;
      ctx.globalAlpha = 0.85;
      ctx.letterSpacing = '0.16em';
      ctx.fillText(layout.makeText, innerLeft, cursorY + layout.makeFontSize);
      ctx.restore();
      cursorY +=
        layout.makeFontSize + (layout.modelText ? layout.makeToModelGap : 0);
    }

    if (layout.modelText) {
      ctx.save();
      ctx.font = `500 ${layout.modelFontSize}px ${style.fontFamily}`;
      ctx.globalAlpha = 1;
      this.fillTextEllipsis(
        ctx,
        layout.modelText,
        innerLeft,
        cursorY + layout.modelFontSize,
        panelW - layout.padding * 2
      );
      ctx.restore();
      cursorY += layout.modelFontSize;
    }

    // Divider
    if (headerHeight && rowsTotalHeight) {
      cursorY += layout.headerToDividerGap;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(
        innerLeft,
        cursorY,
        Math.max(0, panelW - layout.padding * 2),
        layout.dividerThickness
      );
      ctx.restore();
      cursorY += layout.dividerThickness + layout.dividerToRowsGap;
    }

    // Rows
    const valueMaxWidth = Math.max(
      0,
      panelW - layout.padding * 2 - layout.iconRadius * 2 - layout.iconToTextGap
    );

    for (let i = 0; i < layout.rows.length; i++) {
      const row = layout.rows[i];
      const rowTop = cursorY;
      const iconCx = innerLeft + layout.iconRadius;
      const iconCy = rowTop + layout.rowHeight / 2;

      this.drawTechnicalIcon(
        ctx,
        row.kind,
        iconCx,
        iconCy,
        layout.iconRadius,
        layout.iconStrokeWidth,
        style.fontFamily
      );

      const textX = innerLeft + layout.iconRadius * 2 + layout.iconToTextGap;
      const textBlockHeight =
        layout.rowLabelFontSize +
        layout.rowLabelToValueGap +
        layout.rowValueFontSize;
      const textTop = rowTop + (layout.rowHeight - textBlockHeight) / 2;

      ctx.save();
      ctx.font = `${layout.rowLabelFontSize}px ${style.fontFamily}`;
      ctx.globalAlpha = layout.rowLabelOpacity;
      ctx.fillText(row.label, textX, textTop + layout.rowLabelFontSize);
      ctx.restore();

      ctx.save();
      ctx.font = `500 ${layout.rowValueFontSize}px ${style.fontFamily}`;
      ctx.globalAlpha = 1;
      const valueY =
        textTop +
        layout.rowLabelFontSize +
        layout.rowLabelToValueGap +
        layout.rowValueFontSize;
      this.fillTextEllipsis(ctx, row.value, textX, valueY, valueMaxWidth);
      ctx.restore();

      cursorY += layout.rowHeight;
      if (i < layout.rows.length - 1) cursorY += layout.rowGap;
    }

    ctx.restore();
  }

  private static buildCompactLayout(
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number
  ): CompactLayout {
    const cacheKey = JSON.stringify([
      'compact',
      scaleFactor,
      exifData,
      template.position.width,
    ]);
    if (compactLayoutCache?.key === cacheKey) {
      return compactLayoutCache.layout;
    }

    const padding = template.style.padding * scaleFactor;
    const borderRadius = template.style.borderRadius * scaleFactor;
    const baseFontSize = Math.max(11, template.style.fontSize * scaleFactor);

    const labelFontSize = Math.max(9, baseFontSize * 0.78);
    const valueFontSize = Math.max(12, baseFontSize * 1.05);
    const labelToValueGap = valueFontSize * 0.45;
    const iconSize = Math.max(11, labelFontSize * 1.25);
    const iconStrokeWidth = Math.max(1, scaleFactor);
    const iconToLabelGap = labelFontSize * 0.55;
    const columnGap = baseFontSize * 1.7;
    const rowGap = baseFontSize * 1.4;

    const rowHeight = labelFontSize + labelToValueGap + valueFontSize;
    const panelW = template.position.width * scaleFactor;
    const innerWidth = Math.max(0, panelW - padding * 2);
    const cellWidth = Math.max(0, (innerWidth - columnGap) / 2);
    const fullRowWidth = innerWidth;
    const locationValue = exifData.location ?? null;
    const panelHeight =
      padding * 2 +
      rowHeight * 2 +
      rowGap +
      (locationValue ? rowHeight + rowGap : 0);

    const cameraValue = exifData.camera ?? '—';
    const lensValue = exifData.lens ?? '—';

    const settingsParts: string[] = [];
    if (exifData.focalLength) settingsParts.push(exifData.focalLength);
    if (exifData.aperture) {
      settingsParts.push(exifData.aperture.replace(/^f\//i, 'f'));
    }
    if (exifData.shutterSpeed) settingsParts.push(exifData.shutterSpeed);
    if (exifData.iso) {
      // Normalize "ISO 100" -> "ISO100" for the compact one-liner
      settingsParts.push(exifData.iso.replace(/^ISO\s+/i, 'ISO'));
    }
    const settingsValue = settingsParts.length
      ? settingsParts.join(' / ')
      : '—';

    const dateValue = exifData.dateTime ?? '—';

    const layout: CompactLayout = {
      panelHeight,
      padding,
      borderRadius,
      cellWidth,
      fullRowWidth,
      columnGap,
      rowGap,
      rowHeight,
      labelFontSize,
      valueFontSize,
      labelToValueGap,
      iconSize,
      iconStrokeWidth,
      iconToLabelGap,
      cameraValue,
      lensValue,
      settingsValue,
      dateValue,
      locationValue,
    };
    compactLayoutCache = { key: cacheKey, layout };
    return layout;
  }

  private static drawCompactIcon(
    ctx: CanvasRenderingContext2D,
    kind: CompactIconKind,
    cx: number,
    cy: number,
    size: number,
    lineWidth: number
  ): void {
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (kind) {
      case 'camera': {
        const w = size * 1.15;
        const h = size * 0.78;
        const x = cx - w / 2;
        const y = cy - h / 2 + size * 0.04;
        // Body
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, size * 0.12);
        ctx.stroke();
        // Top viewfinder bump
        const bumpW = w * 0.32;
        const bumpH = size * 0.13;
        const bumpX = x + (w - bumpW) / 2;
        ctx.beginPath();
        ctx.moveTo(bumpX, y);
        ctx.lineTo(bumpX, y - bumpH);
        ctx.lineTo(bumpX + bumpW, y - bumpH);
        ctx.lineTo(bumpX + bumpW, y);
        ctx.stroke();
        // Lens circle
        ctx.beginPath();
        ctx.arc(cx, cy + size * 0.09, size * 0.22, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'lens-aperture': {
        const r = size * 0.5;
        const blades = 6;
        ctx.beginPath();
        for (let i = 0; i < blades; i++) {
          const a = (Math.PI * 2 * i) / blades - Math.PI / 2;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        for (let i = 0; i < blades; i++) {
          const a = (Math.PI * 2 * i) / blades - Math.PI / 2 + Math.PI / blades;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          ctx.stroke();
        }
        break;
      }
      case 'location': {
        // Map pin: matches the Glass template pin, scaled to compact size.
        const headR = size * 0.21;
        const headCy = cy - size * 0.1;
        const tipY = cy + size * 0.35;
        const dy = tipY - headCy;
        const ty = (headR * headR) / dy;
        const tx = Math.sqrt(Math.max(0, headR * headR - ty * ty));
        const angRight = Math.atan2(ty, tx);
        const angLeft = Math.atan2(ty, -tx);
        ctx.beginPath();
        ctx.arc(cx, headCy, headR, angRight, angLeft, true);
        ctx.lineTo(cx, tipY);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, headCy, Math.max(1, headR * 0.38), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  private static drawCompactCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    iconKind: CompactIconKind | null,
    layout: CompactLayout,
    fontFamily: string
  ): void {
    let labelStartX = x;
    if (iconKind) {
      const iconCx = x + layout.iconSize / 2;
      const iconCy = y + layout.labelFontSize * 0.55;
      this.drawCompactIcon(
        ctx,
        iconKind,
        iconCx,
        iconCy,
        layout.iconSize,
        layout.iconStrokeWidth
      );
      labelStartX = x + layout.iconSize + layout.iconToLabelGap;
    }

    // Label (small caps style with letter spacing, dim)
    ctx.save();
    ctx.font = `${layout.labelFontSize}px ${fontFamily}`;
    ctx.globalAlpha = 0.55;
    ctx.letterSpacing = '0.16em';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    const labelMaxWidth = Math.max(0, x + width - labelStartX);
    this.fillTextEllipsis(
      ctx,
      label,
      labelStartX,
      y + layout.labelFontSize,
      labelMaxWidth
    );
    ctx.restore();

    // Value (medium weight, full white)
    ctx.save();
    ctx.font = `500 ${layout.valueFontSize}px ${fontFamily}`;
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    const valueY =
      y + layout.labelFontSize + layout.labelToValueGap + layout.valueFontSize;
    this.fillTextEllipsis(ctx, value, x, valueY, width);
    ctx.restore();
  }

  private static drawCompactTemplate(
    ctx: CanvasRenderingContext2D,
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number
  ): void {
    const { style, position } = template;
    const panelX = position.x;
    const panelY = position.y;
    const panelW = position.width * scaleFactor;
    const panelH = position.height * scaleFactor;

    const layout = this.buildCompactLayout(template, exifData, scaleFactor);

    this.drawFrostedPanel(
      ctx,
      panelX,
      panelY,
      panelW,
      panelH,
      layout.borderRadius,
      scaleFactor,
      style.backgroundColor
    );

    const innerLeft = panelX + layout.padding;
    const innerTop = panelY + layout.padding;
    const col1X = innerLeft;
    const col2X = innerLeft + layout.cellWidth + layout.columnGap;
    const row1Y = innerTop;
    const row2Y = innerTop + layout.rowHeight + layout.rowGap;

    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff';

    this.drawCompactCell(
      ctx,
      col1X,
      row1Y,
      layout.cellWidth,
      'CAMERA',
      layout.cameraValue,
      'camera',
      layout,
      style.fontFamily
    );
    this.drawCompactCell(
      ctx,
      col2X,
      row1Y,
      layout.cellWidth,
      'LENS',
      layout.lensValue,
      'lens-aperture',
      layout,
      style.fontFamily
    );
    this.drawCompactCell(
      ctx,
      col1X,
      row2Y,
      layout.cellWidth,
      'SETTINGS',
      layout.settingsValue,
      null,
      layout,
      style.fontFamily
    );
    this.drawCompactCell(
      ctx,
      col2X,
      row2Y,
      layout.cellWidth,
      'DATE',
      layout.dateValue,
      null,
      layout,
      style.fontFamily
    );

    if (layout.locationValue) {
      const row3Y = row2Y + layout.rowHeight + layout.rowGap;
      this.drawCompactCell(
        ctx,
        col1X,
        row3Y,
        layout.fullRowWidth,
        'LOCATION',
        layout.locationValue,
        'location',
        layout,
        style.fontFamily
      );
    }

    ctx.restore();
  }

  private static buildImprintLayout(
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number
  ): ImprintLayout {
    const cacheKey = JSON.stringify(['imprint', scaleFactor, exifData]);
    if (imprintLayoutCache?.key === cacheKey) {
      return imprintLayoutCache.layout;
    }

    const padding = template.style.padding * scaleFactor;
    const baseFontSize = Math.max(12, template.style.fontSize * scaleFactor);

    const headlineFontSize = Math.max(18, baseFontSize * 1.5);
    const headlineHeight = headlineFontSize;
    const headlineGap = headlineFontSize * 0.3;
    const makeLetterSpacing = '0.04em';

    const paramsFontSize = Math.max(11, baseFontSize * 0.95);
    const locationFontSize = Math.max(11, baseFontSize * 0.82);
    const rowGap = baseFontSize * 0.5;

    const { make, model } = this.getCaptionCameraParts(exifData);
    const makeText = make ? make.toUpperCase() : null;
    const modelText = model;

    const apertureText = exifData.aperture
      ? exifData.aperture.replace(/^f\//i, 'ƒ/')
      : null;
    const dateText = exifData.dateTime
      ? exifData.dateTime.replace(/\//g, '.')
      : null;
    const paramsParts = [
      dateText,
      apertureText,
      exifData.shutterSpeed,
      exifData.iso,
      exifData.focalLength,
    ].filter((value): value is string => !!value);
    const paramsText = paramsParts.length > 0 ? paramsParts.join(' · ') : null;

    const locationText = exifData.location ?? null;

    const blocks: number[] = [];
    if (makeText || modelText) blocks.push(headlineHeight);
    if (paramsText) blocks.push(paramsFontSize);
    if (locationText) blocks.push(locationFontSize);
    const contentHeight =
      blocks.reduce((sum, h) => sum + h, 0) +
      Math.max(0, blocks.length - 1) * rowGap;

    const layout: ImprintLayout = {
      padding,
      height: padding + contentHeight + padding,
      contentHeight,
      rowGap,
      baseFontSize,
      makeText,
      modelText,
      headlineFontSize,
      headlineWeightMake: 600,
      headlineWeightModel: 400,
      headlineGap,
      headlineHeight,
      makeLetterSpacing,
      paramsText,
      paramsFontSize,
      paramsOpacity: 0.92,
      locationText,
      locationFontSize,
      locationOpacity: 0.78,
    };
    imprintLayoutCache = { key: cacheKey, layout };
    return layout;
  }

  private static drawImprintTemplate(
    ctx: CanvasRenderingContext2D,
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number,
    overlayPosition?: PositionPreset
  ): void {
    const { style, position } = template;
    const scaledX = position.x;
    const scaledY = position.y;
    const scaledWidth = position.width * scaleFactor;

    const layout = this.buildImprintLayout(template, exifData, scaleFactor);

    const isRight =
      overlayPosition === 'top-right' || overlayPosition === 'bottom-right';
    const textAlign: CanvasTextAlign = isRight ? 'right' : 'left';
    const anchorX = isRight
      ? scaledX + scaledWidth - layout.padding
      : scaledX + layout.padding;

    // Shadow that contrasts with text color so the text reads on bright or dark photos.
    const isLight = this.isLightTextColor(style.textColor);
    const shadowColor = isLight
      ? 'rgba(0, 0, 0, 0.7)'
      : 'rgba(255, 255, 255, 0.75)';

    ctx.save();
    ctx.fillStyle = style.textColor;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = textAlign;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = Math.max(4, 6 * scaleFactor);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    let cursorY = scaledY + layout.padding;

    if (layout.makeText || layout.modelText) {
      const baselineY = cursorY + layout.headlineHeight;
      const makePart = layout.makeText ?? '';
      const modelPart = layout.modelText ?? '';
      const makeFont = `${layout.headlineWeightMake} ${layout.headlineFontSize}px ${style.fontFamily}`;
      const modelFont = `${layout.headlineWeightModel} ${layout.headlineFontSize}px ${style.fontFamily}`;

      const measureWidth = (
        text: string,
        font: string,
        letterSpacing?: string
      ): number => {
        ctx.save();
        ctx.font = font;
        if (letterSpacing) {
          (
            ctx as CanvasRenderingContext2D & { letterSpacing?: string }
          ).letterSpacing = letterSpacing;
        }
        const width = ctx.measureText(text).width;
        ctx.restore();
        return width;
      };

      if (textAlign === 'left') {
        let x = anchorX;
        if (makePart) {
          ctx.save();
          ctx.font = makeFont;
          (
            ctx as CanvasRenderingContext2D & { letterSpacing?: string }
          ).letterSpacing = layout.makeLetterSpacing;
          ctx.fillText(makePart, x, baselineY);
          ctx.restore();
          const makeWidth = measureWidth(
            makePart,
            makeFont,
            layout.makeLetterSpacing
          );
          x += makeWidth + (modelPart ? layout.headlineGap : 0);
        }
        if (modelPart) {
          ctx.save();
          ctx.font = modelFont;
          ctx.fillText(modelPart, x, baselineY);
          ctx.restore();
        }
      } else {
        let x = anchorX;
        if (modelPart) {
          ctx.save();
          ctx.font = modelFont;
          ctx.fillText(modelPart, x, baselineY);
          ctx.restore();
          const modelWidth = measureWidth(modelPart, modelFont);
          x -= modelWidth + (makePart ? layout.headlineGap : 0);
        }
        if (makePart) {
          ctx.save();
          ctx.font = makeFont;
          (
            ctx as CanvasRenderingContext2D & { letterSpacing?: string }
          ).letterSpacing = layout.makeLetterSpacing;
          ctx.fillText(makePart, x, baselineY);
          ctx.restore();
        }
      }

      cursorY += layout.headlineHeight + layout.rowGap;
    }

    if (layout.paramsText) {
      const baselineY = cursorY + layout.paramsFontSize;
      ctx.save();
      ctx.globalAlpha = layout.paramsOpacity;
      ctx.font = `${layout.paramsFontSize}px ${style.fontFamily}`;
      ctx.fillText(layout.paramsText, anchorX, baselineY);
      ctx.restore();
      cursorY += layout.paramsFontSize + layout.rowGap;
    }

    if (layout.locationText) {
      const baselineY = cursorY + layout.locationFontSize;
      ctx.save();
      ctx.globalAlpha = layout.locationOpacity;
      ctx.font = `${layout.locationFontSize}px ${style.fontFamily}`;
      ctx.fillText(layout.locationText, anchorX, baselineY);
      ctx.restore();
    }

    ctx.restore();
  }

  // Heuristic: treat #fff/white as "light", everything else as dark.
  // Used to pick a contrasting drop shadow for the imprint text.
  private static isLightTextColor(color: string): boolean {
    const trimmed = color.trim().toLowerCase();
    if (trimmed === '#ffffff' || trimmed === '#fff' || trimmed === 'white') {
      return true;
    }
    const hex = trimmed.match(/^#([0-9a-f]{6})$/);
    if (hex) {
      const value = parseInt(hex[1], 16);
      const r = (value >> 16) & 0xff;
      const g = (value >> 8) & 0xff;
      const b = value & 0xff;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6;
    }
    return false;
  }

  private static drawTemplate(
    ctx: CanvasRenderingContext2D,
    template: Template,
    exifData: NormalizedExifData,
    scaleFactor: number = 1,
    options?: {
      imageIsPortrait?: boolean;
      overlayPosition?: PositionPreset;
    }
  ): void {
    const { style, position } = template;

    if (template.customDraw === 'caption') {
      this.drawCaptionTemplate(ctx, template, exifData, scaleFactor);
      return;
    }

    if (template.customDraw === 'technical') {
      if (isTechnicalHorizontalPosition(options?.overlayPosition)) {
        this.drawTechnicalHorizontalTemplate(
          ctx,
          template,
          exifData,
          scaleFactor
        );
      } else {
        this.drawTechnicalTemplate(ctx, template, exifData, scaleFactor);
      }
      return;
    }

    if (template.customDraw === 'compact') {
      this.drawCompactTemplate(ctx, template, exifData, scaleFactor);
      return;
    }

    if (template.customDraw === 'imprint') {
      this.drawImprintTemplate(
        ctx,
        template,
        exifData,
        scaleFactor,
        options?.overlayPosition
      );
      return;
    }

    const { fields } = template;

    // Scale dimensions (positions are already calculated as absolute values in calculateDynamicPosition)
    const scaledFontSize = Math.max(12, style.fontSize * scaleFactor);
    const scaledPadding = style.padding * scaleFactor;
    const scaledBorderRadius = style.borderRadius * scaleFactor;
    const scaledX = position.x;
    const scaledY = position.y;
    const scaledWidth = position.width * scaleFactor;

    // Calculate line height
    const lineHeight = scaledFontSize * 1.4;

    // Set up text rendering first to measure text
    ctx.font = `${scaledFontSize}px ${style.fontFamily}`;
    ctx.textAlign = position.alignment as CanvasTextAlign;

    // Calculate available width for text wrapping
    const maxTextWidth = scaledWidth - scaledPadding * 2;

    // Filter visible fields and prepare text content with wrapping
    const visibleFields = fields.filter((field) => field.visible);
    const allTextLines: string[] = [];

    for (const field of visibleFields) {
      const value = exifData[field.key];
      const text = value
        ? field.format
          ? field.format(value)
          : `${field.label}: ${value}`
        : `${field.label}: N/A`;

      // Wrap text if it's too long
      const wrappedLines = this.wrapText(ctx, text, maxTextWidth);
      allTextLines.push(...wrappedLines);
    }

    // Calculate dynamic height based on total wrapped lines
    const dynamicHeight =
      scaledPadding + // top padding
      scaledFontSize + // first line baseline
      (allTextLines.length - 1) * lineHeight + // additional lines
      scaledPadding; // bottom padding

    // Use dynamic height
    const scaledHeight = dynamicHeight;

    // Draw background with dynamic height
    ctx.globalAlpha = style.opacity;
    ctx.fillStyle = style.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      scaledX,
      scaledY,
      scaledWidth,
      scaledHeight,
      scaledBorderRadius
    );
    ctx.fill();

    // Draw text
    ctx.globalAlpha = 1;
    ctx.fillStyle = style.textColor;

    // Apply text shadow for readability when template requests it
    if (template.textShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 6 * Math.max(1, scaleFactor);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    const shouldRotate =
      template.rotateForPortrait === true && options?.imageIsPortrait === true;

    if (shouldRotate && options?.overlayPosition?.includes('right')) {
      // Rotate 90 degrees at the right edge for portrait images
      const isTop = options.overlayPosition === 'top-right';
      const anchorX = scaledX + scaledWidth - scaledPadding;
      const anchorY = isTop
        ? scaledY + scaledPadding
        : scaledY + (scaledHeight - scaledPadding);

      ctx.save();
      ctx.translate(anchorX, anchorY);
      // Reverse rotation direction per feedback
      ctx.rotate(isTop ? -Math.PI / 2 : Math.PI / 2);
      const prevAlign = ctx.textAlign;
      const prevBaseline = ctx.textBaseline;
      // Anchor to the edge and draw inward to avoid clipping
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';

      // Render lines along the long edge
      let offset = 0;
      for (const line of allTextLines) {
        // With right alignment, x is the right edge of the text in rotated coordinates
        ctx.fillText(line, isTop ? -offset : offset, 0);
        offset += lineHeight;
      }

      // Restore context
      ctx.textAlign = prevAlign;
      ctx.textBaseline = prevBaseline as CanvasTextBaseline;
      ctx.restore();
    } else {
      let currentY = scaledY + scaledPadding + scaledFontSize;
      const textX =
        position.alignment === 'center'
          ? scaledX + scaledWidth / 2
          : position.alignment === 'right'
            ? scaledX + scaledWidth - scaledPadding
            : scaledX + scaledPadding;

      // Render all wrapped text lines
      for (const line of allTextLines) {
        ctx.fillText(line, textX, currentY);
        currentY += lineHeight;
      }
    }
  }

  static async renderToBlob(options: RenderOptions): Promise<Blob> {
    await this.render(options);

    const { canvas, settings } = options;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        settings.format === 'png' ? 'image/png' : 'image/jpeg',
        settings.quality
      );
    });
  }

  // Used by the preview hook to size its render canvas to the display
  // before rendering. For bottom-padding templates the final canvas is
  // taller than the image; without this we'd guess the wrong aspect ratio.
  static estimateBottomPaddingHeight(
    template: Template,
    exifData: NormalizedExifData,
    baseWidth: number,
    baseHeight: number
  ): number {
    if (template.layout !== 'bottom-padding') return 0;
    const scaleFactor = Math.min(baseWidth, baseHeight) / 1000;
    return this.calculateDynamicTemplateHeight(
      template,
      exifData,
      scaleFactor,
      baseWidth
    );
  }

  // Half-step (pyramid) downsample: keep halving the source onto an
  // offscreen canvas until it is within 2x of the target. The browser's
  // single-shot drawImage degrades sharply when the source is many times
  // larger than the destination; iterative bilinear passes are visually
  // close to Lanczos at a fraction of the cost.
  private static stepDownSource(
    source: HTMLImageElement,
    targetPixelWidth: number,
    targetPixelHeight: number
  ): HTMLImageElement | HTMLCanvasElement {
    if (typeof document === 'undefined') return source;

    const sourceWidth = source.naturalWidth || source.width;
    const sourceHeight = source.naturalHeight || source.height;
    if (!sourceWidth || !sourceHeight) return source;

    if (
      sourceWidth <= targetPixelWidth * 2 &&
      sourceHeight <= targetPixelHeight * 2
    ) {
      return source;
    }

    let current: HTMLImageElement | HTMLCanvasElement = source;
    let currentWidth = sourceWidth;
    let currentHeight = sourceHeight;

    while (
      currentWidth > targetPixelWidth * 2 &&
      currentHeight > targetPixelHeight * 2
    ) {
      const nextWidth = Math.max(
        targetPixelWidth,
        Math.floor(currentWidth / 2)
      );
      const nextHeight = Math.max(
        targetPixelHeight,
        Math.floor(currentHeight / 2)
      );

      const offCanvas = document.createElement('canvas');
      offCanvas.width = nextWidth;
      offCanvas.height = nextHeight;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return current;
      offCtx.imageSmoothingEnabled = true;
      offCtx.imageSmoothingQuality = 'high';
      offCtx.drawImage(current, 0, 0, nextWidth, nextHeight);

      current = offCanvas;
      currentWidth = nextWidth;
      currentHeight = nextHeight;
    }

    return current;
  }

  static calculateOptimalSize(
    imageWidth: number,
    imageHeight: number
  ): { width: number; height: number } {
    const maxSize = 4096; // 4K max
    const aspectRatio = imageWidth / imageHeight;

    if (imageWidth <= maxSize && imageHeight <= maxSize) {
      return { width: imageWidth, height: imageHeight };
    }

    if (aspectRatio > 1) {
      // Landscape - use exact aspect ratio to calculate height
      const width = maxSize;
      const height = Math.round(maxSize / aspectRatio);
      return {
        width,
        height,
      };
    } else {
      // Portrait or square - use exact aspect ratio to calculate width
      const height = maxSize;
      const width = Math.round(maxSize * aspectRatio);
      return {
        width,
        height,
      };
    }
  }
}
