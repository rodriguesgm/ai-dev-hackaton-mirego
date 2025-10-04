import { calculateAngle } from './poseDetection';

// Get keypoint by name
function getKeypoint(pose, name) {
  return pose.keypoints.find(kp => kp.name === name);
}

// Analyze running form from pose
export function analyzeRunningForm(pose) {
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

  // Analyze both sides
  const results = {
    angles: {},
    recommendations: [],
    confidence: pose.score || 0,
    sides: {
      left: {},
      right: {}
    }
  };

  // Analyze Left Side
  if (leftShoulder && leftHip && leftKnee &&
      leftShoulder.score > 0.3 && leftHip.score > 0.3 && leftKnee.score > 0.3) {

    // Left knee angle (hip-knee-ankle)
    if (leftAnkle && leftAnkle.score > 0.3) {
      const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      results.sides.left.kneeAngle = Math.round(leftKneeAngle);
    }

    // Left hip angle (shoulder-hip-knee)
    const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
    results.sides.left.hipAngle = Math.round(leftHipAngle);
  }

  // Analyze Right Side
  if (rightShoulder && rightHip && rightKnee &&
      rightShoulder.score > 0.3 && rightHip.score > 0.3 && rightKnee.score > 0.3) {

    // Right knee angle (hip-knee-ankle)
    if (rightAnkle && rightAnkle.score > 0.3) {
      const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
      results.sides.right.kneeAngle = Math.round(rightKneeAngle);
    }

    // Right hip angle (shoulder-hip-knee)
    const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
    results.sides.right.hipAngle = Math.round(rightHipAngle);
  }

  // Analyze Posture (body lean)
  if (leftShoulder && rightShoulder && leftHip && rightHip &&
      leftShoulder.score > 0.3 && rightShoulder.score > 0.3 &&
      leftHip.score > 0.3 && rightHip.score > 0.3) {

    // Average shoulder and hip positions
    const avgShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const avgHip = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    // Calculate body lean from vertical
    const verticalPoint = { x: avgShoulder.x, y: avgShoulder.y - 100 };
    const bodyLean = calculateAngle(verticalPoint, avgShoulder, avgHip);
    results.angles.bodyLean = Math.round(bodyLean);

    // Good running posture: slight forward lean of 5-10 degrees
    if (bodyLean < 3) {
      results.recommendations.push({
        type: 'warning',
        area: 'Posture',
        message: 'Too upright - lean slightly forward from ankles for better momentum',
        angle: results.angles.bodyLean,
      });
    } else if (bodyLean >= 5 && bodyLean <= 12) {
      results.recommendations.push({
        type: 'success',
        area: 'Posture',
        message: 'Good forward lean for efficient running',
        angle: results.angles.bodyLean,
      });
    } else if (bodyLean > 15) {
      results.recommendations.push({
        type: 'warning',
        area: 'Posture',
        message: 'Leaning too far forward - may cause lower back strain',
        angle: results.angles.bodyLean,
      });
    }
  }

  // Analyze Knee Lift (average both legs)
  const kneeAngles = [];
  if (results.sides.left.kneeAngle) kneeAngles.push(results.sides.left.kneeAngle);
  if (results.sides.right.kneeAngle) kneeAngles.push(results.sides.right.kneeAngle);

  if (kneeAngles.length > 0) {
    const avgKneeAngle = Math.round(kneeAngles.reduce((a, b) => a + b) / kneeAngles.length);
    results.angles.kneeLift = avgKneeAngle;

    // During running, knee should flex between 90-140 degrees during stride
    if (avgKneeAngle > 160) {
      results.recommendations.push({
        type: 'warning',
        area: 'Knee Lift',
        message: 'Insufficient knee lift - increase leg drive for better efficiency',
        angle: results.angles.kneeLift,
      });
    } else if (avgKneeAngle >= 100 && avgKneeAngle <= 140) {
      results.recommendations.push({
        type: 'success',
        area: 'Knee Lift',
        message: 'Good knee drive and leg turnover',
        angle: results.angles.kneeLift,
      });
    }
  }

  // Analyze Hip Extension
  const hipAngles = [];
  if (results.sides.left.hipAngle) hipAngles.push(results.sides.left.hipAngle);
  if (results.sides.right.hipAngle) hipAngles.push(results.sides.right.hipAngle);

  if (hipAngles.length > 0) {
    const avgHipAngle = Math.round(hipAngles.reduce((a, b) => a + b) / hipAngles.length);
    results.angles.hipExtension = avgHipAngle;

    // Good hip extension during running: 160-180 degrees at pushoff
    if (avgHipAngle < 140) {
      results.recommendations.push({
        type: 'warning',
        area: 'Hip Extension',
        message: 'Limited hip extension - focus on pushing through stride',
        angle: results.angles.hipExtension,
      });
    } else if (avgHipAngle >= 160) {
      results.recommendations.push({
        type: 'success',
        area: 'Hip Extension',
        message: 'Excellent hip extension and power generation',
        angle: results.angles.hipExtension,
      });
    }
  }

  // Analyze Arm Swing
  let armSwingAnalyzed = false;

  // Check left arm
  if (leftShoulder && leftElbow && leftWrist &&
      leftShoulder.score > 0.3 && leftElbow.score > 0.3 && leftWrist.score > 0.3) {
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    results.sides.left.armAngle = Math.round(leftArmAngle);
    armSwingAnalyzed = true;
  }

  // Check right arm
  if (rightShoulder && rightElbow && rightWrist &&
      rightShoulder.score > 0.3 && rightElbow.score > 0.3 && rightWrist.score > 0.3) {
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    results.sides.right.armAngle = Math.round(rightArmAngle);
    armSwingAnalyzed = true;
  }

  if (armSwingAnalyzed) {
    const armAngles = [];
    if (results.sides.left.armAngle) armAngles.push(results.sides.left.armAngle);
    if (results.sides.right.armAngle) armAngles.push(results.sides.right.armAngle);

    if (armAngles.length > 0) {
      const avgArmAngle = Math.round(armAngles.reduce((a, b) => a + b) / armAngles.length);
      results.angles.armSwing = avgArmAngle;

      // Good arm swing: 80-110 degrees at elbow
      if (avgArmAngle > 120) {
        results.recommendations.push({
          type: 'info',
          area: 'Arm Swing',
          message: 'Arms too straight - bend elbows to ~90 degrees for better rhythm',
          angle: results.angles.armSwing,
        });
      } else if (avgArmAngle >= 80 && avgArmAngle <= 110) {
        results.recommendations.push({
          type: 'success',
          area: 'Arm Swing',
          message: 'Good arm angle for efficient running',
          angle: results.angles.armSwing,
        });
      } else if (avgArmAngle < 70) {
        results.recommendations.push({
          type: 'info',
          area: 'Arm Swing',
          message: 'Elbows too bent - relax arms slightly',
          angle: results.angles.armSwing,
        });
      }
    }
  }

  // Analyze Foot Strike (based on ankle position relative to knee)
  if (leftKnee && leftAnkle && leftKnee.score > 0.3 && leftAnkle.score > 0.3) {
    const footStrikeOffset = leftAnkle.x - leftKnee.x;

    if (Math.abs(footStrikeOffset) < 30) {
      results.recommendations.push({
        type: 'success',
        area: 'Foot Strike',
        message: 'Good foot landing position under center of mass',
      });
    } else if (footStrikeOffset > 30) {
      results.recommendations.push({
        type: 'warning',
        area: 'Foot Strike',
        message: 'Possible overstriding - land with foot closer to body',
      });
    }
  }

  // Overall assessment
  const warningCount = results.recommendations.filter(r => r.type === 'warning').length;
  const successCount = results.recommendations.filter(r => r.type === 'success').length;

  if (warningCount === 0 && successCount >= 3) {
    results.overall = 'excellent';
  } else if (warningCount <= 1) {
    results.overall = 'good';
  } else {
    results.overall = 'needs-improvement';
  }

  return results;
}
