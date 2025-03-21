import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import * as tf from '@tensorflow/tfjs';
import type { BodyShape } from '../types';

type Props = {
  onBodyShapeDetected: (bodyShape: BodyShape, confidence: number) => void;
  onError: (error: string) => void;
  imageQuality?: 'low' | 'medium' | 'high';
  modelComplexity?: 0 | 1 | 2;
};

export function BodyShapeDetector({ 
  onBodyShapeDetected, 
  onError,
  imageQuality = 'medium',
  modelComplexity = 1
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [frameCount, setFrameCount] = useState(0);
  const landmarksBuffer = useRef<Array<any>>([]);
  const BUFFER_SIZE = 10; // Store last 10 frames for stability

  // Helper function to approximate bust points
  const approximateBustPoints = useCallback((landmarks: any[]) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23]; 
    const rightHip = landmarks[24]; 
    
    // Calculate shoulder midpoint for reference
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2
    };
    
    // Calculate torso vector
    const torsoVector = {
      x: leftHip.x - leftShoulder.x,
      y: leftHip.y - leftShoulder.y,
      z: leftHip.z - leftShoulder.z
    };

    // Calculate torso length in 3D space
    const torsoLength = Math.sqrt(
      Math.pow(torsoVector.x, 2) +
      Math.pow(torsoVector.y, 2) +
      Math.pow(torsoVector.z, 2)
    );

    // More accurate bust position - about 29% down from shoulders
    const bustHeightRatio = 0.29;

    // Calculate shoulder width in 3D space
    const shoulderWidth = Math.sqrt(
      Math.pow(rightShoulder.x - leftShoulder.x, 2) +
      Math.pow(rightShoulder.z - leftShoulder.z, 2)
    );

    // Bust width slightly narrower than shoulders
    const bustWidthRatio = 0.88; // Adjusted for better accuracy
    const bustHalfWidth = (shoulderWidth * bustWidthRatio) / 2;

    // Calculate bust center point using torso vector
    const centerX = shoulderMidpoint.x - torsoVector.x * bustHeightRatio;
    const centerY = shoulderMidpoint.y - torsoVector.y * bustHeightRatio;
    const centerZ = shoulderMidpoint.z - torsoVector.z * bustHeightRatio;
    
    // Calculate perpendicular vector for bust direction
    const frontVector = { x: 0, y: 0, z: 1 }; // Assuming Z is forward
    
    // Cross product for perpendicular direction
    const crossProduct = {
      x: torsoVector.y * frontVector.z - torsoVector.z * frontVector.y,
      y: torsoVector.z * frontVector.x - torsoVector.x * frontVector.z,
      z: torsoVector.x * frontVector.y - torsoVector.y * frontVector.x
    };
    
    // Normalize cross product vector
    const magnitude = Math.sqrt(
      Math.pow(crossProduct.x, 2) + 
      Math.pow(crossProduct.y, 2) + 
      Math.pow(crossProduct.z, 2)
    );
    
    if (magnitude > 0.001) {
      crossProduct.x /= magnitude;
      crossProduct.y /= magnitude;
      crossProduct.z /= magnitude;
    }
    
    const leftBust = {
      x: centerX - crossProduct.x * bustHalfWidth,
      y: centerY - crossProduct.y * bustHalfWidth,
      z: centerZ - crossProduct.z * bustHalfWidth,
      visibility: leftShoulder.visibility * 0.9
    };
    
    const rightBust = {
      x: centerX + crossProduct.x * bustHalfWidth,
      y: centerY + crossProduct.y * bustHalfWidth,
      z: centerZ + crossProduct.z * bustHalfWidth,
      visibility: rightShoulder.visibility * 0.9
    };
    
    return { leftBust, rightBust };
  }, []);

  // Helper function to find waist points
  const findWaistPoints = useCallback((landmarks: any[]) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23]; 
    const rightHip = landmarks[24]; 
    
    // Calculate midpoints for stability
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2
    };
    
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2
    };
    
    // Calculate direction vectors
    const leftVector = {
      x: leftHip.x - leftShoulder.x,
      y: leftHip.y - leftShoulder.y,
      z: leftHip.z - leftShoulder.z
    };
    
    const rightVector = {
      x: rightHip.x - rightShoulder.x,
      y: rightHip.y - rightShoulder.y,
      z: rightHip.z - rightShoulder.z
    };
    
    // Waist is approximately 42% up from hips
    const waistHeightRatio = 0.42;
    
    const leftWaist = {
      x: leftHip.x - leftVector.x * waistHeightRatio,
      y: leftHip.y - leftVector.y * waistHeightRatio,
      z: leftHip.z - leftVector.z * waistHeightRatio,
      visibility: (leftShoulder.visibility + leftHip.visibility) / 2
    };
    
    const rightWaist = {
      x: rightHip.x - rightVector.x * waistHeightRatio,
      y: rightHip.y - rightVector.y * waistHeightRatio,
      z: rightHip.z - rightVector.z * waistHeightRatio,
      visibility: (rightShoulder.visibility + rightHip.visibility) / 2
    };
    
    // Check for body twist
    const shoulderWidth = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.z - leftShoulder.z);
    const hipWidth = Math.hypot(rightHip.x - leftHip.x, rightHip.z - leftHip.z);
    
    if (Math.abs(shoulderWidth - hipWidth) / shoulderWidth > 0.15) {
      // Body is twisted, adjust waist points
      const centralVector = {
        x: hipMidpoint.x - shoulderMidpoint.x,
        y: hipMidpoint.y - shoulderMidpoint.y,
        z: hipMidpoint.z - shoulderMidpoint.z
      };
      
      const centerWaist = {
        x: hipMidpoint.x - centralVector.x * waistHeightRatio,
        y: hipMidpoint.y - centralVector.y * waistHeightRatio,
        z: hipMidpoint.z - centralVector.z * waistHeightRatio
      };
      
      const waistWidth = hipWidth * (1 - waistHeightRatio) + shoulderWidth * waistHeightRatio;
      const waistHalfWidth = waistWidth / 2;
      
      // Calculate perpendicular vector
      const frontVector = { x: 0, y: 0, z: 1 };
      const crossProduct = {
        x: centralVector.y * frontVector.z - centralVector.z * frontVector.y,
        y: centralVector.z * frontVector.x - centralVector.x * frontVector.z,
        z: centralVector.x * frontVector.y - centralVector.y * frontVector.x
      };
      
      const magnitude = Math.sqrt(
        Math.pow(crossProduct.x, 2) + 
        Math.pow(crossProduct.y, 2) + 
        Math.pow(crossProduct.z, 2)
      );
      
      if (magnitude > 0.001) {
        crossProduct.x /= magnitude;
        crossProduct.y /= magnitude;
        crossProduct.z /= magnitude;
        
        // Adjust waist points
        leftWaist.x = centerWaist.x - crossProduct.x * waistHalfWidth;
        leftWaist.y = centerWaist.y - crossProduct.y * waistHalfWidth;
        leftWaist.z = centerWaist.z - crossProduct.z * waistHalfWidth;
        
        rightWaist.x = centerWaist.x + crossProduct.x * waistHalfWidth;
        rightWaist.y = centerWaist.y + crossProduct.y * waistHalfWidth;
        rightWaist.z = centerWaist.z + crossProduct.z * waistHalfWidth;
      }
    }
    
    return { leftWaist, rightWaist };
  }, []);

  // Helper function to calculate confidence based on measurements
  const calculateConfidence = (value: number, threshold: number, idealValue: number) => {
    const distance = Math.abs(value - idealValue) / idealValue;
    return Math.max(0, 1 - distance);
  };

  const determineBodyShape = useCallback((landmarks: { x: number; y: number; z: number; visibility: number }[]) => {
    const { leftBust, rightBust } = approximateBustPoints(landmarks);
    const { leftWaist, rightWaist } = findWaistPoints(landmarks);
    const leftHip = landmarks[23]; 
    const rightHip = landmarks[24]; 
    
    // Calculate widths using full 3D measurements
    const bustWidth = Math.sqrt(
      Math.pow(rightBust.x - leftBust.x, 2) +
      Math.pow(rightBust.y - leftBust.y, 2) +
      Math.pow(rightBust.z - leftBust.z, 2)
    );
    
    const waistWidth = Math.sqrt(
      Math.pow(rightWaist.x - leftWaist.x, 2) +
      Math.pow(rightWaist.y - leftWaist.y, 2) +
      Math.pow(rightWaist.z - leftWaist.z, 2)
    );
    
    const hipWidth = Math.sqrt(
      Math.pow(rightHip.x - leftHip.x, 2) +
      Math.pow(rightHip.y - leftHip.y, 2) +
      Math.pow(rightHip.z - leftHip.z, 2)
    );

    // Calculate key ratios
    const bustToHip = bustWidth / hipWidth;
    const waistToHip = waistWidth / hipWidth;
    const waistToBust = waistWidth / bustWidth;

    // Calculate waist definition (how much the waist curves in)
    const waistDefinition = 1 - (2 * waistWidth) / (bustWidth + hipWidth);

    // Calculate proportional differences
    const bustHipDifference = Math.abs(bustWidth - hipWidth) / Math.max(bustWidth, hipWidth);
    const waistProportionDifference = Math.abs(2 * waistWidth - (bustWidth + hipWidth)) / (bustWidth + hipWidth);

    // Calculate average visibility for confidence
    const avgVisibility = [leftBust, rightBust, leftWaist, rightWaist, leftHip, rightHip]
      .map(p => p.visibility)
      .reduce((sum, val) => sum + val, 0) / 6;

    let bodyShape: BodyShape;
    let confidence: number;

    // Enhanced classification logic with refined thresholds
    if (
      waistDefinition > 0.20 && // Significant waist definition
      bustHipDifference < 0.10 && // Very balanced bust and hips
      waistToHip < 0.75 && // Clear waist-to-hip ratio
      waistToBust < 0.75 // Clear waist-to-bust ratio
    ) {
      bodyShape = 'hourglass';
      confidence = Math.min(
        waistDefinition * 1.5,
        (1 - bustHipDifference) * 2,
        (1 - waistToHip)
      ) * avgVisibility;
    } else if (bustToHip < 0.85 && waistToHip < 0.80) {
      bodyShape = 'pear';
      confidence = (0.95 - bustToHip) * (1 - waistToHip) * avgVisibility;
    } else if (bustToHip > 1.1) {
      bodyShape = 'inverted-triangle';
      confidence = (bustToHip - 1.05) * avgVisibility;
    } else if (waistToHip > 0.85 && waistToBust > 0.85) {
      bodyShape = 'apple';
      confidence = (waistToHip - 0.85) * avgVisibility * 0.9;
    } else if (
      waistDefinition < 0.15 && // Limited waist definition
      bustHipDifference < 0.15 && // Similar bust and hips
      waistProportionDifference < 0.15 && // Relatively straight lines
      waistToHip > 0.75 && waistToHip < 0.90 // Moderate waist-to-hip ratio
    ) {
      bodyShape = 'rectangle';
      confidence = (
        (1 - bustHipDifference) * 
        (1 - waistProportionDifference) * 
        avgVisibility
      );
    } else {
      // Default to most likely shape based on measurements
      if (waistDefinition > 0.15 && bustHipDifference < 0.15) {
        bodyShape = 'hourglass';
        confidence = waistDefinition * avgVisibility * 0.7;
      } else {
        bodyShape = 'rectangle';
        confidence = (1 - waistProportionDifference) * avgVisibility * 0.7;
      }
    }

    return { bodyShape, confidence };
  }, [approximateBustPoints, findWaistPoints]);

  // Process landmarks with temporal averaging
  const processLandmarks = useCallback((currentLandmarks: any) => {
    landmarksBuffer.current.push(currentLandmarks);
    
    if (landmarksBuffer.current.length > BUFFER_SIZE) {
      landmarksBuffer.current.shift();
    }
    
    if (landmarksBuffer.current.length < 3) return null;
    
    const avgLandmarks = [];
    
    for (let i = 0; i < currentLandmarks.length; i++) {
      const point = {x: 0, y: 0, z: 0, visibility: 0};
      let count = 0;
      
      landmarksBuffer.current.forEach((frame, frameIndex) => {
        const weight = (frameIndex + 1) / landmarksBuffer.current.length;
        if (frame[i] && frame[i].visibility > 0.2) {
          point.x += frame[i].x * weight;
          point.y += frame[i].y * weight;
          point.z += frame[i].z * weight;
          point.visibility += frame[i].visibility * weight;
          count += weight;
        }
      });
      
      if (count > 0) {
        point.x /= count;
        point.y /= count;
        point.z /= count;
        point.visibility /= count;
      }
      
      avgLandmarks.push(point);
    }
    
    return avgLandmarks;
  }, []);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    let camera: Camera | null = null;

    const initializePoseDetection = async () => {
      try {
        const pose = new Pose({
          locateFile: (file) => 
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        pose.setOptions({
          modelComplexity,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: imageQuality === 'low' ? 0.4 : 0.5,
          minTrackingConfidence: imageQuality === 'low' ? 0.4 : 0.5
        });

        pose.onResults((results) => {
          if (!results.poseLandmarks) return;

          try {
            setFrameCount(prev => prev + 1);
            
            // Only process every 5th frame for performance
            if (frameCount % 5 !== 0) return;

            // Check if person is in correct position
            const visibility = results.poseLandmarks.reduce(
              (sum, landmark) => sum + landmark.visibility,
              0
            ) / results.poseLandmarks.length;

            if (visibility < 0.65) {
              throw new Error('Please stand further back and ensure your full body is visible');
            }

            // Apply temporal smoothing
            const processedLandmarks = processLandmarks(results.poseLandmarks);
            if (!processedLandmarks) return;
            
            // Get body shape with confidence
            const { bodyShape, confidence } = determineBodyShape(processedLandmarks);
            
            if (confidence >= 0.6) {
              onBodyShapeDetected(bodyShape, confidence);
            } else if (confidence >= 0.4) {
              onBodyShapeDetected(bodyShape, confidence);
              onError('Low confidence detection. Try improving lighting or position.');
            } else {
              throw new Error('Unable to determine body shape with confidence. Please adjust position or lighting.');
            }
          } catch (err) {
            if (err instanceof Error) {
              onError(err.message);
            } else {
              onError('Could not determine body shape from image');
            }
          }
        });

        // Initialize camera
        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await pose.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });

        await camera.start();
        setIsInitializing(false);
      } catch (err) {
        onError('Failed to initialize camera');
        console.error('Camera initialization error:', err);
      }
    };

    initializePoseDetection();

    return () => {
      camera?.stop();
    };
  }, [onBodyShapeDetected, onError, determineBodyShape, processLandmarks, imageQuality, modelComplexity, frameCount]);

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
      <div className="mt-4 text-center text-gray-600">
        <p>Stand back to ensure your full body is visible in the frame</p>
        <p className="text-sm mt-2">For best results, wear fitted clothing and stand straight</p>
      </div>
    </div>
  );
}