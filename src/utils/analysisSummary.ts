import type { Recommendation, DetailedMetrics, Asymmetry, AngleData } from '../types';

export interface AnalysisSummary {
  headline: string;
  strengths: string[];
  improvements: string[];
  topPriority: string;
}

/**
 * Generates a detailed, specific summary from analysis data
 * Focuses on concrete measurements and specific feedback
 */
export function generateDetailedSummary(
  recommendations: Recommendation[],
  angles: AngleData,
  detailedMetrics: DetailedMetrics | null,
  asymmetry: Asymmetry | null,
  overall: string,
  sportType: 'bike' | 'running'
): AnalysisSummary {
  const criticalIssues = recommendations.filter(r => r.severity === 'critical');
  const moderateIssues = recommendations.filter(r => r.severity === 'moderate');
  const minorIssues = recommendations.filter(r => r.severity === 'minor');

  // Generate specific headline
  let headline = '';
  if (criticalIssues.length > 0) {
    headline = `${criticalIssues.length} critical issue${criticalIssues.length > 1 ? 's' : ''} detected - immediate attention needed`;
  } else if (moderateIssues.length > 0) {
    headline = `Form is functional but ${moderateIssues.length} area${moderateIssues.length > 1 ? 's need' : ' needs'} improvement`;
  } else if (minorIssues.length > 0) {
    headline = `Good form overall - minor optimizations available`;
  } else {
    headline = `Excellent form - all measurements within optimal ranges`;
  }

  // Extract specific strengths
  const strengths: string[] = [];

  // Check for good angles
  if (sportType === 'bike') {
    if (angles.knee && angles.knee >= 140 && angles.knee <= 160) {
      strengths.push(`Knee angle (${angles.knee}°) is optimal - reduces stress on joints`);
    }
    if (angles.hip && angles.hip >= 40 && angles.hip <= 70) {
      strengths.push(`Hip angle (${angles.hip}°) is in ideal range - maximizes power transfer`);
    }
    if (angles.elbow && angles.elbow >= 140 && angles.elbow <= 170) {
      strengths.push(`Elbow position (${angles.elbow}°) is good - comfortable and aerodynamic`);
    }
    if (angles.back && angles.back >= 35 && angles.back <= 50) {
      strengths.push(`Back angle (${angles.back}°) shows good aerodynamic position`);
    }
  } else {
    // Running
    if (angles.kneeLift && angles.kneeLift >= 70 && angles.kneeLift <= 95) {
      strengths.push(`Knee lift (${angles.kneeLift}°) is optimal - efficient stride mechanics`);
    }
    if (angles.bodyLean && angles.bodyLean >= 3 && angles.bodyLean <= 8) {
      strengths.push(`Body lean (${angles.bodyLean}°) is perfect - promotes forward momentum`);
    }
    if (angles.armSwing && angles.armSwing >= 70 && angles.armSwing <= 100) {
      strengths.push(`Arm swing (${angles.armSwing}°) is efficient - good energy conservation`);
    }
  }

  // Check consistency
  if (detailedMetrics) {
    const consistentAngles = Object.entries(detailedMetrics).filter(([_, data]) => data.consistency >= 85);
    if (consistentAngles.length > 0) {
      const angleNames = consistentAngles.map(([key]) => formatAngleName(key, sportType)).join(', ');
      strengths.push(`Highly consistent form in ${angleNames} (${consistentAngles.length > 1 ? 'all' : ''} ${consistentAngles[0][1].consistency}%+ consistency)`);
    }
  }

  // Check symmetry
  if (asymmetry) {
    const balanced = Object.entries(asymmetry).filter(([_, data]) => data.status === 'balanced');
    if (balanced.length > 0) {
      const angleNames = balanced.map(([key]) => formatAngleName(key, sportType)).join(', ');
      strengths.push(`Excellent left/right balance in ${angleNames} (${balanced[0][1].percentDiff}% difference or less)`);
    }
  }

  if (strengths.length === 0) {
    strengths.push('Analysis in progress - continue with current form');
  }

  // Extract specific improvements with measurements
  const improvements: string[] = [];

  // Get top critical and moderate issues with specific details
  [...criticalIssues, ...moderateIssues].slice(0, 4).forEach(rec => {
    let detail = '';
    if (rec.angle !== undefined) {
      detail = ` (current: ${rec.angle}°)`;
    }

    // Add specific impact and measurement
    if (rec.impact) {
      improvements.push(`${rec.area}${detail}: ${rec.message}. Impact: ${rec.impact}`);
    } else {
      improvements.push(`${rec.area}${detail}: ${rec.message}`);
    }
  });

  // Add asymmetry issues with specific measurements
  if (asymmetry) {
    const asymmetryIssues = Object.entries(asymmetry).filter(([_, data]) =>
      data.status === 'significant' || data.status === 'minor'
    );
    asymmetryIssues.slice(0, 2).forEach(([key, data]) => {
      improvements.push(
        `${formatAngleName(key, sportType)} imbalance: Left ${data.left}° vs Right ${data.right}° (${data.percentDiff}% difference) - work on balancing both sides`
      );
    });
  }

  // Add consistency issues with specific numbers
  if (detailedMetrics) {
    const inconsistent = Object.entries(detailedMetrics)
      .filter(([_, data]) => data.consistency < 70)
      .sort((a, b) => a[1].consistency - b[1].consistency)
      .slice(0, 2);

    inconsistent.forEach(([key, data]) => {
      improvements.push(
        `${formatAngleName(key, sportType)} consistency is low (${data.consistency}%) - range varies from ${data.min}° to ${data.max}°. Focus on maintaining steady form`
      );
    });
  }

  if (improvements.length === 0) {
    improvements.push('No significant issues detected - maintain current form and conditioning');
  }

  // Determine top priority with specific action
  let topPriority = '';
  if (criticalIssues.length > 0) {
    const top = criticalIssues[0];
    topPriority = `Priority #1: ${top.area} - ${top.message}`;
    if (top.drills && top.drills.length > 0) {
      topPriority += `. Start with: ${top.drills[0]}`;
    }
  } else if (moderateIssues.length > 0) {
    const top = moderateIssues[0];
    topPriority = `Focus on: ${top.area} - ${top.message}`;
    if (top.drills && top.drills.length > 0) {
      topPriority += `. Recommended: ${top.drills[0]}`;
    }
  } else {
    topPriority = 'Maintain your excellent form through consistent practice and conditioning';
  }

  return {
    headline,
    strengths,
    improvements,
    topPriority
  };
}

function formatAngleName(key: string, sportType: 'bike' | 'running'): string {
  const bikeMap: { [key: string]: string } = {
    knee: 'Knee',
    kneeAngle: 'Knee',
    hip: 'Hip',
    hipAngle: 'Hip',
    elbow: 'Elbow',
    back: 'Back',
  };

  const runningMap: { [key: string]: string } = {
    bodyLean: 'Body Lean',
    kneeLift: 'Knee Lift',
    hipExtension: 'Hip Extension',
    armSwing: 'Arm Swing',
    knee: 'Knee',
    hip: 'Hip',
  };

  const map = sportType === 'bike' ? bikeMap : runningMap;
  return map[key] || key;
}
