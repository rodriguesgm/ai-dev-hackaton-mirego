import { useCallback } from 'react';
import { detectPose } from '../utils/poseDetection';
import { interpolatePose } from '../utils/skeletonDrawing';
import type { Pose, FrameAnalysis } from '../types';

interface UseFrameRendererOptions<T> {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  allFramePoses: FrameAnalysis[];
  analyzeFunction: (pose: Pose) => T | null;
  drawSkeletonFunction: (ctx: CanvasRenderingContext2D, pose: Pose, width: number, height: number) => void;
  drawAnglesFunction: (ctx: CanvasRenderingContext2D, pose: Pose, analysis: T) => void;
}

/**
 * Generic hook for rendering video frames with pose overlays
 * Handles real-time detection with fallback to interpolated cached poses
 */
export function useFrameRenderer<T>({
  videoRef,
  canvasRef,
  allFramePoses,
  analyzeFunction,
  drawSkeletonFunction,
  drawAnglesFunction,
}: UseFrameRendererOptions<T>) {
  const handleFrameChange = useCallback(
    async (currentTime: number, showSkeleton: boolean, showAngles: boolean): Promise<void> => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Clear and draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (error) {
        console.error('Error drawing video frame:', error);
        return;
      }

      // Enhanced skeleton overlay with interpolation and real-time detection
      if (allFramePoses.length > 0) {
        const progress = currentTime / video.duration;
        const framePosition = progress * allFramePoses.length;
        const frameIndex = Math.floor(framePosition);
        const nextFrameIndex = Math.min(frameIndex + 1, allFramePoses.length - 1);
        const interpolationFactor = framePosition - frameIndex;

        let currentPose: Pose | null = null;
        let currentAnalysis: T | null = null;

        // Try real-time pose detection
        try {
          const detectedPose = await Promise.race([
            detectPose(video),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 50))
          ]);

          if (detectedPose && detectedPose.score > 0.3) {
            currentPose = detectedPose;
            currentAnalysis = analyzeFunction(detectedPose);
          }
        } catch (error) {
          console.debug('Real-time detection skipped, using cached poses');
        }

        // Fallback to interpolated poses
        if (!currentPose && allFramePoses[frameIndex] && allFramePoses[nextFrameIndex]) {
          const pose1 = allFramePoses[frameIndex].pose;
          const pose2 = allFramePoses[nextFrameIndex].pose;
          currentPose = interpolatePose(pose1, pose2, interpolationFactor);
          currentAnalysis = allFramePoses[frameIndex].analysis as T;
        }

        // Draw overlays
        if (currentPose) {
          if (showSkeleton) {
            drawSkeletonFunction(ctx, currentPose, canvas.width, canvas.height);
          }
          if (showAngles && currentAnalysis) {
            drawAnglesFunction(ctx, currentPose, currentAnalysis);
          }
        }
      }
    },
    [videoRef, canvasRef, allFramePoses, analyzeFunction, drawSkeletonFunction, drawAnglesFunction]
  );

  return { handleFrameChange };
}
