import { useRef, useState } from 'react';
import { analyzeBikeFit } from '../utils/poseDetection';
import { drawSkeleton, drawBikeFitAngles, createAngleGauge } from '../utils/skeletonDrawing';
import { calculateDetailedMetrics, calculateAsymmetry, createFrameData } from '../utils/detailedMetrics';
import { enhanceBikeFitRecommendations } from '../utils/enhancedRecommendations';
import {
  combineAnalyses,
  createIssueMarkers,
  getBikeFitOverallMessage,
  drawPoseOnCanvas
} from '../utils/analysisHelpers';
import { useVideoAnalysis } from '../hooks/useVideoAnalysis';
import { useFrameRenderer } from '../hooks/useFrameRenderer';
import AnalysisResults from './AnalysisResults';
import AnalysisLoader from './AnalysisLoader';
import './BikeFitAnalysis.css';
import type {
  BikeFitAnalysis as BikeFitAnalysisType,
  AngleGauge,
  DetailedMetrics as DetailedMetricsType,
  Asymmetry,
  FrameData,
  Recommendation,
  IssueMarker,
} from '../types';

interface BikeFitAnalysisProps {
  videoFile: File;
}

function BikeFitAnalysis({ videoFile }: BikeFitAnalysisProps) {
  const [angleGauges, setAngleGauges] = useState<AngleGauge[]>([]);
  const [detailedMetrics, setDetailedMetrics] = useState<DetailedMetricsType | null>(null);
  const [asymmetry, setAsymmetry] = useState<Asymmetry | null>(null);
  const [frameData, setFrameData] = useState<FrameData[]>([]);
  const [enhancedRecs, setEnhancedRecs] = useState<Recommendation[]>([]);
  const [issueMarkers, setIssueMarkers] = useState<IssueMarker[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);

  // Use generic video analysis hook
  const {
    analysis,
    isAnalyzing,
    progress,
    error,
    allFramePoses,
    videoRef,
  } = useVideoAnalysis<BikeFitAnalysisType>({
    videoFile,
    framesToAnalyze: 24,
    analyzeFunction: analyzeBikeFit,
    combineFunction: combineAnalyses,
    onComplete: (avgAnalysis, allAnalyses) => {
      // Create angle gauges
      const gauges: AngleGauge[] = [];
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

      // Calculate metrics
      const analyses = allAnalyses.map(a => a.analysis as BikeFitAnalysisType);
      setDetailedMetrics(calculateDetailedMetrics(analyses));
      setAsymmetry(calculateAsymmetry(analyses));
      setFrameData(createFrameData(analyses));

      // Enhance recommendations
      const enhanced = enhanceBikeFitRecommendations(avgAnalysis);
      setEnhancedRecs(enhanced);

      // Create issue markers
      const duration = videoRef.current?.duration || 0;
      setIssueMarkers(createIssueMarkers(enhanced, duration, 24));

      // Draw skeleton on static canvas
      const lastFrame = allAnalyses[allAnalyses.length - 1];
      if (canvasRef.current && videoRef.current && lastFrame) {
        drawPoseOnCanvas(
          canvasRef.current,
          videoRef.current,
          lastFrame.pose,
          drawSkeleton,
          drawBikeFitAngles,
          lastFrame.analysis
        );
      }
    },
  });

  // Use generic frame renderer hook
  const { handleFrameChange } = useFrameRenderer<BikeFitAnalysisType>({
    videoRef,
    canvasRef: interactiveCanvasRef,
    allFramePoses,
    analyzeFunction: analyzeBikeFit,
    drawSkeletonFunction: drawSkeleton,
    drawAnglesFunction: drawBikeFitAngles,
  });

  return (
    <div className="bike-fit-analysis">
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} className="skeleton-canvas" />

      {isAnalyzing && (
        <AnalysisLoader progress={progress} message="Analyzing bike fit..." />
      )}

      {error && <div className="analysis-error">{error}</div>}

      {analysis && !isAnalyzing && (
        <AnalysisResults
          overallMessage={getBikeFitOverallMessage(analysis.overall)}
          angles={analysis.angles}
          angleGauges={angleGauges}
          recommendations={enhancedRecs}
          detailedMetrics={detailedMetrics}
          asymmetry={asymmetry}
          frameData={frameData}
          videoFile={videoFile}
          issueMarkers={issueMarkers}
          canvasRef={interactiveCanvasRef}
          videoRef={videoRef}
          onFrameChange={handleFrameChange}
          title="Bike Fit Analysis Results"
          noteText="This is an automated analysis. For professional bike fitting, consult a certified bike fitter."
          angleLabels={[
            { key: 'knee', label: 'Knee Angle' },
            { key: 'hip', label: 'Hip Angle' },
            { key: 'back', label: 'Back Angle' },
            { key: 'elbow', label: 'Elbow Angle' },
          ]}
        />
      )}
    </div>
  );
}

export default BikeFitAnalysis;
