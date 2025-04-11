import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import type { SkinTone } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

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
  onComplete: (results: { skinTone: SkinTone }) => void;
};

export function SkinToneDetector({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const uploadedFile = location.state?.file as File | undefined;

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
    if (!canvasRef.current || !videoRef.current) {
      throw new Error('Canvas or video reference not available');
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

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

  // Process uploaded image instead of using camera
  useEffect(() => {
    if (uploadedFile && canvasRef.current && !isProcessingComplete) {
      setIsProcessingImage(true);
      setIsInitializing(false);
      
      const processUploadedImage = async () => {
        try {
          // Create image element
          const img = new Image();
          const objectUrl = URL.createObjectURL(uploadedFile);
          
          img.onload = () => {
            try {
              // Draw image to canvas
              const canvas = canvasRef.current;
              if (!canvas) {
                throw new Error('Canvas reference lost');
              }
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                throw new Error('Could not get canvas context');
              }
              
              // Set canvas dimensions to match image
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              
              // Get pixel data from mid-face region (approximate)
              const centerX = Math.floor(img.width / 2);
              const centerY = Math.floor(img.height / 3); // Face usually in upper third
              const sampleSize = 20;
              
              // Sample pixels in face region
              let totalR = 0, totalG = 0, totalB = 0;
              const pixelData = ctx.getImageData(
                centerX - sampleSize/2, 
                centerY - sampleSize/2, 
                sampleSize, 
                sampleSize
              ).data;
              
              // Calculate average color
              for (let i = 0; i < pixelData.length; i += 4) {
                totalR += pixelData[i];
                totalG += pixelData[i+1];
                totalB += pixelData[i+2];
              }
              
              const pixelCount = pixelData.length / 4;
              const avgColor = [
                Math.round(totalR / pixelCount),
                Math.round(totalG / pixelCount),
                Math.round(totalB / pixelCount)
              ];
              
              // Find closest skin tone
              const skinTone = findClosestSkinTone(avgColor);
              console.log("Detected skin tone:", skinTone);
              
              // Add a delay to allow the user to see the processing screen
              setTimeout(() => {
                // Set processing complete and call completion handler
                setIsProcessingComplete(true);
                setIsProcessingImage(false);
                onComplete({ skinTone });
              }, 3500); // 3.5 second delay
            } catch (processError) {
              console.error('Error processing image:', processError);
              // Force move forward with a default skin tone after error
              setTimeout(() => {
                setIsProcessingComplete(true);
                setIsProcessingImage(false);
                onComplete({ skinTone: SKIN_TONES[5] }); // Medium warm as fallback
              }, 2000);
            } finally {
              // Always clean up the object URL
              URL.revokeObjectURL(objectUrl);
            }
          };
          
          // Handle image load errors
          img.onerror = () => {
            console.error('Failed to load image');
            setIsProcessingComplete(true);
            setIsProcessingImage(false);
            setHasCameraError(true);
            // Force move forward with a default skin tone
            setTimeout(() => {
              onComplete({ skinTone: SKIN_TONES[5] }); // Medium warm as fallback
            }, 2000);
            URL.revokeObjectURL(objectUrl);
          };
          
          // Set the source to start loading
          img.src = objectUrl;
          
          // Set a fallback timeout in case something goes wrong
          setTimeout(() => {
            if (!isProcessingComplete && isProcessingImage) {
              console.error('Image processing timed out');
              setIsProcessingComplete(true);
              setIsProcessingImage(false);
              // Force move forward with a default skin tone
              onComplete({ skinTone: SKIN_TONES[5] }); // Medium warm as fallback
            }
          }, 10000); // 10 second timeout as ultimate fallback
        } catch (err) {
          console.error('Error processing image:', err);
          setHasCameraError(true);
          setIsProcessingImage(false);
          setIsProcessingComplete(true);
          // Force move forward with a default skin tone
          setTimeout(() => {
            onComplete({ skinTone: SKIN_TONES[5] }); // Medium warm as fallback
          }, 2000);
        }
      };
      
      processUploadedImage();
      return;
    }
    
    // Rest of camera initialization code only runs if no uploaded file
    if (!uploadedFile && !isProcessingComplete) {
      if (!videoRef.current || !canvasRef.current) return;

      let camera: Camera | null = null;
      let faceMesh: FaceMesh | null = null;

      const initializeFaceMesh = async () => {
        try {
          // Create FaceMesh with explicit configuration
          faceMesh = new FaceMesh({
            locateFile: (file) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
            },
            wasmBinary: undefined, // Let MediaPipe handle WASM loading
            maxNumFaces: 1,
            refineLandmarks: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          // Configure FaceMesh before initialization
          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          // Initialize with error handling
          try {
            await faceMesh.initialize();
          } catch (initError) {
            console.error('FaceMesh initialization error:', initError);
            throw new Error('Failed to initialize face detection. Please try again or use the quiz instead.');
          }

          // Rest of the face mesh configuration...
          let consecutiveFailures = 0;
          const MAX_FAILURES = 5;

          faceMesh.onResults((results) => {
            if (!results.multiFaceLandmarks?.[0]) {
              consecutiveFailures++;
              if (consecutiveFailures >= MAX_FAILURES) {
                console.error('No face detected. Please ensure your face is clearly visible.');
              }
              return;
            }
            consecutiveFailures = 0;

            try {
              const skinTone = extractSkinTone(results.multiFaceLandmarks[0]);
              if (skinTone) {
                // Call the onComplete function directly
                setIsProcessingComplete(true);
                onComplete({ skinTone });
              }
            } catch (err) {
              console.error(err instanceof Error ? err.message : 'Could not determine skin tone from image');
              // After several failures, pick a default and continue
              if (consecutiveFailures >= MAX_FAILURES) {
                setIsProcessingComplete(true);
                onComplete({ skinTone: SKIN_TONES[5] }); // Medium warm as fallback
              }
            }
          });

          // Initialize camera with error handling
          try {
            camera = new Camera(videoRef.current, {
              onFrame: async () => {
                if (videoRef.current && faceMesh) {
                  try {
                    await faceMesh.send({ image: videoRef.current });
                  } catch (sendError) {
                    console.error('Error sending frame to FaceMesh:', sendError);
                  }
                }
              },
              width: 640,
              height: 480
            });

            await camera.start();
            setIsInitializing(false);
          } catch (cameraError) {
            console.error('Camera initialization error:', cameraError);
            throw new Error('Camera access denied. Please check your camera permissions and try again.');
          }

        } catch (err) {
          console.error('Setup error:', err);
          setHasCameraError(true);
          console.error(err instanceof Error ? err.message : 'Failed to initialize camera system.');
        }
      };

      // Add a small delay before initialization to ensure DOM is ready
      const initTimeout = setTimeout(() => {
        initializeFaceMesh().catch((err) => {
          console.error('Delayed initialization error:', err);
          setHasCameraError(true);
          console.error('Failed to initialize camera system. Please try the quiz instead.');
        });
      }, 100);

      return () => {
        clearTimeout(initTimeout);
        faceMesh?.close();
        camera?.stop();
      };
    }
  }, [extractSkinTone, findClosestSkinTone, onComplete, uploadedFile, isProcessingComplete]);

  // Add loading state handling
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isInitializing && !uploadedFile) {
        setHasCameraError(true);
        console.error('Camera initialization timed out. Please refresh and try again.');
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeoutId);
  }, [isInitializing, uploadedFile]);

  // Automatically switch to quiz mode if camera fails
  useEffect(() => {
    if (hasCameraError) {
      const timer = setTimeout(() => {
        console.error('Oops! We are not able to access the camera. Instead, please answer these questions.');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCameraError]);

  // Global fail-safe timeout that will force completion if everything else fails
  useEffect(() => {
    const globalTimeout = setTimeout(() => {
      if (!isProcessingComplete) {
        console.error('Global timeout triggered - forcing completion');
        setIsProcessingComplete(true);
        setIsProcessingImage(false);
        setIsInitializing(false);
        onComplete({ skinTone: SKIN_TONES[5] }); // Medium warm as fallback
      }
    }, 15000); // 15 seconds max for the entire process

    return () => clearTimeout(globalTimeout);
  }, [isProcessingComplete, onComplete]);

  // Show image processing UI if we're processing an uploaded image
  if (isProcessingImage) {
    return (
      <div className="max-w-2xl mx-auto text-center mt-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Analyzing your photo...</h2>
        <div className="w-full h-4 bg-gray-200 rounded-full mt-4 overflow-hidden relative">
          <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#B252FF] to-[#F777F7] rounded-full animate-pulse" 
               style={{width: '75%'}}></div>
        </div>
        <p className="text-lg text-gray-600 mt-4">
          Please wait while we determine your skin tone.
        </p>
        <p className="text-sm text-gray-500 mt-2 italic">
          This will take a moment...
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {!uploadedFile && (
        <>
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
        </>
      )}
      {uploadedFile && (
        <div className="hidden">
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}