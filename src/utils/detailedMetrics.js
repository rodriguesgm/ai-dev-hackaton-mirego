// Calculate detailed metrics from all analyzed frames
export function calculateDetailedMetrics(allAnalyses) {
  if (!allAnalyses || allAnalyses.length === 0) return null;

  const angleKeys = new Set();
  allAnalyses.forEach(analysis => {
    Object.keys(analysis.angles || {}).forEach(key => angleKeys.add(key));
  });

  const metrics = {};

  angleKeys.forEach(angleKey => {
    const values = allAnalyses
      .map(a => a.angles?.[angleKey])
      .filter(v => v !== undefined && v !== null && !isNaN(v));

    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      metrics[angleKey] = {
        min: Math.round(min),
        max: Math.round(max),
        avg: Math.round(avg),
        stdDev: Math.round(stdDev * 10) / 10,
        range: Math.round(max - min),
        consistency: calculateConsistency(stdDev, avg),
        values: values.map(v => Math.round(v)),
      };
    }
  });

  return metrics;
}

// Calculate consistency score (0-100)
function calculateConsistency(stdDev, avg) {
  if (avg === 0) return 0;

  // Lower coefficient of variation = higher consistency
  const coefficientOfVariation = (stdDev / avg) * 100;

  // Convert to 0-100 scale (lower CV = higher score)
  // CV < 5% = excellent (90-100)
  // CV 5-10% = good (75-90)
  // CV 10-15% = fair (60-75)
  // CV > 15% = needs improvement (0-60)

  if (coefficientOfVariation < 5) {
    return Math.round(100 - coefficientOfVariation * 2);
  } else if (coefficientOfVariation < 10) {
    return Math.round(90 - (coefficientOfVariation - 5) * 3);
  } else if (coefficientOfVariation < 15) {
    return Math.round(75 - (coefficientOfVariation - 10) * 3);
  } else {
    return Math.max(0, Math.round(60 - (coefficientOfVariation - 15) * 2));
  }
}

// Calculate left vs right asymmetry for running/cycling
export function calculateAsymmetry(allAnalyses) {
  if (!allAnalyses || allAnalyses.length === 0) return null;

  const leftAngles = {};
  const rightAngles = {};

  allAnalyses.forEach(analysis => {
    if (analysis.sides) {
      // Left side
      if (analysis.sides.left) {
        Object.entries(analysis.sides.left).forEach(([key, value]) => {
          if (value !== undefined && value !== null && !isNaN(value)) {
            if (!leftAngles[key]) leftAngles[key] = [];
            leftAngles[key].push(value);
          }
        });
      }

      // Right side
      if (analysis.sides.right) {
        Object.entries(analysis.sides.right).forEach(([key, value]) => {
          if (value !== undefined && value !== null && !isNaN(value)) {
            if (!rightAngles[key]) rightAngles[key] = [];
            rightAngles[key].push(value);
          }
        });
      }
    }
  });

  const asymmetry = {};

  Object.keys(leftAngles).forEach(key => {
    if (rightAngles[key]) {
      const leftAvg = leftAngles[key].reduce((a, b) => a + b, 0) / leftAngles[key].length;
      const rightAvg = rightAngles[key].reduce((a, b) => a + b, 0) / rightAngles[key].length;
      const difference = Math.abs(leftAvg - rightAvg);
      const percentDiff = (difference / ((leftAvg + rightAvg) / 2)) * 100;

      asymmetry[key] = {
        left: Math.round(leftAvg),
        right: Math.round(rightAvg),
        difference: Math.round(difference),
        percentDiff: Math.round(percentDiff * 10) / 10,
        status: percentDiff < 5 ? 'balanced' : percentDiff < 10 ? 'minor' : 'significant',
      };
    }
  });

  return Object.keys(asymmetry).length > 0 ? asymmetry : null;
}

// Get consistency rating
export function getConsistencyRating(score) {
  if (score >= 90) return { label: 'Excellent', color: '#4caf50' };
  if (score >= 75) return { label: 'Good', color: '#8bc34a' };
  if (score >= 60) return { label: 'Fair', color: '#ff9800' };
  return { label: 'Needs Improvement', color: '#f44336' };
}

// Get asymmetry status
export function getAsymmetryStatus(status) {
  switch (status) {
    case 'balanced':
      return { label: 'Balanced', color: '#4caf50', icon: '✓' };
    case 'minor':
      return { label: 'Minor Imbalance', color: '#ff9800', icon: '⚠' };
    case 'significant':
      return { label: 'Significant Imbalance', color: '#f44336', icon: '✗' };
    default:
      return { label: 'Unknown', color: '#757575', icon: '?' };
  }
}

// Create frame-by-frame data for charting
export function createFrameData(allAnalyses) {
  return allAnalyses.map((analysis, index) => ({
    frame: index + 1,
    ...analysis.angles,
  }));
}
