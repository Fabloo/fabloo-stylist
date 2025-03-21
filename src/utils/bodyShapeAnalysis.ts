import type { BodyShape } from '../types';

import * as tf from '@tensorflow/tfjs';

// Initialize TensorFlow
tf.ready().then(() => {
  console.log('TensorFlow.js is ready');
}).catch(err => {
  console.error('TensorFlow.js initialization error:', err);
});

// Constants for body shape classification
const SHAPE_THRESHOLDS = {
  rectangle: {
    waistToHipMin: 0.80,  // Higher minimum for Rectangle detection
    waistToHipMax: 0.95,  // Lower maximum to differentiate from Apple
    shoulderToHipMin: 0.90,
    shoulderToHipMax: 1.10,
    waistDefinitionMax: 0.15  // Maximum waist definition for Rectangle
  },
  hourglass: {
    waistToHipMax: 0.75,
    waistToShoulderMax: 0.75
  }
};

// Constants for quality assessment
const QUALITY_THRESHOLDS = {
  blur: 100,
  noise: 50,
  contrast: 80,
  brightness: {
    min: 40,
    max: 215
  }
};

// Helper function to calculate image quality metrics
function evaluateImageQuality(imageData: ImageData): {
  blurLevel: number;
  noiseLevel: number;
  contrast: number;
  brightness: number;
  overallQuality: number;
  isLowQuality: boolean;
} {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Convert to grayscale for calculations
  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    grayscale[idx] = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
  }

  // Calculate Laplacian variance (blur detection)
  let blurLevel = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian = 
        grayscale[idx - width - 1] + grayscale[idx - width] + grayscale[idx - width + 1] +
        grayscale[idx - 1] + (-8 * grayscale[idx]) + grayscale[idx + 1] +
        grayscale[idx + width - 1] + grayscale[idx + width] + grayscale[idx + width + 1];
      blurLevel += laplacian * laplacian;
    }
  }
  blurLevel /= (width * height);

  // Estimate noise level
  let noiseLevel = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const diff = Math.abs(grayscale[idx] - grayscale[idx - 1]) +
                  Math.abs(grayscale[idx] - grayscale[idx + 1]) +
                  Math.abs(grayscale[idx] - grayscale[idx - width]) +
                  Math.abs(grayscale[idx] - grayscale[idx + width]);
      noiseLevel += diff;
    }
  }
  noiseLevel /= (width * height * 4);

  // Calculate contrast
  let min = 255, max = 0;
  let sum = 0;
  for (let i = 0; i < grayscale.length; i++) {
    const value = grayscale[i];
    min = Math.min(min, value);
    max = Math.max(max, value);
    sum += value;
  }
  const contrast = max - min;
  const brightness = sum / grayscale.length;

  // Calculate overall quality score (0-100)
  const qualityScore = Math.min(100, Math.max(0,
    20 + // Base score
    Math.min(40, (blurLevel / QUALITY_THRESHOLDS.blur) * 40) + // Blur score
    Math.min(20, ((QUALITY_THRESHOLDS.noise - noiseLevel) / QUALITY_THRESHOLDS.noise) * 20) + // Noise score
    Math.min(10, (contrast / QUALITY_THRESHOLDS.contrast) * 10) + // Contrast score
    Math.min(10, (
      brightness <= 127 
        ? brightness / QUALITY_THRESHOLDS.brightness.min 
        : (255 - brightness) / (255 - QUALITY_THRESHOLDS.brightness.max)
    ) * 10) // Brightness score
  ));

  return {
    blurLevel,
    noiseLevel,
    contrast,
    brightness,
    overallQuality: qualityScore,
    isLowQuality: qualityScore < 40
  };
}

