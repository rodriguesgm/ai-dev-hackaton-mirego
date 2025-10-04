import { useEffect, useRef, useState } from 'react';
import { initializePoseDetector, detectPose } from '../utils/poseDetection';
import { analyzeRunningForm } from '../utils/runningAnalysis';
import { drawSkeleton, drawRunningAngles, createAngleGauge, interpolatePose } from '../utils/skeletonDrawing';
import { calculateDetailedMetrics, calculateAsymmetry, createFrameData } from '../utils/detailedMetrics';
import { enhanceRunningRecommendations, getSeverityDisplay } from '../utils/enhancedRecommendations';
import DetailedMetrics from './DetailedMetrics';
import InteractiveVideo from './InteractiveVideo';
import './RunningFormAnalysis.css';
import type {
  RunningFormAnalysis as RunningFormAnalysisType,
  Pose,
  AngleGauge,
  DetailedMetrics as DetailedMetricsType,
  Asymmetry,
  FrameData,
  Recommendation,
  IssueMarker,
  FrameAnalysis
} from '../types';

interface RunningFormAnalysisProps {
  videoFile: File;
}

interface OverallMessage {
  text: string;
  color: string;
}

function RunningFormAnalysis({ videoFile }: RunningFormAnalysisProps) {
  const [analysis, setAnalysis] = useState<RunningFormAnalysisType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [lastPose, setLastPose] = useState<Pose | null>(null);
  const [angleGauges, setAngleGauges] = useState<AngleGauge[]>([]);
  const [detailedMetrics, setDetailedMetrics] = useState<DetailedMetricsType | null>(null);
  const [asymmetry, setAsymmetry] = useState<Asymmetry | null>(null);
  const [frameData, setFrameData] = useState<FrameData[]>([]);
  const [enhancedRecs, setEnhancedRecs] = useState<Recommendation[]>([]);
  const [issueMarkers, setIssueMarkers] = useState<IssueMarker[]>([]);
  const [allFramePoses, setAllFramePoses] = useState<FrameAnalysis[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoFile) {
      analyzeVideo();
    }
  }, [videoFile]);

  const analyzeVideo = async (): Promise<void> => {
    setIsAnalyzing(true);
    setError('');
    setProgress(0);

    try {
      // Initialize pose detector
      setProgress(10);
      await initializePoseDetector();
      setProgress(20);

      const video = videoRef.current;
      if (!video) return;

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

      // Analyze multiple frames for running gait
      const framesToAnalyze = 24; // Increased for smoother skeleton overlay
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
            const runningAnalysis = analyzeRunningForm(pose);
            if (runningAnalysis) {
              allAnalyses.push({ analysis: runningAnalysis, pose });
            }
          }
        } catch (frameError) {
          console.warn('Frame analysis failed:', frameError);
        }

        setProgress(30 + (i / framesToAnalyze) * 60);
      }

      // Average the results
      if (allAnalyses.length > 0) {
        const analyses = allAnalyses.map(a => a.analysis);
        const avgAnalysis = combineAnalyses(analyses);
        setAnalysis(avgAnalysis);

        // Store last pose for skeleton drawing
        const lastFrame = allAnalyses[allAnalyses.length - 1];
        setLastPose(lastFrame.pose);

        // Draw skeleton on canvas
        if (canvasRef.current && videoRef.current) {
          drawPoseOnCanvas(lastFrame.analysis, lastFrame.pose);
        }

        // Create angle gauges
        const gauges: AngleGauge[] = [];
        if (avgAnalysis.angles.bodyLean !== undefined) {
          gauges.push(createAngleGauge(avgAnalysis.angles.bodyLean, 5, 12, 'Body Lean'));
        }
        if (avgAnalysis.angles.kneeLift !== undefined) {
          gauges.push(createAngleGauge(avgAnalysis.angles.kneeLift, 100, 140, 'Knee Lift'));
        }
        if (avgAnalysis.angles.hipExtension !== undefined) {
          gauges.push(createAngleGauge(avgAnalysis.angles.hipExtension, 160, 180, 'Hip Extension'));
        }
        if (avgAnalysis.angles.armSwing !== undefined) {
          gauges.push(createAngleGauge(avgAnalysis.angles.armSwing, 80, 110, 'Arm Swing'));
        }
        setAngleGauges(gauges);

        // Calculate detailed metrics
        const metrics = calculateDetailedMetrics(analyses);
        setDetailedMetrics(metrics);

        // Calculate asymmetry (left vs right)
        const asymData = calculateAsymmetry(analyses);
        setAsymmetry(asymData);

        // Create frame data for charts
        const frames = createFrameData(analyses);
        setFrameData(frames);

        // Enhance recommendations with severity and drills
        const enhanced = enhanceRunningRecommendations(avgAnalysis);
        setEnhancedRecs(enhanced);

        // Store frame poses for interactive playback
        setAllFramePoses(allAnalyses);

        // Create issue markers from critical/high severity recommendations
        const markers: IssueMarker[] = enhanced
          .filter(rec => rec.severity === 'critical' || rec.severity === 'moderate')
          .map((rec, index) => ({
            time: (index + 1) * interval, // Approximate time for each issue
            area: rec.area,
            message: rec.message,
            severity: rec.severity!,
          }));
        setIssueMarkers(markers);
      } else {
        setError('Could not detect runner in video. Please ensure the full body is visible from the side.');
      }

      setProgress(100);
      URL.revokeObjectURL(videoUrl);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze video. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const combineAnalyses = (analyses: RunningFormAnalysisType[]): RunningFormAnalysisType => {
    // Average angles
    const avgAngles = {
      bodyLean: 0,
      kneeLift: 0,
      hipExtension: 0,
      armSwing: 0,
    };

    const counts = { bodyLean: 0, kneeLift: 0, hipExtension: 0, armSwing: 0 };

    analyses.forEach(analysis => {
      (Object.keys(analysis.angles) as Array<keyof typeof avgAngles>).forEach(key => {
        if (analysis.angles[key]) {
          avgAngles[key] += analysis.angles[key]!;
          counts[key]++;
        }
      });
    });

    (Object.keys(avgAngles) as Array<keyof typeof avgAngles>).forEach(key => {
      if (counts[key] > 0) {
        avgAngles[key] = Math.round(avgAngles[key] / counts[key]);
      }
    });

    // Use the last analysis as base and update with averaged angles
    const combined: RunningFormAnalysisType = { ...analyses[analyses.length - 1] };
    combined.angles = avgAngles;

    return combined;
  };

  const drawPoseOnCanvas = (analysis: RunningFormAnalysisType, pose: Pose): void => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw skeleton overlay
    drawSkeleton(ctx, pose, canvas.width, canvas.height);

    // Draw angle measurements
    drawRunningAngles(ctx, pose, analysis);
  };

  const handleFrameChange = async (currentTime: number, showSkeleton: boolean, showAngles: boolean): Promise<void> => {
    // Update the interactive canvas
    if (!videoRef.current || !interactiveCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = interactiveCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match video (only on first draw or size change)
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Always draw the current video frame
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

      // Try real-time pose detection for smoother results
      let currentPose: Pose | null = null;
      let currentAnalysis: RunningFormAnalysisType | null = null;

      try {
        // Real-time detection (non-blocking, will use cached if too slow)
        const detectedPose = await Promise.race([
          detectPose(video),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 50)) // 50ms timeout
        ]);

        if (detectedPose && detectedPose.score > 0.3) {
          currentPose = detectedPose;
          currentAnalysis = analyzeRunningForm(detectedPose);
        }
      } catch (error) {
        // Fall back to cached poses on error
        console.debug('Real-time detection skipped, using cached poses');
      }

      // Fallback to interpolated poses if real-time detection failed
      if (!currentPose && allFramePoses[frameIndex] && allFramePoses[nextFrameIndex]) {
        const pose1 = allFramePoses[frameIndex].pose;
        const pose2 = allFramePoses[nextFrameIndex].pose;
        currentPose = interpolatePose(pose1, pose2, interpolationFactor);
        currentAnalysis = allFramePoses[frameIndex].analysis as RunningFormAnalysisType;
      }

      // Draw overlays based on toggles
      if (currentPose) {
        if (showSkeleton) {
          drawSkeleton(ctx, currentPose, canvas.width, canvas.height);
        }
        if (showAngles && currentAnalysis) {
          drawRunningAngles(ctx, currentPose, currentAnalysis);
        }
      }
    }
  };

  const getStatusColor = (type: string): string => {
    switch (type) {
      case 'success': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#757575';
    }
  };

  const getOverallMessage = (overall: string): OverallMessage => {
    switch (overall) {
      case 'excellent':
        return { text: 'Excellent running form!', color: '#4caf50' };
      case 'good':
        return { text: 'Good running form with minor improvements', color: '#2196f3' };
      case 'needs-improvement':
        return { text: 'Several areas for improvement identified', color: '#ff9800' };
      default:
        return { text: 'Analysis complete', color: '#757575' };
    }
  };

  return (
    <div className="running-form-analysis">
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {isAnalyzing && (
        <div className="analyzing">
          <div className="loader"></div>
          <p>Analyzing running form...</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">{Math.round(progress)}%</p>
        </div>
      )}

      {error && <div className="analysis-error">{error}</div>}

      {analysis && !isAnalyzing && (
        <div className="analysis-results">
          <h3>Running Form Analysis Results</h3>

          <div className="overall-status" style={{ borderColor: getOverallMessage(analysis.overall).color }}>
            <h4 style={{ color: getOverallMessage(analysis.overall).color }}>
              {getOverallMessage(analysis.overall).text}
            </h4>
          </div>

          {/* Interactive Video Player */}
          <InteractiveVideo
            videoFile={videoFile}
            onFrameChange={handleFrameChange}
            issueMarkers={issueMarkers}
            showSkeleton={true}
            showAngles={true}
            canvasRef={interactiveCanvasRef}
            videoRef={videoRef}
          />

          {lastPose && canvasRef.current && (
            <div className="skeleton-visualization">
              <h4>Visual Analysis</h4>
              <div className="skeleton-image">
                <img
                  src={canvasRef.current.toDataURL()}
                  alt="Pose analysis with skeleton overlay"
                  style={{ width: '100%', borderRadius: '8px' }}
                />
              </div>
            </div>
          )}

          {angleGauges.length > 0 && (
            <div className="angle-gauges-section">
              <h4>Angle Ranges</h4>
              <div className="gauges-grid">
                {angleGauges.map((gauge, index) => (
                  <div key={index} className="gauge-card">
                    <div className="gauge-label">{gauge.label}</div>
                    <div className="gauge-value">{gauge.angle}°</div>
                    <div className="gauge-bar">
                      <div
                        className={`gauge-fill ${gauge.status}`}
                        style={{ width: `${gauge.percentage}%` }}
                      ></div>
                    </div>
                    <div className="gauge-range">
                      {gauge.minOptimal}° - {gauge.maxOptimal}°
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="angles-section">
            <h4>Measured Metrics</h4>
            <div className="angles-grid">
              {analysis.angles.bodyLean !== undefined && (
                <div className="angle-card">
                  <span className="angle-label">Body Lean</span>
                  <span className="angle-value">{analysis.angles.bodyLean}°</span>
                </div>
              )}
              {analysis.angles.kneeLift !== undefined && (
                <div className="angle-card">
                  <span className="angle-label">Knee Lift</span>
                  <span className="angle-value">{analysis.angles.kneeLift}°</span>
                </div>
              )}
              {analysis.angles.hipExtension !== undefined && (
                <div className="angle-card">
                  <span className="angle-label">Hip Extension</span>
                  <span className="angle-value">{analysis.angles.hipExtension}°</span>
                </div>
              )}
              {analysis.angles.armSwing !== undefined && (
                <div className="angle-card">
                  <span className="angle-label">Arm Swing</span>
                  <span className="angle-value">{analysis.angles.armSwing}°</span>
                </div>
              )}
            </div>
          </div>

          {enhancedRecs && enhancedRecs.length > 0 && (
            <div className="recommendations-section">
              <h4>Recommendations</h4>
              <div className="recommendations-list">
                {enhancedRecs.map((rec, index) => {
                  const severityInfo = getSeverityDisplay(rec.severity);
                  return (
                    <div
                      key={index}
                      className="recommendation-card enhanced"
                      style={{
                        borderLeftColor: severityInfo.color,
                        backgroundColor: severityInfo.bgColor,
                      }}
                    >
                      <div className="rec-header">
                        <div className="rec-header-left">
                          <span className="rec-area">{rec.area}</span>
                          {rec.angle && <span className="rec-angle">{rec.angle}°</span>}
                        </div>
                        <span
                          className="severity-badge"
                          style={{
                            backgroundColor: severityInfo.color,
                            color: 'white',
                          }}
                        >
                          {severityInfo.icon} {severityInfo.label}
                        </span>
                      </div>
                      <p className="rec-message">{rec.message}</p>
                      {rec.impact && (
                        <p className="rec-impact">
                          <strong>Impact:</strong> {rec.impact}
                        </p>
                      )}
                      {rec.drills && rec.drills.length > 0 && (
                        <div className="rec-drills">
                          <strong>Recommended Drills:</strong>
                          <ul>
                            {rec.drills.map((drill, idx) => (
                              <li key={idx}>{drill}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DetailedMetrics
            metrics={detailedMetrics}
            asymmetry={asymmetry}
            frameData={frameData}
          />

          <div className="analysis-note">
            <p><strong>Note:</strong> This is an automated analysis based on video snapshots. For comprehensive gait analysis, consult a running coach or sports medicine professional.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunningFormAnalysis;
