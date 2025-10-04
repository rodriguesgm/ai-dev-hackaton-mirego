import type { AngleData, IssueMarker, Recommendation } from '../types';

/**
 * Generic function to combine multiple analyses by averaging angle values
 */
export function combineAnalyses<T extends { angles: AngleData }>(analyses: T[]): T {
  if (analyses.length === 0) {
    throw new Error('No analyses to combine');
  }

  const avgAngles: AngleData = {};
  const counts: Record<string, number> = {};

  // Sum up all angle values
  analyses.forEach(analysis => {
    Object.keys(analysis.angles).forEach(key => {
      const value = analysis.angles[key as keyof AngleData];
      if (value !== undefined) {
        avgAngles[key as keyof AngleData] = (avgAngles[key as keyof AngleData] || 0) + value;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  });

  // Calculate averages
  Object.keys(avgAngles).forEach(key => {
    const typedKey = key as keyof AngleData;
    if (counts[key] > 0 && avgAngles[typedKey] !== undefined) {
      avgAngles[typedKey] = Math.round(avgAngles[typedKey]! / counts[key]);
    }
  });

  // Use the last analysis as base and update with averaged angles
  const combined: T = { ...analyses[analyses.length - 1] };
  combined.angles = avgAngles;

  return combined;
}

/**
 * Create issue markers from recommendations based on severity
 */
export function createIssueMarkers(
  recommendations: Recommendation[],
  videoDuration: number,
  framesToAnalyze: number
): IssueMarker[] {
  const interval = videoDuration / (framesToAnalyze + 1);

  return recommendations
    .filter(rec => rec.severity === 'critical' || rec.severity === 'moderate')
    .map((rec, index) => ({
      time: (index + 1) * interval,
      area: rec.area,
      message: rec.message,
      severity: rec.severity!,
    }));
}

/**
 * Get status color for recommendation type
 */
export function getStatusColor(type: string): string {
  switch (type) {
    case 'success': return '#4caf50';
    case 'warning': return '#ff9800';
    case 'info': return '#2196f3';
    default: return '#757575';
  }
}

interface OverallMessage {
  text: string;
  color: string;
}

/**
 * Get overall message for bike fit analysis
 */
export function getBikeFitOverallMessage(overall: string): OverallMessage {
  switch (overall) {
    case 'excellent':
      return { text: 'Excellent bike fit!', color: '#4caf50' };
    case 'good':
      return { text: 'Good bike fit with minor adjustments needed', color: '#2196f3' };
    case 'needs-adjustment':
      return { text: 'Several adjustments recommended', color: '#ff9800' };
    default:
      return { text: 'Analysis complete', color: '#757575' };
  }
}

/**
 * Get overall message for running form analysis
 */
export function getRunningFormOverallMessage(overall: string): OverallMessage {
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
}

/**
 * Draw pose on static canvas (for snapshot visualization)
 */
export function drawPoseOnCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  pose: any,
  drawSkeletonFn: (ctx: CanvasRenderingContext2D, pose: any, width: number, height: number) => void,
  drawAnglesFn: (ctx: CanvasRenderingContext2D, pose: any, analysis: any) => void,
  analysis: any
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw video frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Draw skeleton overlay
  drawSkeletonFn(ctx, pose, canvas.width, canvas.height);

  // Draw angle measurements
  drawAnglesFn(ctx, pose, analysis);
}