// Helper function to enhance image quality
function enhanceImageQuality(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  // Apply contrast enhancement
  const factor = 1.2; // Contrast enhancement factor
  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) { // Process RGB channels
      data[i + j] = Math.min(255, Math.max(0,
        Math.round(((data[i + j] - 128) * factor) + 128)
      ));
    }
  }

  // Apply sharpening
  const sharpenedData = new Uint8ClampedArray(data);
  const kernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // Process RGB channels
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[ky + 1][kx + 1];
          }
        }
        sharpenedData[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
      }
    }
  }

  return new ImageData(sharpenedData, width, height);
}

// Load and initialize VGG19 model
let vgg19Model: tf.LayersModel | null = null;

async function loadVGG19Model() {
  if (!vgg19Model) {
    try {
      // Ensure TensorFlow is ready
      await tf.ready();
      
      // Use a simpler model for initial testing
      const model = tf.sequential();
      
      model.add(tf.layers.conv2d({
        inputShape: [224, 224, 3],
        filters: 32,
        kernelSize: 3,
        activation: 'relu'
      }));
      
      model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
      model.add(tf.layers.flatten());
      model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
      model.add(tf.layers.dropout({ rate: 0.5 }));
      model.add(tf.layers.dense({ units: 5, activation: 'softmax' }));
      
      vgg19Model = model;
    } catch (err) {
      console.error('Error loading model:', err);
      throw new Error('Failed to initialize body analysis model');
    }
  }
  return vgg19Model;
}

