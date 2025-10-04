import { useState, useRef, useCallback, useEffect } from 'react';
import { initializePoseDetector, detectPose } from '../utils/poseDetection';
import type { Pose, FrameAnalysis } from '../types';

interface UseVideoAnalysisOptions<T> {
  videoFile: File;
  framesToAnalyze?: number;
  analyzeFunction: (pose: Pose) => T | null;
  combineFunction: (analyses: T[]) => T;
  onComplete?: (analysis: T, allFramePoses: FrameAnalysis[]) => void;
}

interface UseVideoAnalysisReturn<T> {
  analysis: T | null;
  isAnalyzing: boolean;
  progress: number;
  error: string;
  allFramePoses: FrameAnalysis[];
  videoRef: React.RefObject<HTMLVideoElement>;
}

/**
 * Generic hook for video pose analysis
 * Handles video loading, frame sampling, pose detection, and analysis
 */
export function useVideoAnalysis<T>({
  videoFile,
  framesToAnalyze = 24,
  analyzeFunction,
  combineFunction,
  onComplete,
}: UseVideoAnalysisOptions<T>): UseVideoAnalysisReturn<T> {
  const [analysis, setAnalysis] = useState<T | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [allFramePoses, setAllFramePoses] = useState<FrameAnalysis[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const analyzeVideo = useCallback(async (): Promise<void> => {
    setIsAnalyzing(true);
    setError('');
    setProgress(0);

    try {
      // Initialize pose detector
      setProgress(10);
      await initializePoseDetector();
      setProgress(20);

      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not available');
      }

      const videoUrl = URL.createObjectURL(videoFile);

      // Load video and wait for metadata
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = videoUrl;
      });

      // Check video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Video dimensions not available');
      }

      // Seek to middle of video and wait
      video.currentTime = video.duration / 2;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      setProgress(30);

      // Analyze multiple frames
      const interval = video.duration / (framesToAnalyze + 1);
      const allAnalyses: FrameAnalysis[] = [];

      for (let i = 1; i <= framesToAnalyze; i++) {
        const targetTime = i * interval;

        // Seek and wait for the frame to be ready
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
          video.currentTime = targetTime;
        });

        // Small delay to ensure frame is rendered
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          const pose = await detectPose(video);
          if (pose && pose.score > 0.3) {
            const frameAnalysis = analyzeFunction(pose);
            if (frameAnalysis) {
              allAnalyses.push({ analysis: frameAnalysis, pose });
            }
          }
        } catch (frameError) {
          console.warn('Frame analysis failed:', frameError);
        }

        setProgress(30 + (i / framesToAnalyze) * 60);
      }

      // Combine analyses
      if (allAnalyses.length > 0) {
        const analyses = allAnalyses.map(a => a.analysis as T);
        const combinedAnalysis = combineFunction(analyses);
        setAnalysis(combinedAnalysis);
        setAllFramePoses(allAnalyses);

        if (onCompleteRef.current) {
          onCompleteRef.current(combinedAnalysis, allAnalyses);
        }
      } else {
        setError('Could not detect person in video. Please ensure the full body is visible from the side.');
      }

      setProgress(100);
      URL.revokeObjectURL(videoUrl);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze video. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoFile, framesToAnalyze, analyzeFunction, combineFunction]);

  // Auto-trigger analysis when video file changes
  useEffect(() => {
    if (videoFile) {
      analyzeVideo();
    }
  }, [videoFile, analyzeVideo]);

  return {
    analysis,
    isAnalyzing,
    progress,
    error,
    allFramePoses,
    videoRef,
    analyzeVideo,
  };
}
