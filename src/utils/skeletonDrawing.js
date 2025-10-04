// Draw skeleton overlay on canvas with pose keypoints and connections
export function drawSkeleton(ctx, pose, videoWidth, videoHeight) {
  if (!pose || !pose.keypoints) return;

  // Define skeleton connections (pairs of keypoints to connect)
  const connections = [
    // Torso
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],

    // Left arm
    ['left_shoulder', 'left_elbow'],
    ['left_elbow', 'left_wrist'],

    // Right arm
    ['right_shoulder', 'right_elbow'],
    ['right_elbow', 'right_wrist'],

    // Left leg
    ['left_hip', 'left_knee'],
    ['left_knee', 'left_ankle'],

    // Right leg
    ['right_hip', 'right_knee'],
    ['right_knee', 'right_ankle'],
  ];

  const getKeypoint = (name) => pose.keypoints.find(kp => kp.name === name);

  // Draw connections (lines between keypoints)
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 3;

  connections.forEach(([startName, endName]) => {
    const start = getKeypoint(startName);
    const end = getKeypoint(endName);

    if (start && end && start.score > 0.3 && end.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  });

  // Draw keypoints (circles at joints)
  pose.keypoints.forEach(keypoint => {
    if (keypoint.score > 0.3) {
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff0000';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

// Draw angle measurement on body
export function drawAngle(ctx, point1, point2, point3, angle, label) {
  if (!point1 || !point2 || !point3 ||
      point1.score < 0.3 || point2.score < 0.3 || point3.score < 0.3) {
    return;
  }

  // Draw angle arc at the joint
  const radius = 30;
  const startAngle = Math.atan2(point1.y - point2.y, point1.x - point2.x);
  const endAngle = Math.atan2(point3.y - point2.y, point3.x - point2.x);

  ctx.beginPath();
  ctx.arc(point2.x, point2.y, radius, startAngle, endAngle, false);
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw angle text
  const textX = point2.x + radius * 1.5;
  const textY = point2.y;

  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#ffff00';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;

  const text = `${label}: ${Math.round(angle)}°`;
  ctx.strokeText(text, textX, textY);
  ctx.fillText(text, textX, textY);
}

// Draw all relevant angles for bike fit
export function drawBikeFitAngles(ctx, pose, analysis) {
  if (!pose || !analysis) return;

  const getKeypoint = (name) => pose.keypoints.find(kp => kp.name === name);

  // Use the side with better confidence
  const useLeftSide = analysis.side === 'left';

  const shoulder = getKeypoint(useLeftSide ? 'left_shoulder' : 'right_shoulder');
  const hip = getKeypoint(useLeftSide ? 'left_hip' : 'right_hip');
  const knee = getKeypoint(useLeftSide ? 'left_knee' : 'right_knee');
  const ankle = getKeypoint(useLeftSide ? 'left_ankle' : 'right_ankle');
  const elbow = getKeypoint(useLeftSide ? 'left_elbow' : 'right_elbow');
  const wrist = getKeypoint(useLeftSide ? 'left_wrist' : 'right_wrist');

  // Draw knee angle
  if (analysis.angles.knee && hip && knee && ankle) {
    drawAngle(ctx, hip, knee, ankle, analysis.angles.knee, 'Knee');
  }

  // Draw hip angle
  if (analysis.angles.hip && shoulder && hip && knee) {
    drawAngle(ctx, shoulder, hip, knee, analysis.angles.hip, 'Hip');
  }

  // Draw elbow angle
  if (analysis.angles.elbow && shoulder && elbow && wrist) {
    drawAngle(ctx, shoulder, elbow, wrist, analysis.angles.elbow, 'Elbow');
  }
}

// Draw all relevant angles for running form
export function drawRunningAngles(ctx, pose, analysis) {
  if (!pose || !analysis) return;

  const getKeypoint = (name) => pose.keypoints.find(kp => kp.name === name);

  // Draw angles for both legs if available
  const leftShoulder = getKeypoint('left_shoulder');
  const leftHip = getKeypoint('left_hip');
  const leftKnee = getKeypoint('left_knee');
  const leftAnkle = getKeypoint('left_ankle');

  const rightShoulder = getKeypoint('right_shoulder');
  const rightHip = getKeypoint('right_hip');
  const rightKnee = getKeypoint('right_knee');
  const rightAnkle = getKeypoint('right_ankle');

  // Left leg knee angle
  if (analysis.sides?.left?.kneeAngle && leftHip && leftKnee && leftAnkle) {
    drawAngle(ctx, leftHip, leftKnee, leftAnkle, analysis.sides.left.kneeAngle, 'L-Knee');
  }

  // Right leg knee angle
  if (analysis.sides?.right?.kneeAngle && rightHip && rightKnee && rightAnkle) {
    drawAngle(ctx, rightHip, rightKnee, rightAnkle, analysis.sides.right.kneeAngle, 'R-Knee');
  }

  // Body lean angle (draw near shoulder)
  if (analysis.angles?.bodyLean && leftShoulder) {
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#00ffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    const text = `Lean: ${analysis.angles.bodyLean}°`;
    ctx.strokeText(text, leftShoulder.x - 80, leftShoulder.y - 20);
    ctx.fillText(text, leftShoulder.x - 80, leftShoulder.y - 20);
  }
}

// Create visual gauge showing angle within optimal range
export function createAngleGauge(angle, minOptimal, maxOptimal, label) {
  const percentage = ((angle - minOptimal) / (maxOptimal - minOptimal)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  let status = 'warning';
  if (angle >= minOptimal && angle <= maxOptimal) {
    status = 'good';
  }

  return {
    label,
    angle,
    percentage: clampedPercentage,
    status,
    minOptimal,
    maxOptimal,
  };
}
