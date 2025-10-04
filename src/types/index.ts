// TensorFlow Pose Detection Types
export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface Pose {
  keypoints: Keypoint[];
  score: number;
}

// Analysis Types
export interface AngleData {
  knee?: number;
  hip?: number;
  back?: number;
  elbow?: number;
  bodyLean?: number;
  kneeLift?: number;
  hipExtension?: number;
  armSwing?: number;
}

export interface Recommendation {
  area: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  angle?: number;
  severity?: 'critical' | 'moderate' | 'minor';
  impact?: string;
  drills?: string[];
  priorityScore?: number;
}

export interface BikeFitAnalysis {
  angles: AngleData;
  recommendations: Recommendation[];
  overall: 'excellent' | 'good' | 'needs-adjustment';
}

export interface RunningFormAnalysis {
  angles: AngleData;
  recommendations: Recommendation[];
  overall: 'excellent' | 'good' | 'needs-improvement';
}

// Detailed Metrics Types
export interface MetricData {
  min: number;
  max: number;
  avg: number;
  stdDev: number;
  range: number;
  consistency: number;
  values: number[];
}

export interface DetailedMetrics {
  [key: string]: MetricData;
}

export interface AsymmetryData {
  left: number;
  right: number;
  difference: number;
  percentDiff: number;
  status: 'balanced' | 'minor' | 'significant';
}

export interface Asymmetry {
  [key: string]: AsymmetryData;
}

export interface FrameData {
  frame: number;
  [key: string]: number;
}

export interface ConsistencyRating {
  label: string;
  color: string;
}

export interface AsymmetryStatus {
  label: string;
  color: string;
  icon: string;
}

// Enhanced Recommendations Types
export type SeverityLevel = 'critical' | 'moderate' | 'minor';

export interface SeverityDisplay {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

// Interactive Video Types
export interface IssueMarker {
  time: number;
  area: string;
  message: string;
  severity: SeverityLevel;
}

// Gauge Types
export interface AngleGauge {
  label: string;
  angle: number;
  minOptimal: number;
  maxOptimal: number;
  percentage: number;
  status: 'good' | 'warning';
}

// Frame Analysis Types
export interface FrameAnalysis {
  analysis: BikeFitAnalysis | RunningFormAnalysis;
  pose: Pose;
}

// Sport Detection Types
export type SportType = 'cycling' | 'running' | null;

// Analysis Summary Types
export interface AnalysisSummary {
  headline: string;
  strengths: string[];
  improvements: string[];
  topPriority: string;
}
