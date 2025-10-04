import { useState, useRef, useEffect, RefObject } from 'react';
import './InteractiveVideo.css';
import type { IssueMarker } from '../types';

interface InteractiveVideoProps {
  videoFile: File;
  onFrameChange?: (currentTime: number, showSkeleton: boolean, showAngles: boolean) => void | Promise<void>;
  issueMarkers?: IssueMarker[];
  showSkeleton?: boolean;
  showAngles?: boolean;
  canvasRef?: RefObject<HTMLCanvasElement>;
  videoRef?: RefObject<HTMLVideoElement>;
}

/**
 * Interactive Video Player
 * - Video scrubbing with live angle updates
 * - Toggle overlay layers (skeleton, angles, gauges)
 * - Issue markers on timeline
 */
function InteractiveVideo({
  videoFile,
  onFrameChange,
  issueMarkers = [],
  showSkeleton = true,
  showAngles = true,
  canvasRef,
  videoRef: externalVideoRef,
}: InteractiveVideoProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showSkeletonOverlay, setShowSkeletonOverlay] = useState<boolean>(showSkeleton);
  const [showAngleOverlay, setShowAngleOverlay] = useState<boolean>(showAngles);
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const video = videoRef.current;
      const videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;
      video.load(); // Explicitly load the video

      return () => URL.revokeObjectURL(videoUrl);
    }
  }, [videoFile]);

  // Initial render when video is loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      // Trigger initial frame render
      if (onFrameChange) {
        onFrameChange(0, showSkeletonOverlay, showAngleOverlay);
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [onFrameChange, showSkeletonOverlay, showAngleOverlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onFrameChange) {
        onFrameChange(video.currentTime, showSkeletonOverlay, showAngleOverlay);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onFrameChange, showSkeletonOverlay, showAngleOverlay]);

  // Continuously render video frames to canvas while playing
  useEffect(() => {
    if (!isPlaying || !videoRef.current || !canvasRef) return;

    let animationFrameId: number;

    const renderFrame = () => {
      if (onFrameChange && videoRef.current) {
        onFrameChange(videoRef.current.currentTime, showSkeletonOverlay, showAngleOverlay);
      }
      animationFrameId = requestAnimationFrame(renderFrame);
    };

    animationFrameId = requestAnimationFrame(renderFrame);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, onFrameChange, showSkeletonOverlay, showAngleOverlay, canvasRef]);

  // Update canvas when overlays are toggled (even when paused)
  useEffect(() => {
    if (!isPlaying && videoRef.current && onFrameChange) {
      onFrameChange(currentTime, showSkeletonOverlay, showAngleOverlay);
    }
  }, [showSkeletonOverlay, showAngleOverlay]);

  const togglePlayPause = async (): Promise<void> => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
      } else {
        await video.play();
      }
    } catch (error) {
      console.error('Error playing video:', error);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>): void => {
    const video = videoRef.current;
    const timeline = timelineRef.current;
    if (!video || !timeline) return;

    const rect = timeline.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipBackward = (): void => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 2);
  };

  const skipForward = (): void => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(duration, video.currentTime + 2);
  };

  const jumpToIssue = (time: number): void => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="interactive-video">
      <div className="video-container">
        <video
          ref={videoRef}
          className="video-player"
          playsInline
          style={{ display: 'none' }}
        />

        {/* Canvas overlay for skeleton and angles */}
        {canvasRef && (
          <canvas
            ref={canvasRef}
            className="video-canvas"
          />
        )}

        {/* Overlay Controls Toggle */}
        <div className="overlay-toggles">
          <button
            className={`toggle-btn ${showSkeletonOverlay ? 'active' : ''}`}
            onClick={() => setShowSkeletonOverlay(!showSkeletonOverlay)}
            title="Toggle skeleton overlay"
          >
            Skeleton
          </button>
          <button
            className={`toggle-btn ${showAngleOverlay ? 'active' : ''}`}
            onClick={() => setShowAngleOverlay(!showAngleOverlay)}
            title="Toggle angle measurements"
          >
            Angles
          </button>
        </div>
      </div>

      {/* Video Controls */}
      <div className="video-controls">
        <div className="control-buttons">
          <button onClick={skipBackward} className="control-btn" title="Back 2s">
            Back
          </button>
          <button onClick={togglePlayPause} className="control-btn play-btn">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={skipForward} className="control-btn" title="Forward 2s">
            Forward
          </button>
          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Timeline with Issue Markers */}
        <div className="timeline-container">
          <div
            ref={timelineRef}
            className="timeline"
            onClick={handleSeek}
          >
            <div
              className="timeline-progress"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div
              className="timeline-scrubber"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />

            {/* Issue Markers */}
            {issueMarkers.map((marker, index) => (
              <div
                key={index}
                className={`issue-marker ${marker.severity}`}
                style={{ left: `${(marker.time / duration) * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToIssue(marker.time);
                }}
                title={`${marker.area}: ${marker.message}`}
              >
                <div className="marker-tooltip">
                  <strong>{marker.area}</strong>
                  <p>{marker.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issue List */}
      {issueMarkers.length > 0 && (
        <div className="issue-list">
          <h5>Issues Timeline</h5>
          <div className="issue-items">
            {issueMarkers.map((marker, index) => (
              <div
                key={index}
                className={`issue-item ${marker.severity}`}
                onClick={() => jumpToIssue(marker.time)}
              >
                <span className="issue-time">{formatTime(marker.time)}</span>
                <span className="issue-area">{marker.area}</span>
                <span className="issue-desc">{marker.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveVideo;
