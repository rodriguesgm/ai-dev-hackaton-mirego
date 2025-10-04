import { SeverityLevel, SeverityDisplay, BikeFitAnalysis, RunningFormAnalysis, Recommendation } from '../types';

/**
 * Enhanced Recommendations System
 * - Severity scoring (critical, moderate, minor)
 * - Specific exercise/drill suggestions
 * - Prioritized sorting
 */

// Severity levels
export const SEVERITY: Record<string, SeverityLevel> = {
  CRITICAL: 'critical',
  MODERATE: 'moderate',
  MINOR: 'minor',
};

interface ExerciseData {
  drills: string[];
  videoTimestamp: boolean;
}

// Exercise database
const EXERCISES: Record<string, ExerciseData> = {
  // Bike fit exercises
  kneeTooLow: {
    drills: [
      'Raise saddle height by 5-10mm increments',
      'Single-leg pedaling drills to test range of motion',
      'Check cleat position - may need to move back',
    ],
    videoTimestamp: true,
  },
  kneeTooHigh: {
    drills: [
      'Lower saddle height by 5-10mm increments',
      'Test with heel on pedal - leg should be straight',
      'Foam roll quads and hip flexors before adjustments',
    ],
    videoTimestamp: true,
  },
  hipTooOpen: {
    drills: [
      'Move saddle forward 5-10mm',
      'Lower handlebars if flexibility allows',
      'Core strengthening exercises (planks, bridges)',
    ],
    videoTimestamp: true,
  },
  hipTooCompressed: {
    drills: [
      'Raise handlebars or add spacers',
      'Move saddle back 5-10mm',
      'Hip flexor stretches (couch stretch, pigeon pose)',
      'Work on hip mobility exercises',
    ],
    videoTimestamp: true,
  },
  elbowTooStraight: {
    drills: [
      'Shorten stem length',
      'Raise handlebars with spacers',
      'Practice bending elbows consciously during rides',
    ],
    videoTimestamp: true,
  },
  elbowTooBent: {
    drills: [
      'Increase reach with longer stem',
      'Lower handlebars if comfortable',
      'Upper body strength training',
    ],
    videoTimestamp: true,
  },
  backTooUpright: {
    drills: [
      'Lower handlebars gradually',
      'Work on core strength and stability',
      'Thoracic spine mobility exercises',
      'Hamstring stretches',
    ],
    videoTimestamp: true,
  },
  backTooAggressive: {
    drills: [
      'Raise handlebars with spacers',
      'Shorter stem for more upright position',
      'Lower back strengthening exercises',
      'Cat-cow stretches for spine mobility',
    ],
    videoTimestamp: true,
  },

  // Running form exercises
  leaningBack: {
    drills: [
      'Falling forward drill: Lean from ankles not waist',
      'Wall lean drill: Practice proper forward lean',
      'Core engagement exercises during runs',
      'Focus on landing with foot under hips',
    ],
    videoTimestamp: true,
  },
  leaningTooFar: {
    drills: [
      'Posture reset: Imagine string pulling from crown',
      'Core stability work (planks, dead bugs)',
      'Run with lighter, quicker cadence',
    ],
    videoTimestamp: true,
  },
  kneeLiftLow: {
    drills: [
      'High knee drills (30 seconds × 3 sets)',
      'A-skip and B-skip drills',
      'Butt kicks for hip flexor activation',
      'Hill repeats to increase knee drive',
    ],
    videoTimestamp: true,
  },
  kneeLiftHigh: {
    drills: [
      'Focus on quick ground contact, not height',
      'Cadence drills at 180 steps/minute',
      'Stride length reduction exercises',
    ],
    videoTimestamp: true,
  },
  hipExtensionLimited: {
    drills: [
      'Hip flexor stretches (couch stretch, lunge holds)',
      'Glute activation (clamshells, bridges)',
      'Leg swings front-to-back before runs',
      'Backward running drills',
    ],
    videoTimestamp: true,
  },
  armSwingPoor: {
    drills: [
      'Arm swing drill: 90° elbow, forward/back motion',
      'Practice while seated to isolate arms',
      'Shoulder mobility exercises',
      'Relax shoulders - avoid tension',
    ],
    videoTimestamp: true,
  },
};

/**
 * Calculate severity based on deviation from optimal range
 * @param value - Current measured value
 * @param optimalMin - Minimum optimal value
 * @param optimalMax - Maximum optimal value
 * @param criticalThreshold - % deviation for critical severity
 * @param moderateThreshold - % deviation for moderate severity
 * @returns Severity level
 */
