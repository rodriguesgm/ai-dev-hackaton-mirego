import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import type { Pose, Keypoint, BikeFitAnalysis, Recommendation } from '../types';

let detector: poseDetection.PoseDetector | null = null;

// Initialize the pose detector
export async function initializePoseDetector(): Promise<poseDetection.PoseDetector> {
  if (detector) return detector;

  const detectorConfig: poseDetection.MoveNetModelConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  };

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig
  );

  return detector;
}

// Get pose from video element
export async function detectPose(videoElement: HTMLVideoElement): Promise<Pose | null> {
  if (!detector) {
    await initializePoseDetector();
  }

  const poses = await detector!.estimatePoses(videoElement);
  return poses.length > 0 ? (poses[0] as Pose) : null;
}

// Calculate angle between three points
export function calculateAngle(pointA: Keypoint, pointB: Keypoint, pointC: Keypoint): number {
  const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
                  Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return angle;
}

// Get keypoint by name
function getKeypoint(pose: Pose, name: string): Keypoint | undefined {
  return pose.keypoints.find((kp) => kp.name === name);
}

// Analyze bike fit from pose
export function analyzeBikeFit(pose: Pose): BikeFitAnalysis | null {
  if (!pose || !pose.keypoints) return null;

  const leftShoulder = getKeypoint(pose, 'left_shoulder');
  const rightShoulder = getKeypoint(pose, 'right_shoulder');
  const leftHip = getKeypoint(pose, 'left_hip');
  const rightHip = getKeypoint(pose, 'right_hip');
  const leftKnee = getKeypoint(pose, 'left_knee');
  const rightKnee = getKeypoint(pose, 'right_knee');
  const leftAnkle = getKeypoint(pose, 'left_ankle');
  const rightAnkle = getKeypoint(pose, 'right_ankle');
  const leftElbow = getKeypoint(pose, 'left_elbow');
  const rightElbow = getKeypoint(pose, 'right_elbow');
  const leftWrist = getKeypoint(pose, 'left_wrist');
  const rightWrist = getKeypoint(pose, 'right_wrist');

  // Use the side with higher confidence
  const useLeftSide = (leftKnee?.score || 0) > (rightKnee?.score || 0);

  const shoulder = useLeftSide ? leftShoulder : rightShoulder;
  const hip = useLeftSide ? leftHip : rightHip;
  const knee = useLeftSide ? leftKnee : rightKnee;
  const ankle = useLeftSide ? leftAnkle : rightAnkle;
  const elbow = useLeftSide ? leftElbow : rightElbow;
  const wrist = useLeftSide ? leftWrist : rightWrist;

  const results: BikeFitAnalysis = {
    angles: {},
    recommendations: [],
    overall: 'good',
  };

  // Calculate knee angle (hip-knee-ankle)
  if (hip && knee && ankle && hip.score! > 0.3 && knee.score! > 0.3 && ankle.score! > 0.3) {
    const kneeAngle = calculateAngle(hip, knee, ankle);
    results.angles.knee = Math.round(kneeAngle);

    // Optimal knee angle at bottom of pedal stroke: 25-35 degrees
    // During pedaling it varies, but should not be too straight (>170) or too bent (<90)
    if (kneeAngle > 170) {
      results.recommendations.push({
        type: 'warning',
        area: 'Saddle Height',
        message: 'Saddle may be too high - knee is too straight',
        angle: results.angles.knee,
      });
    } else if (kneeAngle < 90) {
      results.recommendations.push({
        type: 'warning',
        area: 'Saddle Height',
        message: 'Saddle may be too low - knee is too bent',
        angle: results.angles.knee,
      });
    } else if (kneeAngle >= 140 && kneeAngle <= 160) {
      results.recommendations.push({
        type: 'success',
        area: 'Saddle Height',
        message: 'Good knee extension',
        angle: results.angles.knee,
      });
    }
  }

  // Calculate hip angle (shoulder-hip-knee)
  if (shoulder && hip && knee && shoulder.score! > 0.3 && hip.score! > 0.3 && knee.score! > 0.3) {
    const hipAngle = calculateAngle(shoulder, hip, knee);
    results.angles.hip = Math.round(hipAngle);

    // Hip angle should be between 40-60 degrees for optimal power
    if (hipAngle < 40) {
      results.recommendations.push({
        type: 'warning',
        area: 'Hip Angle',
        message: 'Hip angle too closed - may need to raise handlebars or adjust saddle',
        angle: results.angles.hip,
      });
    } else if (hipAngle >= 40 && hipAngle <= 70) {
      results.recommendations.push({
        type: 'success',
        area: 'Hip Angle',
        message: 'Good hip angle for power transfer',
        angle: results.angles.hip,
      });
    }
  }

  // Calculate back angle (vertical line-shoulder-hip)
  if (shoulder && hip && shoulder.score! > 0.3 && hip.score! > 0.3) {
    // Create a vertical reference point
    const verticalPoint: Keypoint = { x: shoulder.x, y: shoulder.y - 100 };
    const backAngle = calculateAngle(verticalPoint, shoulder, hip);
    results.angles.back = Math.round(backAngle);

    // Back angle from vertical: 35-45 degrees is typical for road cycling
    if (backAngle < 30) {
      results.recommendations.push({
        type: 'info',
        area: 'Back Angle',
        message: 'Very upright position - good for comfort',
        angle: results.angles.back,
      });
    } else if (backAngle >= 35 && backAngle <= 50) {
      results.recommendations.push({
        type: 'success',
        area: 'Back Angle',
        message: 'Good aerodynamic position',
        angle: results.angles.back,
      });
    } else if (backAngle > 60) {
      results.recommendations.push({
        type: 'warning',
        area: 'Back Angle',
        message: 'Very aggressive position - ensure flexibility and comfort',
        angle: results.angles.back,
      });
    }
  }

  // Calculate elbow angle (shoulder-elbow-wrist)
  if (shoulder && elbow && wrist && shoulder.score! > 0.3 && elbow.score! > 0.3 && wrist.score! > 0.3) {
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
    results.angles.elbow = Math.round(elbowAngle);

    // Elbow should have slight bend (140-170 degrees)
    if (elbowAngle > 170) {
      results.recommendations.push({
        type: 'warning',
        area: 'Elbow Position',
        message: 'Arms too straight - add slight bend for comfort and shock absorption',
        angle: results.angles.elbow,
      });
    } else if (elbowAngle >= 140 && elbowAngle <= 170) {
      results.recommendations.push({
        type: 'success',
        area: 'Elbow Position',
        message: 'Good arm position with slight bend',
        angle: results.angles.elbow,
      });
    }
  }

  // Overall assessment
  const warningCount = results.recommendations.filter((r: Recommendation) => r.type === 'warning').length;
  const successCount = results.recommendations.filter((r: Recommendation) => r.type === 'success').length;

  if (warningCount === 0 && successCount >= 2) {
    results.overall = 'excellent';
  } else if (warningCount <= 1) {
    results.overall = 'good';
  } else {
    results.overall = 'needs-adjustment';
  }

  return results;
}
