import { useRef, useState } from 'react';
import { analyzeRunningForm } from '../utils/runningAnalysis';
import { drawSkeleton, drawRunningAngles, createAngleGauge } from '../utils/skeletonDrawing';
import { calculateDetailedMetrics, calculateAsymmetry, createFrameData } from '../utils/detailedMetrics';
import { enhanceRunningRecommendations } from '../utils/enhancedRecommendations';
import {
  combineAnalyses,
  createIssueMarkers,
  getRunningFormOverallMessage,
  drawPoseOnCanvas
} from '../utils/analysisHelpers';
import { generateDetailedSummary } from '../utils/analysisSummary';
import { useVideoAnalysis } from '../hooks/useVideoAnalysis';
import { useFrameRenderer } from '../hooks/useFrameRenderer';
import AnalysisResults from './AnalysisResults';
import AnalysisLoader from './AnalysisLoader';
import './RunningFormAnalysis.css';
import type {
  RunningFormAnalysis as RunningFormAnalysisType,
  AngleGauge,
  DetailedMetrics as DetailedMetricsType,
  Asymmetry,
  FrameData,
  Recommendation,
  IssueMarker,
  AnalysisSummary,
} from '../types';

interface RunningFormAnalysisProps {
  videoFile: File;
}

function RunningFormAnalysis({ videoFile }: RunningFormAnalysisProps) {
  const [angleGauges, setAngleGauges] = useState<AngleGauge[]>([]);
  const [detailedMetrics, setDetailedMetrics] = useState<DetailedMetricsType | null>(null);
  const [asymmetry, setAsymmetry] = useState<Asymmetry | null>(null);
  const [frameData, setFrameData] = useState<FrameData[]>([]);
  const [enhancedRecs, setEnhancedRecs] = useState<Recommendation[]>([]);
  const [issueMarkers, setIssueMarkers] = useState<IssueMarker[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);

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
  } = useVideoAnalysis<RunningFormAnalysisType>({
    videoFile,
    framesToAnalyze: 24,
    analyzeFunction: analyzeRunningForm,
    combineFunction: combineAnalyses,
    onComplete: (avgAnalysis, allAnalyses) => {
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

      // Calculate metrics
      const analyses = allAnalyses.map(a => a.analysis as RunningFormAnalysisType);
      const metrics = calculateDetailedMetrics(analyses);
      const asymmetryData = calculateAsymmetry(analyses);
      setDetailedMetrics(metrics);
      setAsymmetry(asymmetryData);
      setFrameData(createFrameData(analyses));

      // Enhance recommendations
      const enhanced = enhanceRunningRecommendations(avgAnalysis);
      setEnhancedRecs(enhanced);

      // Generate detailed summary
      const summaryData = generateDetailedSummary(
        enhanced,
        avgAnalysis.angles,
        metrics,
        asymmetryData,
        avgAnalysis.overall,
        'running'
      );
      setSummary(summaryData);

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
          drawRunningAngles,
          lastFrame.analysis
        );
      }
    },
  });

  // Use generic frame renderer hook
  const { handleFrameChange } = useFrameRenderer<RunningFormAnalysisType>({
    videoRef,
    canvasRef: interactiveCanvasRef,
    allFramePoses,
    analyzeFunction: analyzeRunningForm,
    drawSkeletonFunction: drawSkeleton,
    drawAnglesFunction: drawRunningAngles,
  });

  return (
    <div className="running-form-analysis">
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {isAnalyzing && (
        <AnalysisLoader progress={progress} message="Analyzing running form..." />
      )}

      {error && <div className="analysis-error">{error}</div>}

      {analysis && !isAnalyzing && summary && (
        <AnalysisResults
          overallMessage={getRunningFormOverallMessage(analysis.overall)}
          angles={analysis.angles}
          angleGauges={angleGauges}
          recommendations={enhancedRecs}
          detailedMetrics={detailedMetrics}
          asymmetry={asymmetry}
          frameData={frameData}
          summary={summary}
          videoFile={videoFile}
          issueMarkers={issueMarkers}
          canvasRef={interactiveCanvasRef}
          videoRef={videoRef}
          onFrameChange={handleFrameChange}
          title="Running Form Analysis Results"
          noteText="This is an automated analysis based on video snapshots. For comprehensive gait analysis, consult a running coach or sports medicine professional."
          angleLabels={[
            { key: 'bodyLean', label: 'Body Lean' },
            { key: 'kneeLift', label: 'Knee Lift' },
            { key: 'hipExtension', label: 'Hip Extension' },
            { key: 'armSwing', label: 'Arm Swing' },
          ]}
        />
      )}
    </div>
  );
}

export default RunningFormAnalysis;
