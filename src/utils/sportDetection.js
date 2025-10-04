import { initializePoseDetector, detectPose } from './poseDetection';

// Detect sport type from video
export async function detectSportType(videoFile) {
  try {
    // Initialize pose detector
    await initializePoseDetector();

    // Create video element
    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(videoFile);

    // Load video
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
      video.src = videoUrl;
    });

    // Check video dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new Error('Video dimensions not available');
    }

    // Analyze multiple frames to detect sport
    const framesToCheck = 5;
    const interval = video.duration / (framesToCheck + 1);
    const detections = [];

    for (let i = 1; i <= framesToCheck; i++) {
      const targetTime = i * interval;

      // Seek to frame
      await new Promise((resolve) => {
        video.onseeked = resolve;
        video.currentTime = targetTime;
      });

      // Small delay for frame render
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const pose = await detectPose(video);
        if (pose && pose.score > 0.3) {
          const sportType = classifySport(pose);
          if (sportType) {
            detections.push(sportType);
          }
        }
      } catch (error) {
        console.warn('Frame detection failed:', error);
      }
    }

    URL.revokeObjectURL(videoUrl);

    // Return most common detection
    if (detections.length === 0) {
      return 'unknown';
    }

    const sportCounts = detections.reduce((acc, sport) => {
      acc[sport] = (acc[sport] || 0) + 1;
      return acc;
    }, {});

    const detectedSport = Object.keys(sportCounts).reduce((a, b) =>
      sportCounts[a] > sportCounts[b] ? a : b
    );

    return detectedSport;
  } catch (error) {
    console.error('Sport detection error:', error);
    return 'unknown';
  }
}

// Classify sport based on pose
function classifySport(pose) {
  if (!pose || !pose.keypoints) return null;

  const getKeypoint = (name) => pose.keypoints.find(kp => kp.name === name);

  const leftHip = getKeypoint('left_hip');
  const rightHip = getKeypoint('right_hip');
  const leftKnee = getKeypoint('left_knee');
  const rightKnee = getKeypoint('right_knee');
  const leftAnkle = getKeypoint('left_ankle');
  const rightAnkle = getKeypoint('right_ankle');
  const leftShoulder = getKeypoint('left_shoulder');
  const rightShoulder = getKeypoint('right_shoulder');

  // Need minimum keypoints for classification
  if (!leftHip || !rightHip || !leftKnee || !rightKnee ||
      leftHip.score < 0.2 || rightHip.score < 0.2 ||
      leftKnee.score < 0.2 || rightKnee.score < 0.2) {
    return null;
  }

  // Calculate average positions
  const avgHipY = (leftHip.y + rightHip.y) / 2;
  const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
  const avgHipX = (leftHip.x + rightHip.x) / 2;

  let avgShoulderY = null;
  let avgShoulderX = null;
  if (leftShoulder && rightShoulder &&
      leftShoulder.score > 0.2 && rightShoulder.score > 0.2) {
    avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  }

  // Vertical distance between hips and knees (key differentiator)
  const hipKneeVerticalDist = avgKneeY - avgHipY;

  // Check leg position variations
  let ankleVariation = 0;
  let hasAnkles = false;
  if (leftAnkle && rightAnkle && leftAnkle.score > 0.2 && rightAnkle.score > 0.2) {
    ankleVariation = Math.abs(leftAnkle.y - rightAnkle.y);
    hasAnkles = true;
  }

  const kneeVariation = Math.abs(leftKnee.y - rightKnee.y);

  // Body orientation analysis
  let bodyLeanForward = 0;
  let isVeryHorizontal = false;
  if (avgShoulderY !== null) {
    // Vertical distance shoulder to hip
    const shoulderHipVertical = avgHipY - avgShoulderY;
    // Horizontal distance shoulder to hip
    const shoulderHipHorizontal = Math.abs(avgShoulderX - avgHipX);

    // Calculate lean ratio
    if (shoulderHipVertical > 0) {
      bodyLeanForward = shoulderHipHorizontal / shoulderHipVertical;
    }

    // Very horizontal = cycling posture
    isVeryHorizontal = shoulderHipHorizontal > shoulderHipVertical * 0.8;
  }

  // Score both sports with improved logic
  let cyclingScore = 0;
  let runningScore = 0;

  // CYCLING INDICATORS:
  // 1. Very specific seated position with bent posture
  if (hipKneeVerticalDist > 50 && hipKneeVerticalDist < 180 && isVeryHorizontal) {
    cyclingScore += 4;
  }

  // 2. Circular pedaling with very low variation
  if (hasAnkles && ankleVariation < 60) {
    cyclingScore += 3;
  }

  // 3. Very symmetrical knees
  if (kneeVariation < 50) {
    cyclingScore += 2;
  }

  // 4. Strong forward lean with horizontal back (cycling specific)
  if (isVeryHorizontal && bodyLeanForward > 0.7) {
    cyclingScore += 4;
  }

  // RUNNING INDICATORS:
  // 1. Standing posture: knees well below hips (longer legs extended)
  if (hipKneeVerticalDist > 100) {
    runningScore += 4;
  }

  // 2. ANY leg alternation detected (key for running)
  if (hasAnkles && ankleVariation > 30) {
    runningScore += 4;
  }

  // 3. ANY knee alternation (one leg forward/back)
  if (kneeVariation > 30) {
    runningScore += 4;
  }

  // 4. NOT horizontal body (standing, not bent over bike)
  if (avgShoulderY !== null && !isVeryHorizontal) {
    runningScore += 3;
  }

  // 5. Vertical posture bonus
  if (avgShoulderY !== null && bodyLeanForward < 0.5) {
    runningScore += 2;
  }

  // 6. Penalize cycling if there's significant leg variation
  if (kneeVariation > 60 || (hasAnkles && ankleVariation > 80)) {
    cyclingScore = Math.max(0, cyclingScore - 3);
  }

  console.log('Sport Detection Debug:', {
    hipKneeVerticalDist,
    ankleVariation,
    kneeVariation,
    bodyLeanForward,
    isVeryHorizontal,
    cyclingScore,
    runningScore,
    detected: runningScore > cyclingScore ? 'RUNNING' : 'CYCLING'
  });

  // Prioritize running detection - lower threshold
  if (runningScore >= 6) {
    return 'running';
  } else if (cyclingScore >= 7 && cyclingScore > runningScore) {
    return 'cycling';
  } else if (runningScore > cyclingScore && runningScore >= 4) {
    return 'running';
  } else if (cyclingScore > runningScore && cyclingScore >= 4) {
    return 'cycling';
  }

  // Default to running if uncertain (treadmill bias)
  return runningScore >= cyclingScore ? 'running' : null;
}
