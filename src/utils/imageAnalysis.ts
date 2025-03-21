import type { BodyShape, AnalysisResult } from '../types';

// Constants for skin tone analysis
const SKIN_TONE_REFERENCES = {
  'fair-cool': [255, 236, 228],   // Type I (Pale white)
  'fair-warm': [241, 214, 195],   // Type II (White)
  'light-cool': [224, 177, 151],  // Type III (Light brown)
  'light-warm': [198, 145, 114],  // Type IV (Moderate brown)
  'deep-cool': [143, 101, 79],    // Type V (Dark brown)
  'deep-warm': [92, 67, 57]       // Type VI (Very dark brown)
};

class ImageAnalyzer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private static instance: ImageAnalyzer | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
  }

  static getInstance(): ImageAnalyzer {
    if (!ImageAnalyzer.instance) {
      ImageAnalyzer.instance = new ImageAnalyzer();
    }
    return ImageAnalyzer.instance;
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private async preprocessImage(img: HTMLImageElement): Promise<ImageData> {
    // Resize image to manageable size while maintaining aspect ratio
    const maxDim = 800;
    let width = img.width;
    let height = img.height;
    
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = (height / width) * maxDim;
        width = maxDim;
      } else {
        width = (width / height) * maxDim;
        height = maxDim;
      }
    }

    this.canvas.width = width;
    this.canvas.height = height;
    
    // Draw image
    this.ctx.drawImage(img, 0, 0, width, height);
    
    // Apply basic image processing
    const imageData = this.ctx.getImageData(0, 0, width, height);
    return this.enhanceImage(imageData);
  }

  private enhanceImage(imageData: ImageData): ImageData {
    const data = imageData.data;
    
    // Simple contrast enhancement
    const factor = 1.2; // Contrast factor
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp(((data[i] - 128) * factor) + 128);     // R
      data[i + 1] = this.clamp(((data[i + 1] - 128) * factor) + 128); // G
      data[i + 2] = this.clamp(((data[i + 2] - 128) * factor) + 128); // B
    }

    return imageData;
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(255, value));
  }

  private extractSkinRegions(imageData: ImageData): Uint8ClampedArray {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const skinMask = new Uint8ClampedArray(width * height);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert RGB to YCbCr
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Skin color thresholds in YCbCr space
      const isSkin = (
        y > 80 &&
        cb > 77 && cb < 127 &&
        cr > 133 && cr < 173
      );

      skinMask[i / 4] = isSkin ? 255 : 0;
    }

    return skinMask;
  }

  private analyzeSkinTone(imageData: ImageData, skinMask: Uint8ClampedArray): [string, number] {
    const data = imageData.data;
    const skinPixels: number[][] = [];

    // Collect skin pixels
    for (let i = 0; i < skinMask.length; i++) {
      if (skinMask[i] > 0) {
        const idx = i * 4;
        skinPixels.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }

    if (skinPixels.length === 0) {
      return ['light-cool', 0];
    }

    // Calculate average skin color
    const avgColor = skinPixels.reduce(
      (acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]],
      [0, 0, 0]
    ).map(v => v / skinPixels.length);

    // Find closest skin tone reference
    let minDist = Infinity;
    let closestTone = 'light-cool';
    
    Object.entries(SKIN_TONE_REFERENCES).forEach(([tone, ref]) => {
      const dist = Math.sqrt(
        Math.pow(avgColor[0] - ref[0], 2) +
        Math.pow(avgColor[1] - ref[1], 2) +
        Math.pow(avgColor[2] - ref[2], 2)
      );
      
      if (dist < minDist) {
        minDist = dist;
        closestTone = tone;
      }
    });

    // Calculate confidence (inverse of distance, normalized)
    const maxPossibleDist = Math.sqrt(
      Math.pow(255, 2) * 3 // Maximum possible distance in RGB space
    );
    const confidence = Math.max(0, 1 - (minDist / maxPossibleDist));

    return [closestTone, confidence];
  }

  private analyzeBodyShape(imageData: ImageData): [BodyShape, number] {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const qualityScore = this.assessImageQuality(imageData);

    // Divide image into regions
    const regions = {
      shoulders: { start: Math.floor(height * 0.15), end: Math.floor(height * 0.25) },
      waist: { start: Math.floor(height * 0.35), end: Math.floor(height * 0.45) },
      hips: { start: Math.floor(height * 0.5), end: Math.floor(height * 0.6) }
    };

    // Apply denoising and enhancement
    const enhancedData = this.applyImageEnhancements(data);

    // Calculate width at each region
    const measurements = Object.entries(regions).map(([region, { start, end }]) => {
      let maxWidth = 0;
      let totalWidth = 0;
      let validRows = 0;
      
      for (let y = start; y < end; y++) {
        let left = width;
        let right = 0;
        let hasBody = false;
        
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          // Check if pixel is part of the body (not background)
          const isBody = (
            enhancedData[idx + 3] > 100 && // More lenient alpha threshold
            enhancedData[idx] > 20 && // Lower darkness threshold
            this.isBodyPixel(enhancedData.slice(idx, idx + 4))
          );
          
          if (isBody) {
            hasBody = true;
            left = Math.min(left, x);
            right = Math.max(right, x);
          }
        }
        
        if (hasBody && right > left) {
          const rowWidth = right - left;
          maxWidth = Math.max(maxWidth, rowWidth);
          totalWidth += rowWidth;
          validRows++;
        }
      }
      
      return {
        region,
        width: maxWidth,
        avgWidth: validRows > 0 ? totalWidth / validRows : 0
      };
    });

    // Calculate ratios
    const [shoulders, waist, hips] = measurements;
    const shoulderToHip = shoulders.avgWidth / hips.avgWidth;
    const waistToHip = waist.avgWidth / hips.avgWidth;
    const waistToShoulder = waist.avgWidth / shoulders.avgWidth;

    // Determine body shape
    let bodyShape: BodyShape;
    let confidence = Math.min(
      qualityScore,
      (shoulders.confidence + waist.confidence + hips.confidence) / 3
    );

    if (shoulderToHip > 1.15) {
      bodyShape = 'inverted-triangle';
      confidence *= 0.95;
    } else if (shoulderToHip < 0.85) {
      bodyShape = 'pear';
      confidence *= 0.95;
    } else if (waistToHip < 0.8 && waistToShoulder < 0.8) {
      bodyShape = 'hourglass';
      confidence *= 1.0;
    } else if (waistToHip > 0.9 && waistToShoulder > 0.9) {
      bodyShape = 'apple';
      confidence *= 0.95;
    } else {
      bodyShape = 'rectangle';
      confidence *= 0.9;
    }

    return [bodyShape, confidence];
  }

  private assessImageQuality(imageData: ImageData): number {
    const data = imageData.data;
    let blurScore = 0;
    let contrastScore = 0;
    let noiseScore = 0;

    // Calculate Laplacian variance for blur detection
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      blurScore += Math.abs(gray - 128);
    }
    blurScore = Math.min(1, blurScore / (data.length * 128));

    // Calculate contrast
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      min = Math.min(min, gray);
      max = Math.max(max, gray);
    }
    contrastScore = (max - min) / 255;

    // Estimate noise level
    let noiseSum = 0;
    for (let i = 4; i < data.length; i += 4) {
      const diff = Math.abs(data[i] - data[i - 4]);
      noiseSum += diff;
    }
    noiseScore = 1 - Math.min(1, noiseSum / (data.length * 255));

    // Combine scores with weights
    return (blurScore * 0.4 + contrastScore * 0.4 + noiseScore * 0.2);
  }

  private applyImageEnhancements(data: Uint8ClampedArray): Uint8ClampedArray {
    const enhanced = new Uint8ClampedArray(data.length);
    
    // Apply CLAHE-like enhancement
    const histSize = 256;
    const hist = new Array(histSize).fill(0);
    
    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
      hist[gray]++;
    }
    
    // Calculate cumulative histogram
    const cdf = new Array(histSize).fill(0);
    cdf[0] = hist[0];
    for (let i = 1; i < histSize; i++) {
      cdf[i] = cdf[i - 1] + hist[i];
    }
    
    // Normalize CDF
    const cdfMin = cdf[0];
    const cdfMax = cdf[histSize - 1];
    for (let i = 0; i < histSize; i++) {
      cdf[i] = Math.round((cdf[i] - cdfMin) * 255 / (cdfMax - cdfMin));
    }
    
    // Apply enhancement
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor((data[i] + data[i + 1] + data[i + 2]) / 3);
      const factor = cdf[gray] / gray || 1;
      
      enhanced[i] = Math.min(255, Math.round(data[i] * factor));
      enhanced[i + 1] = Math.min(255, Math.round(data[i + 1] * factor));
      enhanced[i + 2] = Math.min(255, Math.round(data[i + 2] * factor));
      enhanced[i + 3] = data[i + 3];
    }
    
    return enhanced;
  }

  private isBodyPixel(pixel: Uint8ClampedArray): boolean {
    const [r, g, b] = pixel;
    
    // YCbCr conversion for better skin detection
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    
    // Enhanced skin tone detection
    return (
      y > 80 && y < 240 && // Brightness constraints
      cb > 77 && cb < 127 && // Blue difference
      cr > 133 && cr < 173 // Red difference
    );
  }
  public async analyzeImage(file: File): Promise<AnalysisResult> {
    try {
      // Load and preprocess image
      const img = await this.loadImage(file);
      const processedImage = await this.preprocessImage(img);
      
      // Extract skin regions
      const skinMask = this.extractSkinRegions(processedImage);
      
      // Analyze skin tone
      const [skinToneId, skinConfidence] = this.analyzeSkinTone(processedImage, skinMask);
      
      // Analyze body shape
      const [bodyShape, bodyConfidence] = this.analyzeBodyShape(processedImage);

      return {
        bodyShape,
        skinTone: {
          id: skinToneId,
          confidence: skinConfidence
        },
        confidence: (skinConfidence + bodyConfidence) / 2
      };
    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error('Failed to analyze image');
    }
  }
}

export async function analyzeBodyShape(file: File): Promise<BodyShape> {
  const analyzer = ImageAnalyzer.getInstance();
  const result = await analyzer.analyzeImage(file);
  if (!result || !result.bodyShape) {
    throw new Error('Failed to analyze body shape');
  }
  return result.bodyShape;
}