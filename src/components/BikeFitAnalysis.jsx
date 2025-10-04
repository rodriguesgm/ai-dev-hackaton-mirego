import { useEffect, useRef, useState } from 'react';
import { initializePoseDetector, detectPose, analyzeBikeFit } from '../utils/poseDetection';
import { drawSkeleton, drawBikeFitAngles, createAngleGauge } from '../utils/skeletonDrawing';
import { calculateDetailedMetrics, calculateAsymmetry, createFrameData } from '../utils/detailedMetrics';
import { enhanceBikeFitRecommendations, getSeverityDisplay } from '../utils/enhancedRecommendations';
import DetailedMetrics from './DetailedMetrics';
import InteractiveVideo from './InteractiveVideo';
import './BikeFitAnalysis.css';

function BikeFitAnalysis({ videoFile }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [lastPose, setLastPose] = useState(null);
  const [angleGauges, setAngleGauges] = useState([]);
  const [detailedMetrics, setDetailedMetrics] = useState(null);
  const [asymmetry, setAsymmetry] = useState(null);
  const [frameData, setFrameData] = useState([]);
  const [enhancedRecs, setEnhancedRecs] = useState([]);
  const [issueMarkers, setIssueMarkers] = useState([]);
  const [allFramePoses, setAllFramePoses] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const interactiveCanvasRef = useRef(null);

  useEffect(() => {
    if (videoFile) {
      analyzeVideo();
    }
  }, [videoFile]);

  const analyzeVideo = async () => {
    setIsAnalyzing(true);
    setError('');
    setProgress(0);

    try {
      // Initialize pose detector
      setProgress(10);
      await initializePoseDetector();
      setProgress(20);

      const video = videoRef.current;
      const videoUrl = URL.createObjectURL(videoFile);

      // Load video and wait for metadata
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        video.src = videoUrl;
      });

      // Check video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Video dimensions not available');
      }

      // Seek to middle of video and wait
      video.currentTime = video.duration / 2;
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });

      setProgress(30);

      // Analyze multiple frames with better timing
      const framesToAnalyze = 8; // Reduced for better performance
      const interval = video.duration / (framesToAnalyze + 1);
      const allAnalyses = [];

      for (let i = 1; i <= framesToAnalyze; i++) {
        const targetTime = i * interval;

        // Seek and wait for the frame to be ready
        await new Promise((resolve) => {
          video.onseeked = resolve;
          video.currentTime = targetTime;
        });

        // Small delay to ensure frame is rendered
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          const pose = await detectPose(video);
          if (pose && pose.score > 0.3) {
            const bikeFitAnalysis = analyzeBikeFit(pose);
            if (bikeFitAnalysis) {
              allAnalyses.push({ analysis: bikeFitAnalysis, pose });
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
        const gauges = [];
        if (avgAnalysis.angles.knee) {
          gauges.push(createAngleGauge(avgAnalysis.angles.knee, 140, 160, 'Knee Angle'));
        }
        if (avgAnalysis.angles.hip) {
          gauges.push(createAngleGauge(avgAnalysis.angles.hip, 40, 70, 'Hip Angle'));
        }
        if (avgAnalysis.angles.elbow) {
          gauges.push(createAngleGauge(avgAnalysis.angles.elbow, 140, 170, 'Elbow Angle'));
        }
        setAngleGauges(gauges);

        // Calculate detailed metrics
        const metrics = calculateDetailedMetrics(analyses);
        setDetailedMetrics(metrics);

        // Calculate asymmetry (if sides data available)
        const asymData = calculateAsymmetry(analyses);
        setAsymmetry(asymData);

        // Create frame data for charts
        const frames = createFrameData(analyses);
        setFrameData(frames);

        // Enhance recommendations with severity and drills
        const enhanced = enhanceBikeFitRecommendations(avgAnalysis);
        setEnhancedRecs(enhanced);

        // Store frame poses for interactive playback
        setAllFramePoses(allAnalyses);

        // Create issue markers from critical/high severity recommendations
        const markers = enhanced
          .filter(rec => rec.severity === 'critical' || rec.severity === 'moderate')
          .map((rec, index) => ({
            time: (index + 1) * interval, // Approximate time for each issue
            area: rec.area,
            message: rec.message,
            severity: rec.severity,
          }));
        setIssueMarkers(markers);
      } else {
        setError('Could not detect rider in video. Please ensure the full body is visible from the side.');
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

  const combineAnalyses = (analyses) => {
    // Average angles
    const avgAngles = {
      knee: 0,
      hip: 0,
      back: 0,
      elbow: 0,
    };

    let counts = { knee: 0, hip: 0, back: 0, elbow: 0 };

    analyses.forEach(analysis => {
      Object.keys(analysis.angles).forEach(key => {
        if (analysis.angles[key]) {
          avgAngles[key] += analysis.angles[key];
          counts[key]++;
        }
      });
    });

    Object.keys(avgAngles).forEach(key => {
      if (counts[key] > 0) {
        avgAngles[key] = Math.round(avgAngles[key] / counts[key]);
      }
    });

    // Use the last analysis as base and update with averaged angles
    const combined = { ...analyses[analyses.length - 1] };
    combined.angles = avgAngles;

    return combined;
  };

  const drawPoseOnCanvas = (analysis, pose) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw skeleton overlay
    drawSkeleton(ctx, pose, canvas.width, canvas.height);

    // Draw angle measurements
    drawBikeFitAngles(ctx, pose, analysis);
  };

  const handleFrameChange = async (currentTime, showSkeleton, showAngles) => {
    // Update the interactive canvas
    if (!videoRef.current || !interactiveCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = interactiveCanvasRef.current;
    const ctx = canvas.getContext('2d');

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

    // Draw overlays if we have analyzed pose data
    if (allFramePoses.length > 0) {
      const frameIndex = Math.min(
        Math.floor((currentTime / video.duration) * allFramePoses.length),
        allFramePoses.length - 1
      );

      if (allFramePoses[frameIndex]) {
        const { analysis, pose } = allFramePoses[frameIndex];

        // Draw overlays based on toggles
        if (showSkeleton) {
          drawSkeleton(ctx, pose, canvas.width, canvas.height);
        }
        if (showAngles) {
          drawBikeFitAngles(ctx, pose, analysis);
        }
      }
    }
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#757575';
    }
  };

  const getOverallMessage = (overall) => {
    switch (overall) {
      case 'excellent':
        return { text: 'Excellent bike fit! 🎉', color: '#4caf50' };
      case 'good':
        return { text: 'Good bike fit with minor adjustments needed', color: '#2196f3' };
      case 'needs-adjustment':
        return { text: 'Several adjustments recommended', color: '#ff9800' };
      default:
        return { text: 'Analysis complete', color: '#757575' };
    }
  };

  return (
    <div className="bike-fit-analysis">
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} className="skeleton-canvas" />

      {isAnalyzing && (
        <div className="analyzing">
          <div className="loader"></div>
          <p>Analyzing bike fit...</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">{Math.round(progress)}%</p>
        </div>
      )}

      {error && <div className="analysis-error">{error}</div>}

      {analysis && !isAnalyzing && (
        <div className="analysis-results">
          <h3>Bike Fit Analysis Results</h3>

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
            <h4>Measured Angles</h4>
            <div className="angles-grid">
              {analysis.angles.knee && (
                <div className="angle-card">
                  <span className="angle-label">Knee Angle</span>
                  <span className="angle-value">{analysis.angles.knee}°</span>
                </div>
              )}
              {analysis.angles.hip && (
                <div className="angle-card">
                  <span className="angle-label">Hip Angle</span>
                  <span className="angle-value">{analysis.angles.hip}°</span>
                </div>
              )}
              {analysis.angles.back && (
                <div className="angle-card">
                  <span className="angle-label">Back Angle</span>
                  <span className="angle-value">{analysis.angles.back}°</span>
                </div>
              )}
              {analysis.angles.elbow && (
                <div className="angle-card">
                  <span className="angle-label">Elbow Angle</span>
                  <span className="angle-value">{analysis.angles.elbow}°</span>
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
                          <strong>Recommended Actions:</strong>
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
            <p><strong>Note:</strong> This is an automated analysis. For professional bike fitting, consult a certified bike fitter.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BikeFitAnalysis;
