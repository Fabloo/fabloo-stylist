import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import type { SkinTone } from '../types';

const SKIN_TONES: SkinTone[] = [
  { id: 'fair-cool', name: 'Fair Cool', hexColor: '#F5D0C5', season: 'cool' },
  { id: 'fair-warm', name: 'Fair Warm', hexColor: '#F7D5A6', season: 'warm' },
  { id: 'light-cool', name: 'Light Cool', hexColor: '#E8B593', season: 'cool' },
  { id: 'light-warm', name: 'Light Warm', hexColor: '#E6B98F', season: 'warm' },
  { id: 'medium-cool', name: 'Medium Cool', hexColor: '#C68863', season: 'cool' },
  { id: 'medium-warm', name: 'Medium Warm', hexColor: '#C68642', season: 'warm' },
  { id: 'deep-cool', name: 'Deep Cool', hexColor: '#8D5524', season: 'cool' },
  { id: 'deep-warm', name: 'Deep Warm', hexColor: '#8B4513', season: 'warm' }
];

type Props = {
  onSkinToneDetected: (skinTone: SkinTone) => void;
  onError: (error: string) => void;
};

export function SkinToneDetector({ onSkinToneDetected, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCameraError, setHasCameraError] = useState(false);

  const findClosestSkinTone = useCallback((rgb: number[]): SkinTone => {
    let minDistance = Infinity;
    let closestTone = SKIN_TONES[0];

    for (const tone of SKIN_TONES) {
      const hex = tone.hexColor.substring(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      const distance = Math.sqrt(
        Math.pow(rgb[0] - r, 2) +
        Math.pow(rgb[1] - g, 2) +
        Math.pow(rgb[2] - b, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestTone = tone;
      }
    }

    return closestTone;
  }, []);

  const extractSkinTone = useCallback((landmarks: { x: number; y: number; z: number }[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Draw frame from video
    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Key facial points for skin tone sampling
    const samplePoints = [
      landmarks[10],  // Forehead
      landmarks[234], // Left cheek
      landmarks[454], // Right cheek
      landmarks[152]  // Chin
    ];

    let totalR = 0, totalG = 0, totalB = 0;
    let validSamples = 0;

    for (const point of samplePoints) {
      const x = Math.floor(point.x * canvasRef.current.width);
      const y = Math.floor(point.y * canvasRef.current.height);

      // Get pixel color at sample point
      const pixel = ctx.getImageData(x, y, 1, 1).data;

      // Apply brightness normalization
      const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
      if (brightness > 30 && brightness < 250) { // Filter out too dark/bright pixels
        totalR += pixel[0];
        totalG += pixel[1];
        totalB += pixel[2];
        validSamples++;
      }
    }

    if (validSamples === 0) {
      throw new Error('Could not get valid skin tone samples');
    }

    // Calculate average color
    const avgColor = [
      Math.round(totalR / validSamples),
      Math.round(totalG / validSamples),
      Math.round(totalB / validSamples)
    ];

    return findClosestSkinTone(avgColor);
  }, [findClosestSkinTone]);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    let camera: Camera | null = null;
    let faceMesh: FaceMesh | null = null;

    const initializeFaceMesh = async () => {
      try {
        faceMesh = new FaceMesh({
          locateFile: (file) => 
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        await faceMesh.initialize();
        
        await faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        faceMesh.onResults((results) => {
          if (!results.multiFaceLandmarks?.[0]) return;

          try {
            const skinTone = extractSkinTone(results.multiFaceLandmarks[0]);
            if (skinTone) {
              onSkinToneDetected(skinTone);
            }
          } catch (err) {
            onError('Could not determine skin tone from image');
          }
        });

        // Initialize camera
        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await faceMesh.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });

        await camera.start();
        setIsInitializing(false);
      } catch (err) {
        console.error('Camera initialization error:', err);
        setHasCameraError(true);
        onError('Oops! We are not able to access the camera. Instead, please answer these questions.');
      }
    };

    initializeFaceMesh();

    return () => {
      faceMesh?.close();
      camera?.stop();
    };
  }, [onSkinToneDetected, onError, extractSkinTone]);

  // Automatically switch to quiz mode if camera fails
  useEffect(() => {
    if (hasCameraError) {
      const timer = setTimeout(() => {
        onError('Oops! We are not able to access the camera. Instead, please answer these questions.');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCameraError, onError]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
        playsInline
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="hidden"
      />
      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <p className="text-white text-lg">Initializing camera...</p>
        </div>
      )}
    </div>
  );
}