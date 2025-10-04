import { describe, it, expect } from 'vitest';
import { calculateDetailedMetrics, calculateAsymmetry } from './detailedMetrics';

interface AnalysisWithAngles {
  angles?: Record<string, number>;
  sides?: {
    left?: Record<string, number>;
    right?: Record<string, number>;
  };
}

describe('detailedMetrics', () => {
  describe('calculateDetailedMetrics', () => {
    it('should calculate correct metrics for a simple dataset', () => {
      const analyses: AnalysisWithAngles[] = [
        { angles: { knee: 90 } },
        { angles: { knee: 95 } },
        { angles: { knee: 100 } },
        { angles: { knee: 105 } },
        { angles: { knee: 110 } },
      ];

      const metrics = calculateDetailedMetrics(analyses);

      expect(metrics).toBeDefined();
      expect(metrics!.knee).toBeDefined();
      expect(metrics!.knee.min).toBe(90);
      expect(metrics!.knee.max).toBe(110);
      expect(metrics!.knee.avg).toBe(100);
      expect(metrics!.knee.range).toBe(20);
      expect(metrics!.knee.values).toHaveLength(5);
    });

    it('should handle empty frame data', () => {
      const analyses: AnalysisWithAngles[] = [];
      const metrics = calculateDetailedMetrics(analyses);
      expect(metrics).toBeNull();
    });

    it('should handle single frame data', () => {
      const analyses: AnalysisWithAngles[] = [{ angles: { knee: 90 } }];
      const metrics = calculateDetailedMetrics(analyses);

      expect(metrics).toBeDefined();
      expect(metrics!.knee).toBeDefined();
      expect(metrics!.knee.min).toBe(90);
      expect(metrics!.knee.max).toBe(90);
      expect(metrics!.knee.avg).toBe(90);
      expect(metrics!.knee.range).toBe(0);
      expect(metrics!.knee.stdDev).toBe(0);
      expect(metrics!.knee.consistency).toBe(100);
    });

    it('should calculate standard deviation correctly', () => {
      const analyses: AnalysisWithAngles[] = [
        { angles: { knee: 100 } },
        { angles: { knee: 100 } },
        { angles: { knee: 100 } },
      ];

      const metrics = calculateDetailedMetrics(analyses);
      expect(metrics!.knee.stdDev).toBeCloseTo(0, 1);
    });

    it('should handle multiple angle types', () => {
      const analyses: AnalysisWithAngles[] = [
        { angles: { knee: 90, hip: 45, elbow: 120 } },
        { angles: { knee: 95, hip: 50, elbow: 125 } },
      ];

      const metrics = calculateDetailedMetrics(analyses);
      expect(metrics!.knee).toBeDefined();
      expect(metrics!.hip).toBeDefined();
      expect(metrics!.elbow).toBeDefined();
    });

    it('should calculate consistency as percentage', () => {
      const analyses: AnalysisWithAngles[] = [
        { angles: { knee: 90 } },
        { angles: { knee: 100 } },
        { angles: { knee: 110 } },
      ];

      const metrics = calculateDetailedMetrics(analyses);
      expect(metrics!.knee.consistency).toBeGreaterThanOrEqual(0);
      expect(metrics!.knee.consistency).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateAsymmetry', () => {
    it('should detect balanced symmetry', () => {
      const analyses: AnalysisWithAngles[] = [
        { sides: { left: { knee: 90 }, right: { knee: 90 } } },
        { sides: { left: { knee: 95 }, right: { knee: 95 } } },
      ];

      const asymmetry = calculateAsymmetry(analyses);
      expect(asymmetry).toBeDefined();
      expect(asymmetry!.knee).toBeDefined();
      expect(asymmetry!.knee.status).toBe('balanced');
      expect(asymmetry!.knee.difference).toBeCloseTo(0, 1);
    });

    it('should detect minor asymmetry', () => {
      const analyses: AnalysisWithAngles[] = [
        { sides: { left: { knee: 90 }, right: { knee: 95 } } },
        { sides: { left: { knee: 92 }, right: { knee: 97 } } },
      ];

      const asymmetry = calculateAsymmetry(analyses);
      expect(asymmetry).toBeDefined();
      expect(asymmetry!.knee).toBeDefined();
      expect(['minor', 'balanced']).toContain(asymmetry!.knee.status);
    });

    it('should detect significant asymmetry', () => {
      const analyses: AnalysisWithAngles[] = [
        { sides: { left: { knee: 90 }, right: { knee: 120 } } },
        { sides: { left: { knee: 92 }, right: { knee: 122 } } },
      ];

      const asymmetry = calculateAsymmetry(analyses);
      expect(asymmetry).toBeDefined();
      expect(asymmetry!.knee).toBeDefined();
      expect(asymmetry!.knee.status).toBe('significant');
      expect(Math.abs(asymmetry!.knee.difference)).toBeGreaterThan(10);
    });

    it('should handle empty frame data', () => {
      const analyses: AnalysisWithAngles[] = [];
      const asymmetry = calculateAsymmetry(analyses);
      expect(asymmetry).toBeNull();
    });

    it('should calculate percentage difference correctly', () => {
      const analyses: AnalysisWithAngles[] = [
        { sides: { left: { knee: 100 }, right: { knee: 110 } } },
      ];

      const asymmetry = calculateAsymmetry(analyses);
      expect(asymmetry).toBeDefined();
      expect(asymmetry!.knee).toBeDefined();
      expect(asymmetry!.knee.percentDiff).toBeCloseTo(9.5, 0);
    });

    it('should handle missing left or right data', () => {
      const analyses: AnalysisWithAngles[] = [
        { sides: { left: { knee: 90 } } },
        { sides: { right: { knee: 95 } } },
      ];

      const asymmetry = calculateAsymmetry(analyses);
      // Function collects all left and right values across frames
      // so this will still produce a result
      expect(asymmetry).toBeDefined();
      expect(asymmetry!.knee).toBeDefined();
    });
  });
});