export function calculateSeverity(
  value: number,
  optimalMin: number,
  optimalMax: number,
  criticalThreshold: number = 20,
  moderateThreshold: number = 10
): SeverityLevel {
  const optimalMid = (optimalMin + optimalMax) / 2;
  const optimalRange = optimalMax - optimalMin;

  // Value is within optimal range
  if (value >= optimalMin && value <= optimalMax) {
    return SEVERITY.MINOR as SeverityLevel;
  }

  // Calculate deviation percentage
  let deviation: number;
  if (value < optimalMin) {
    deviation = ((optimalMin - value) / optimalRange) * 100;
  } else {
    deviation = ((value - optimalMax) / optimalRange) * 100;
  }

  if (deviation >= criticalThreshold) {
    return SEVERITY.CRITICAL as SeverityLevel;
  } else if (deviation >= moderateThreshold) {
    return SEVERITY.MODERATE as SeverityLevel;
  } else {
    return SEVERITY.MINOR as SeverityLevel;
  }
}

/**
 * Enhance bike fit recommendations with severity and exercises
 * @param analysis - Bike fit analysis result
 * @returns Enhanced recommendations sorted by severity
 */
export function enhanceBikeFitRecommendations(analysis: BikeFitAnalysis): Recommendation[] {
  if (!analysis || !analysis.recommendations) return [];

  const enhanced = analysis.recommendations.map(rec => {
    let severity: SeverityLevel = SEVERITY.MINOR as SeverityLevel;
    let exerciseKey: string | null = null;
    let impact = '';

    // Knee angle analysis
    if (rec.area === 'Knee Angle' && rec.angle !== undefined) {
      const angle = rec.angle;
      severity = calculateSeverity(angle, 140, 160, 25, 15);

      if (angle < 140) {
        exerciseKey = 'kneeTooLow';
        impact = severity === SEVERITY.CRITICAL
          ? 'High risk of knee pain and reduced power output'
          : 'May cause discomfort on longer rides';
      } else if (angle > 160) {
        exerciseKey = 'kneeTooHigh';
        impact = severity === SEVERITY.CRITICAL
          ? 'Risk of hamstring strain and inefficient pedaling'
          : 'Slight inefficiency in power transfer';
      }
    }

    // Hip angle analysis
    if (rec.area === 'Hip Angle' && rec.angle !== undefined) {
      const angle = rec.angle;
      severity = calculateSeverity(angle, 40, 70, 30, 20);

      if (angle > 70) {
        exerciseKey = 'hipTooOpen';
        impact = severity === SEVERITY.CRITICAL
          ? 'Reduced aerodynamics and power generation'
          : 'Minor reduction in efficiency';
      } else if (angle < 40) {
        exerciseKey = 'hipTooCompressed';
        impact = severity === SEVERITY.CRITICAL
          ? 'Breathing restriction and back pain risk'
          : 'May limit comfort on long rides';
      }
    }

    // Elbow angle analysis
    if (rec.area === 'Elbow Angle' && rec.angle !== undefined) {
      const angle = rec.angle;
      severity = calculateSeverity(angle, 140, 170, 25, 15);

      if (angle > 170) {
        exerciseKey = 'elbowTooStraight';
        impact = severity === SEVERITY.CRITICAL
          ? 'Risk of shoulder/neck pain and reduced control'
          : 'Minor strain on upper body';
      } else if (angle < 140) {
        exerciseKey = 'elbowTooBent';
        impact = severity === SEVERITY.CRITICAL
          ? 'Excessive weight on arms, fatigue risk'
          : 'Slight reduction in comfort';
      }
    }

    // Back angle analysis
    if (rec.area === 'Back Angle' && rec.angle !== undefined) {
      const angle = rec.angle;
      severity = calculateSeverity(angle, 35, 50, 30, 20);

      if (angle > 50) {
        exerciseKey = 'backTooUpright';
        impact = severity === SEVERITY.CRITICAL
          ? 'Significant aerodynamic drag'
          : 'Slight efficiency loss';
      } else if (angle < 35) {
        exerciseKey = 'backTooAggressive';
        impact = severity === SEVERITY.CRITICAL
          ? 'Back pain risk and breathing limitations'
          : 'May cause discomfort over time';
      }
    }

    const drills = exerciseKey ? EXERCISES[exerciseKey].drills : [];

    return {
      ...rec,
      severity,
      impact,
      drills,
      priorityScore: getSeverityScore(severity),
    };
  });

  // Sort by severity (critical first)
  return enhanced.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
}

