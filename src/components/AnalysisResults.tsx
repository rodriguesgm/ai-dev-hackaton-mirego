import { RefObject } from 'react';
import InteractiveVideo from './InteractiveVideo';
import DetailedMetrics from './DetailedMetrics';
import { getSeverityDisplay } from '../utils/enhancedRecommendations';
import type {
  AngleGauge,
  DetailedMetrics as DetailedMetricsType,
  Asymmetry,
  FrameData,
  Recommendation,
  IssueMarker,
  AngleData,
  AnalysisSummary
} from '../types';

interface AnalysisResultsProps {
  // Analysis data
  overallMessage: { text: string; color: string };
  angles: AngleData;
  angleGauges: AngleGauge[];
  recommendations: Recommendation[];
  detailedMetrics: DetailedMetricsType | null;
  asymmetry: Asymmetry | null;
  frameData: FrameData[];
  summary: AnalysisSummary;

  // Video & rendering
  videoFile: File;
  issueMarkers: IssueMarker[];
  canvasRef: RefObject<HTMLCanvasElement>;
  videoRef: RefObject<HTMLVideoElement>;
  onFrameChange: (currentTime: number, showSkeleton: boolean, showAngles: boolean) => Promise<void>;

  // Display config
  title: string;
  noteText: string;
  angleLabels: Array<{ key: keyof AngleData; label: string }>;
}

/**
 * Generic component for displaying sports analysis results
 * Handles visualization, metrics, and recommendations
 */
function AnalysisResults({
  overallMessage,
  angles,
  angleGauges,
  recommendations,
  detailedMetrics,
  asymmetry,
  frameData,
  summary,
  videoFile,
  issueMarkers,
  canvasRef,
  videoRef,
  onFrameChange,
  title,
  noteText,
  angleLabels,
}: AnalysisResultsProps) {
  return (
    <div className="analysis-results">
      <h3>{title}</h3>

      {/* Performance Summary */}
      <div className="performance-summary">
        <div className="summary-headline">
          <h4>📊 Performance Summary</h4>
          <p className="headline-text">{summary.headline}</p>
        </div>

        <div className="summary-grid">
          <div className="summary-card strengths">
            <h5>✅ What You're Doing Well</h5>
            <ul>
              {summary.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>

          <div className="summary-card improvements">
            <h5>🎯 Areas to Improve</h5>
            <ul>
              {summary.improvements.map((improvement, idx) => (
                <li key={idx}>{improvement}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="top-priority">
          <strong>🔥 Top Priority:</strong> {summary.topPriority}
        </div>
      </div>

      <div className="overall-status" style={{ borderColor: overallMessage.color }}>
        <h4 style={{ color: overallMessage.color }}>
          {overallMessage.text}
        </h4>
      </div>

      {/* Interactive Video Player */}
      <InteractiveVideo
        videoFile={videoFile}
        onFrameChange={onFrameChange}
        issueMarkers={issueMarkers}
        showSkeleton={true}
        showAngles={true}
        canvasRef={canvasRef}
        videoRef={videoRef}
      />

      {canvasRef.current && (
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
          {angleLabels.map(({ key, label }) =>
            angles[key] !== undefined ? (
              <div key={key} className="angle-card">
                <span className="angle-label">{label}</span>
                <span className="angle-value">{angles[key]}°</span>
              </div>
            ) : null
          )}
        </div>
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>Recommendations</h4>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => {
              const severityInfo = getSeverityDisplay(rec.severity!);
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
        <p><strong>Note:</strong> {noteText}</p>
      </div>
    </div>
  );
}

export default AnalysisResults;
