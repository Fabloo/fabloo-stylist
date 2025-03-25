import React, { useRef, useEffect, useState } from 'react';
import type { SkinTone } from '../types';

interface Props {
  onSkinToneDetected: (skinTone: SkinTone) => void;
  onError: (error: string) => void;
}

export function CameraSkinToneAnalysis({ onSkinToneDetected, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      onError('Failed to access camera. Please check permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const analyzeSkinTone = (imageData: ImageData): SkinTone => {
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    let pixelCount = 0;

    // Sample pixels from the center of the face (assuming center positioning)
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;
    const sampleSize = 50; // pixels to sample around center

    for (let y = centerY - sampleSize; y < centerY + sampleSize; y++) {
      for (let x = centerX - sampleSize; x < centerX + sampleSize; x++) {
        const i = (y * imageData.width + x) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        pixelCount++;
      }
    }

    // Calculate average RGB
    r = Math.round(r / pixelCount);
    g = Math.round(g / pixelCount);
    b = Math.round(b / pixelCount);

    // Simple skin tone classification based on RGB values
    const brightness = (r + g + b) / 3;
    const warmth = r - b; // Higher values indicate warmer undertones

    // Determine skin tone based on brightness and warmth
    let skinTone: SkinTone;
    if (brightness > 200) {
      skinTone = warmth > 15 ? SKIN_TONES.find(t => t.id === 'fair-warm')! : SKIN_TONES.find(t => t.id === 'fair-cool')!;
    } else if (brightness > 150) {
      skinTone = warmth > 15 ? SKIN_TONES.find(t => t.id === 'light-warm')! : SKIN_TONES.find(t => t.id === 'light-cool')!;
    } else if (brightness > 100) {
      skinTone = warmth > 15 ? SKIN_TONES.find(t => t.id === 'medium-warm')! : SKIN_TONES.find(t => t.id === 'medium-cool')!;
    } else {
      skinTone = warmth > 15 ? SKIN_TONES.find(t => t.id === 'deep-warm')! : SKIN_TONES.find(t => t.id === 'deep-cool')!;
    }

    return skinTone;
  };

  const captureAndAnalyze = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      onError('Failed to initialize camera analysis');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0);

    // Get image data from center of frame
    const imageData = context.getImageData(
      canvas.width / 4,
      canvas.height / 4,
      canvas.width / 2,
      canvas.height / 2
    );

    try {
      const skinTone = analyzeSkinTone(imageData);
      onSkinToneDetected(skinTone);
    } catch (err) {
      onError('Failed to analyze skin tone. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="relative max-w-md mx-auto">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full rounded-lg shadow-lg"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <button
          onClick={captureAndAnalyze}
          disabled={isCapturing}
          className="px-6 py-3 bg-black text-white rounded-full
                   hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isCapturing ? 'Analyzing...' : 'Capture and Analyze'}
        </button>
      </div>

      <div className="absolute top-4 left-4 right-4">
        <div className="bg-black bg-opacity-50 text-white p-4 rounded-lg">
          <p className="text-sm">
            Position your face in the center and ensure good lighting
          </p>
        </div>
      </div>
    </div>
  );
} 