/**
 * Enhance running form recommendations with severity and exercises
 * @param analysis - Running form analysis result
 * @returns Enhanced recommendations sorted by severity
 */
export function enhanceRunningRecommendations(analysis: RunningFormAnalysis): Recommendation[] {
  if (!analysis || !analysis.recommendations) return [];

  const enhanced = analysis.recommendations.map(rec => {
    let severity: SeverityLevel = SEVERITY.MINOR as SeverityLevel;
    let exerciseKey: string | null = null;
    let impact = '';

    // Body lean analysis
    if (rec.area === 'Body Lean' && rec.angle !== undefined) {
      const angle = rec.angle;
      severity = calculateSeverity(angle, 5, 12, 40, 25);

      if (angle < 5) {
        exerciseKey = 'leaningBack';
        impact = severity === SEVERITY.CRITICAL
          ? 'Heel striking and braking forces increase injury risk'
          : 'Reduced running efficiency';
      } else if (angle > 12) {
        exerciseKey = 'leaningTooFar';
        impact = severity === SEVERITY.CRITICAL
          ? 'Risk of quad strain and forward momentum loss'
          : 'Slight balance issues';
      }
    }

    // Knee lift analysis
    if (rec.area === 'Knee Lift' && rec.angle !== undefined) {
      const angle = rec.angle;
      severity = calculateSeverity(angle, 100, 140, 30, 20);

      if (angle < 100) {
        exerciseKey = 'kneeLiftLow';
        impact = severity === SEVERITY.CRITICAL
          ? 'Shuffling gait increases injury risk, reduces speed'
          : 'Minor stride length reduction';
      } else if (angle > 140) {
        exerciseKey = 'kneeLiftHigh';
        impact = severity === SEVERITY.CRITICAL
          ? 'Wasted energy, increased ground contact time'
          : 'Slight efficiency loss';
      }
    }

    // Hip extension analysis
    if (rec.area === 'Hip Extension' && rec.angle !== undefined) {
      const angle = rec.angle;
      severity = calculateSeverity(angle, 160, 180, 15, 10);

      if (angle < 160) {
        exerciseKey = 'hipExtensionLimited';
        impact = severity === SEVERITY.CRITICAL
          ? 'Reduced power output, compensatory strain on quads/knees'
          : 'Mild power loss';
      }
    }

    // Arm swing analysis
    if (rec.area === 'Arm Swing' && rec.angle !== undefined) {
      const angle = rec.angle;
      severity = calculateSeverity(angle, 80, 110, 30, 20);

      if (angle < 80 || angle > 110) {
        exerciseKey = 'armSwingPoor';
        impact = severity === SEVERITY.CRITICAL
          ? 'Energy waste and rotational imbalance'
          : 'Minor balance issues';
      }
    }

    const drills = exerciseKey ? EXERCISES[exerciseKey].drills : [];

    return {
      ...rec,
      severity,
      impact,
      drills,
      priorityScore: getSeverityScore(severity),
    };
  });

  // Sort by severity (critical first)
  return enhanced.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
}

/**
 * Convert severity to numeric score for sorting
 */
function getSeverityScore(severity: SeverityLevel): number {
  switch (severity) {
    case SEVERITY.CRITICAL:
      return 3;
    case SEVERITY.MODERATE:
      return 2;
    case SEVERITY.MINOR:
      return 1;
    default:
      return 0;
  }
}

/**
 * Get severity display properties
 */
export function getSeverityDisplay(severity: SeverityLevel): SeverityDisplay {
  switch (severity) {
    case SEVERITY.CRITICAL:
      return {
        label: 'Critical',
        color: '#f44336',
        icon: '⚠️',
        bgColor: '#ffebee',
      };
    case SEVERITY.MODERATE:
      return {
        label: 'Moderate',
        color: '#ff9800',
        icon: '⚡',
        bgColor: '#fff3e0',
      };
    case SEVERITY.MINOR:
      return {
        label: 'Minor',
        color: '#2196f3',
        icon: 'ℹ️',
        bgColor: '#e3f2fd',
      };
    default:
      return {
        label: 'Info',
        color: '#757575',
        icon: '•',
        bgColor: '#f5f5f5',
      };
  }
}