// Main analysis function
export async function analyzeBodyShape(file: File): Promise<BodyShape> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let tensor: tf.Tensor | null = null;

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = async () => {
      try {
        // Ensure TensorFlow is ready
        await tf.ready();

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

        canvas.width = width;
        canvas.height = height;

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        try {
          // Convert image to tensor
          tensor = tf.browser.fromPixels(canvas)
            .resizeBilinear([224, 224]) // VGG19 expects 224x224
            .toFloat();

          // Preprocess for VGG19
          tensor = tensor.div(255.0).expandDims(0);

          // Load model and get prediction
          const model = await loadVGG19Model();
          const prediction = model.predict(tensor) as tf.Tensor;
          const bodyShapeIndex = await prediction.argMax(1).data();
          
          // Map index to body shape
          const shapes: BodyShape[] = ['hourglass', 'pear', 'rectangle', 'inverted-triangle', 'apple'];
          const bodyShape = shapes[bodyShapeIndex[0]];

          // Fallback to traditional analysis if confidence is low
          const confidences = await prediction.dataSync();
          const maxConfidence = Math.max(...confidences);
          
          if (maxConfidence < 0.6) {
            // Get image data for traditional analysis
            const imageData = ctx.getImageData(0, 0, width, height);
            const measurements = analyzeProportions(imageData);
            const traditionalShape = determineBodyShape(measurements);
            resolve(traditionalShape);
          } else {
            resolve(bodyShape);
          }

        } finally {
          // Clean up tensors
          if (tensor) tensor.dispose();
          if (vgg19Model) vgg19Model.dispose();
          tf.disposeVariables(); // Clean up any remaining tensors
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to analyze body shape';
        console.error('Body shape analysis error:', err);
        reject(new Error(errorMessage));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

// Helper function to analyze body proportions
function analyzeProportions(imageData: ImageData): {
  shoulderWidth: number;
  waistWidth: number;
  hipWidth: number;
  waistDefinition: number;
  verticalBalance: number;
} {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Define measurement regions
  const regions = {
    shoulders: { start: Math.floor(height * 0.15), end: Math.floor(height * 0.25) }, // Upper body
    waist: { start: Math.floor(height * 0.35), end: Math.floor(height * 0.45) },    // Mid-section
    hips: { start: Math.floor(height * 0.5), end: Math.floor(height * 0.6) }        // Lower body
  };

  // Calculate widths at each region
  const measurements = {
    shoulderWidth: 0,
    waistWidth: 0,
    hipWidth: 0,
    waistDefinition: 0,
    verticalBalance: 0
  };

  let totalBodyPixels = 0;
  let bodyPixelDistribution = new Array(height).fill(0);

  Object.entries(regions).forEach(([region, { start, end }]) => {
    let maxWidth = 0;
    let avgWidth = 0;
    let validRows = 0;

    for (let y = start; y < end; y++) {
      let left = width;
      let right = 0;
      let bodyPixels = 0;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        // Enhanced body pixel detection with skin tone consideration
        const isBodyPixel = (
          data[idx + 3] > 100 && // Alpha threshold
          data[idx] > 20 && // Brightness threshold
          Math.abs(data[idx] - data[idx + 1]) < 30 && // RGB similarity for skin detection
          Math.abs(data[idx] - data[idx + 2]) < 30 &&
          Math.abs(data[idx + 1] - data[idx + 2]) < 30
        );

        if (isBodyPixel) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          bodyPixels++;
        }
      }

      bodyPixelDistribution[y] = bodyPixels;
      totalBodyPixels += bodyPixels;

      if (right > left) {
        const rowWidth = right - left;
        maxWidth = Math.max(maxWidth, rowWidth);
        avgWidth += rowWidth;
        validRows++;
      }
    }

    const sectionWidth = validRows > 0 ? avgWidth / validRows : 0;

    switch (region) {
      case 'shoulders':
        measurements.shoulderWidth = sectionWidth;
        break;
      case 'waist':
        measurements.waistWidth = sectionWidth;
        break;
      case 'hips':
        measurements.hipWidth = sectionWidth;
        break;
    }
  });

  // Calculate waist definition (how much the waist curves in)
  measurements.waistDefinition = Math.abs(
    1 - (2 * measurements.waistWidth) / (measurements.shoulderWidth + measurements.hipWidth)
  );

  // Calculate vertical balance (distribution of body pixels)
  const upperBody = bodyPixelDistribution.slice(0, height / 2).reduce((a, b) => a + b, 0);
  const lowerBody = bodyPixelDistribution.slice(height / 2).reduce((a, b) => a + b, 0);
  measurements.verticalBalance = Math.abs(upperBody - lowerBody) / totalBodyPixels;

  return measurements;
}

// Helper function to determine body shape from measurements
function determineBodyShape(measurements: {
  shoulderWidth: number;
  waistWidth: number;
  hipWidth: number;
  waistDefinition: number;
  verticalBalance: number;
}): BodyShape {
  const { shoulderWidth, waistWidth, hipWidth, waistDefinition, verticalBalance } = measurements;

  // Calculate ratios
  const shoulderToHip = shoulderWidth / hipWidth;
  const waistToHip = waistWidth / hipWidth;
  const waistToShoulder = waistWidth / shoulderWidth;

  // Multi-factor analysis for Rectangle shape
  const isRectangle = 
    waistToHip >= SHAPE_THRESHOLDS.rectangle.waistToHipMin &&
    waistToHip <= SHAPE_THRESHOLDS.rectangle.waistToHipMax &&
    shoulderToHip >= SHAPE_THRESHOLDS.rectangle.shoulderToHipMin &&
    shoulderToHip <= SHAPE_THRESHOLDS.rectangle.shoulderToHipMax &&
    waistDefinition <= SHAPE_THRESHOLDS.rectangle.waistDefinitionMax &&
    verticalBalance < 0.2; // Balanced distribution between upper and lower body

  // Enhanced body shape determination with Rectangle priority
  if (isRectangle) {
    return 'rectangle';
  } else if (shoulderToHip > 1.15) {
    return 'inverted-triangle';
  } else if (shoulderToHip < 0.85) {
    return 'pear';
  } else if (
    waistToHip < SHAPE_THRESHOLDS.hourglass.waistToHipMax && 
    waistToShoulder < SHAPE_THRESHOLDS.hourglass.waistToShoulderMax &&
    waistDefinition > 0.15
  ) {
    return 'hourglass';
  } else if (waistToHip > 0.85 && waistToShoulder > 0.85) {
    return 'apple';
  } else {
    // Fallback case - use waist definition as final determinant
    return waistDefinition <= 0.1 ? 'rectangle' : 'hourglass';
  }
}