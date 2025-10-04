import { describe, it, expect } from 'vitest';
import {
  SEVERITY,
  calculateSeverity,
  enhanceBikeFitRecommendations,
  enhanceRunningRecommendations,
  getSeverityDisplay,
} from './enhancedRecommendations';
import type { BikeFitAnalysis, RunningFormAnalysis, Recommendation, SeverityLevel } from '../types';

describe('enhancedRecommendations', () => {
  describe('SEVERITY constants', () => {
    it('should export CRITICAL severity', () => {
      expect(SEVERITY.CRITICAL).toBe('critical');
    });

    it('should export MODERATE severity', () => {
      expect(SEVERITY.MODERATE).toBe('moderate');
    });

    it('should export MINOR severity', () => {
      expect(SEVERITY.MINOR).toBe('minor');
    });
  });

  describe('calculateSeverity', () => {
    describe('Within optimal range', () => {
      it('should return MINOR when value is within optimal range', () => {
        const severity = calculateSeverity(150, 140, 160);
        expect(severity).toBe('minor');
      });

      it('should return MINOR when value equals minOptimal', () => {
        const severity = calculateSeverity(140, 140, 160);
        expect(severity).toBe('minor');
      });

      it('should return MINOR when value equals maxOptimal', () => {
        const severity = calculateSeverity(160, 140, 160);
        expect(severity).toBe('minor');
      });
    });

    describe('Below optimal range', () => {
      it('should return CRITICAL when deviation >= critical threshold', () => {
        const severity = calculateSeverity(100, 140, 160, 20, 10);
        // Deviation: (140-100)/20 * 100 = 200% (>= 20%)
        expect(severity).toBe('critical');
      });

      it('should return MODERATE when deviation >= moderate threshold but < critical', () => {
        const severity = calculateSeverity(137, 140, 160, 20, 10);
        // Deviation: (140-137)/20 * 100 = 15% (>= 10%, < 20%)
        expect(severity).toBe('moderate');
      });

      it('should return MINOR when deviation < moderate threshold', () => {
        const severity = calculateSeverity(139, 140, 160, 20, 10);
        // Deviation: (140-139)/20 * 100 = 5% (< 10%)
        expect(severity).toBe('minor');
      });
    });

    describe('Above optimal range', () => {
      it('should return CRITICAL when deviation >= critical threshold', () => {
        const severity = calculateSeverity(200, 140, 160, 20, 10);
        // Deviation: (200-160)/20 * 100 = 200% (>= 20%)
        expect(severity).toBe('critical');
      });

      it('should return MODERATE when deviation >= moderate threshold but < critical', () => {
        const severity = calculateSeverity(163, 140, 160, 20, 10);
        // Deviation: (163-160)/20 * 100 = 15% (>= 10%, < 20%)
        expect(severity).toBe('moderate');
      });

      it('should return MINOR when deviation < moderate threshold', () => {
        const severity = calculateSeverity(161, 140, 160, 20, 10);
        // Deviation: (161-160)/20 * 100 = 5% (< 10%)
        expect(severity).toBe('minor');
      });
    });

    describe('Custom thresholds', () => {
      it('should use custom critical threshold', () => {
        const severity = calculateSeverity(120, 140, 160, 30, 15);
        // Deviation: (140-120)/20 * 100 = 100% (>= 30%)
        expect(severity).toBe('critical');
      });

      it('should use custom moderate threshold', () => {
        const severity = calculateSeverity(137, 140, 160, 30, 15);
        // Deviation: (140-137)/20 * 100 = 15% (>= 15%, < 30%)
        expect(severity).toBe('moderate');
      });
    });

    describe('Edge cases', () => {
      it('should handle very small ranges', () => {
        const severity = calculateSeverity(145, 140, 142, 20, 10);
        expect(severity).toBeDefined();
        expect(['critical', 'moderate', 'minor']).toContain(severity);
      });

      it('should handle zero range (min === max)', () => {
        const severity = calculateSeverity(150, 150, 150, 20, 10);
        expect(severity).toBe('minor');
      });

      it('should handle negative values', () => {
        const severity = calculateSeverity(-10, -20, 0, 20, 10);
        expect(severity).toBeDefined();
      });
    });
  });

  describe('enhanceBikeFitRecommendations', () => {
    it('should return empty array for null analysis', () => {
      const result = enhanceBikeFitRecommendations(null as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined analysis', () => {
      const result = enhanceBikeFitRecommendations(undefined as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for analysis without recommendations', () => {
      const analysis: BikeFitAnalysis = {
        angles: {},
        recommendations: [],
        overall: 'good',
      };

      const result = enhanceBikeFitRecommendations(analysis);
      expect(result).toEqual([]);
    });

    describe('Knee angle enhancements', () => {
      it('should enhance knee angle too low with severity and exercises', () => {
        const analysis: BikeFitAnalysis = {
          angles: { knee: 120 },
          recommendations: [
            {
              area: 'Knee Angle',
              message: 'Saddle too low',
              type: 'warning',
              angle: 120,
            },
          ],
          overall: 'needs-adjustment',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].impact).toBeDefined();
        expect(result[0].drills).toBeDefined();
        expect(result[0].drills!.length).toBeGreaterThan(0);
        expect(result[0].priorityScore).toBeDefined();
      });

      it('should enhance knee angle too high with severity and exercises', () => {
        const analysis: BikeFitAnalysis = {
          angles: { knee: 175 },
          recommendations: [
            {
              area: 'Knee Angle',
              message: 'Saddle too high',
              type: 'warning',
              angle: 175,
            },
          ],
          overall: 'needs-adjustment',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].impact).toBeDefined();
        expect(result[0].drills).toBeDefined();
        expect(result[0].drills!.length).toBeGreaterThan(0);
      });

      it('should assign CRITICAL severity for very low knee angle', () => {
        const analysis: BikeFitAnalysis = {
          angles: { knee: 100 },
          recommendations: [
            {
              area: 'Knee Angle',
              message: 'Saddle too low',
              type: 'warning',
              angle: 100,
            },
          ],
          overall: 'needs-adjustment',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBe('critical');
        expect(result[0].impact).toContain('High risk');
      });
    });

    describe('Hip angle enhancements', () => {
      it('should enhance hip angle too open', () => {
        const analysis: BikeFitAnalysis = {
          angles: { hip: 80 },
          recommendations: [
            {
              area: 'Hip Angle',
              message: 'Hip too open',
              type: 'warning',
              angle: 80,
            },
          ],
          overall: 'needs-adjustment',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
        expect(result[0].drills!.length).toBeGreaterThan(0);
      });

      it('should enhance hip angle too compressed', () => {
        const analysis: BikeFitAnalysis = {
          angles: { hip: 30 },
          recommendations: [
            {
              area: 'Hip Angle',
              message: 'Hip too compressed',
              type: 'warning',
              angle: 30,
            },
          ],
          overall: 'needs-adjustment',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
        expect(result[0].impact).toContain('Breathing restriction');
      });
    });

    describe('Elbow angle enhancements', () => {
      it('should enhance elbow too straight', () => {
        const analysis: BikeFitAnalysis = {
          angles: { elbow: 175 },
          recommendations: [
            {
              area: 'Elbow Angle',
              message: 'Arms too straight',
              type: 'warning',
              angle: 175,
            },
          ],
          overall: 'needs-adjustment',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
        expect(result[0].drills!.length).toBeGreaterThan(0);
      });

      it('should enhance elbow too bent', () => {
        const analysis: BikeFitAnalysis = {
          angles: { elbow: 130 },
          recommendations: [
            {
              area: 'Elbow Angle',
              message: 'Elbows too bent',
              type: 'warning',
              angle: 130,
            },
          ],
          overall: 'needs-adjustment',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
      });
    });

    describe('Back angle enhancements', () => {
      it('should enhance back too upright', () => {
        const analysis: BikeFitAnalysis = {
          angles: { back: 60 },
          recommendations: [
            {
              area: 'Back Angle',
              message: 'Back too upright',
              type: 'info',
              angle: 60,
            },
          ],
          overall: 'good',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
      });

      it('should enhance back too aggressive', () => {
        const analysis: BikeFitAnalysis = {
          angles: { back: 30 },
          recommendations: [
            {
              area: 'Back Angle',
              message: 'Back too aggressive',
              type: 'warning',
              angle: 30,
            },
          ],
          overall: 'needs-adjustment',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
      });
    });

    describe('Sorting by severity', () => {
      it('should sort recommendations by priority score (critical first)', () => {
        const analysis: BikeFitAnalysis = {
          angles: { knee: 100, hip: 55, elbow: 150 },
          recommendations: [
            {
              area: 'Hip Angle',
              message: 'Minor issue',
              type: 'info',
              angle: 55,
            },
            {
              area: 'Knee Angle',
              message: 'Critical issue',
              type: 'warning',
              angle: 100,
            },
            {
              area: 'Elbow Angle',
              message: 'Moderate issue',
              type: 'warning',
              angle: 150,
            },
          ],
          overall: 'needs-adjustment',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result.length).toBe(3);
        expect(result[0].priorityScore).toBeGreaterThanOrEqual(result[1].priorityScore!);
        expect(result[1].priorityScore).toBeGreaterThanOrEqual(result[2].priorityScore!);
      });
    });

    describe('Edge cases', () => {
      it('should handle recommendations without angle property', () => {
        const analysis: BikeFitAnalysis = {
          angles: {},
          recommendations: [
            {
              area: 'General',
              message: 'Some advice',
              type: 'info',
            },
          ],
          overall: 'good',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBe('minor');
        expect(result[0].drills).toEqual([]);
      });

      it('should handle unrecognized area', () => {
        const analysis: BikeFitAnalysis = {
          angles: {},
          recommendations: [
            {
              area: 'Unknown Area',
              message: 'Some message',
              type: 'info',
              angle: 100,
            },
          ],
          overall: 'good',
        };

        const result = enhanceBikeFitRecommendations(analysis);

        expect(result[0].severity).toBe('minor');
        expect(result[0].drills).toEqual([]);
      });
    });
  });

  describe('enhanceRunningRecommendations', () => {
    it('should return empty array for null analysis', () => {
      const result = enhanceRunningRecommendations(null as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined analysis', () => {
      const result = enhanceRunningRecommendations(undefined as any);
      expect(result).toEqual([]);
    });

    it('should return empty array for analysis without recommendations', () => {
      const analysis: RunningFormAnalysis = {
        angles: {},
        recommendations: [],
        overall: 'good',
      };

      const result = enhanceRunningRecommendations(analysis);
      expect(result).toEqual([]);
    });

    describe('Body lean enhancements', () => {
      it('should enhance leaning back with severity and exercises', () => {
        const analysis: RunningFormAnalysis = {
          angles: { bodyLean: 2 },
          recommendations: [
            {
              area: 'Body Lean',
              message: 'Too upright',
              type: 'warning',
              angle: 2,
            },
          ],
          overall: 'needs-improvement',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].impact).toBeDefined();
        expect(result[0].drills).toBeDefined();
        expect(result[0].drills!.length).toBeGreaterThan(0);
      });

      it('should enhance leaning too far forward', () => {
        const analysis: RunningFormAnalysis = {
          angles: { bodyLean: 18 },
          recommendations: [
            {
              area: 'Body Lean',
              message: 'Leaning too far',
              type: 'warning',
              angle: 18,
            },
          ],
          overall: 'needs-improvement',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
      });
    });

    describe('Knee lift enhancements', () => {
      it('should enhance insufficient knee lift', () => {
        const analysis: RunningFormAnalysis = {
          angles: { kneeLift: 80 },
          recommendations: [
            {
              area: 'Knee Lift',
              message: 'Insufficient knee lift',
              type: 'warning',
              angle: 80,
            },
          ],
          overall: 'needs-improvement',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
        expect(result[0].drills!.length).toBeGreaterThan(0);
      });

      it('should enhance excessive knee lift', () => {
        const analysis: RunningFormAnalysis = {
          angles: { kneeLift: 150 },
          recommendations: [
            {
              area: 'Knee Lift',
              message: 'Too much knee lift',
              type: 'warning',
              angle: 150,
            },
          ],
          overall: 'needs-improvement',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
      });
    });

    describe('Hip extension enhancements', () => {
      it('should enhance limited hip extension', () => {
        const analysis: RunningFormAnalysis = {
          angles: { hipExtension: 150 },
          recommendations: [
            {
              area: 'Hip Extension',
              message: 'Limited hip extension',
              type: 'warning',
              angle: 150,
            },
          ],
          overall: 'needs-improvement',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].impact).toBeDefined();
        expect(result[0].drills).toBeDefined();
        expect(result[0].drills!.length).toBeGreaterThan(0);
      });

      it('should assign CRITICAL severity for very limited hip extension', () => {
        const analysis: RunningFormAnalysis = {
          angles: { hipExtension: 130 },
          recommendations: [
            {
              area: 'Hip Extension',
              message: 'Limited hip extension',
              type: 'warning',
              angle: 130,
            },
          ],
          overall: 'needs-improvement',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBe('critical');
        expect(result[0].impact).toContain('Reduced power output');
      });
    });

    describe('Arm swing enhancements', () => {
      it('should enhance poor arm swing (too straight)', () => {
        const analysis: RunningFormAnalysis = {
          angles: { armSwing: 120 },
          recommendations: [
            {
              area: 'Arm Swing',
              message: 'Arms too straight',
              type: 'info',
              angle: 120,
            },
          ],
          overall: 'good',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
      });

      it('should enhance poor arm swing (too bent)', () => {
        const analysis: RunningFormAnalysis = {
          angles: { armSwing: 70 },
          recommendations: [
            {
              area: 'Arm Swing',
              message: 'Elbows too bent',
              type: 'info',
              angle: 70,
            },
          ],
          overall: 'good',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBeDefined();
        expect(result[0].drills).toBeDefined();
      });
    });

    describe('Sorting by severity', () => {
      it('should sort recommendations by priority score (critical first)', () => {
        const analysis: RunningFormAnalysis = {
          angles: { bodyLean: 8, kneeLift: 80, hipExtension: 130 },
          recommendations: [
            {
              area: 'Body Lean',
              message: 'Minor issue',
              type: 'info',
              angle: 8,
            },
            {
              area: 'Hip Extension',
              message: 'Critical issue',
              type: 'warning',
              angle: 130,
            },
            {
              area: 'Knee Lift',
              message: 'Moderate issue',
              type: 'warning',
              angle: 80,
            },
          ],
          overall: 'needs-improvement',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result.length).toBe(3);
        expect(result[0].priorityScore).toBeGreaterThanOrEqual(result[1].priorityScore!);
        expect(result[1].priorityScore).toBeGreaterThanOrEqual(result[2].priorityScore!);
      });
    });

    describe('Edge cases', () => {
      it('should handle recommendations without angle property', () => {
        const analysis: RunningFormAnalysis = {
          angles: {},
          recommendations: [
            {
              area: 'General',
              message: 'Some advice',
              type: 'info',
            },
          ],
          overall: 'good',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBe('minor');
        expect(result[0].drills).toEqual([]);
      });

      it('should handle unrecognized area', () => {
        const analysis: RunningFormAnalysis = {
          angles: {},
          recommendations: [
            {
              area: 'Unknown Area',
              message: 'Some message',
              type: 'info',
              angle: 100,
            },
          ],
          overall: 'good',
        };

        const result = enhanceRunningRecommendations(analysis);

        expect(result[0].severity).toBe('minor');
        expect(result[0].drills).toEqual([]);
      });
    });
  });

  describe('getSeverityDisplay', () => {
    it('should return display properties for CRITICAL severity', () => {
      const display = getSeverityDisplay('critical');

      expect(display.label).toBe('Critical');
      expect(display.color).toBeDefined();
      expect(display.bgColor).toBeDefined();
      expect(display.icon).toBeDefined();
    });

    it('should return display properties for MODERATE severity', () => {
      const display = getSeverityDisplay('moderate');

      expect(display.label).toBe('Moderate');
      expect(display.color).toBeDefined();
      expect(display.bgColor).toBeDefined();
      expect(display.icon).toBeDefined();
    });

    it('should return display properties for MINOR severity', () => {
      const display = getSeverityDisplay('minor');

      expect(display.label).toBe('Minor');
      expect(display.color).toBeDefined();
      expect(display.bgColor).toBeDefined();
      expect(display.icon).toBeDefined();
    });

    it('should return default display properties for unknown severity', () => {
      const display = getSeverityDisplay('unknown' as SeverityLevel);

      expect(display.label).toBe('Info');
      expect(display.color).toBeDefined();
      expect(display.bgColor).toBeDefined();
      expect(display.icon).toBeDefined();
    });

    it('should use different colors for different severities', () => {
      const critical = getSeverityDisplay('critical');
      const moderate = getSeverityDisplay('moderate');
      const minor = getSeverityDisplay('minor');

      expect(critical.color).not.toBe(moderate.color);
      expect(moderate.color).not.toBe(minor.color);
      expect(critical.color).not.toBe(minor.color);
    });

    it('should include all required properties', () => {
      const display = getSeverityDisplay('critical');

      expect(display).toHaveProperty('label');
      expect(display).toHaveProperty('color');
      expect(display).toHaveProperty('bgColor');
      expect(display).toHaveProperty('icon');
    });

    it('should return consistent results for same severity', () => {
      const display1 = getSeverityDisplay('critical');
      const display2 = getSeverityDisplay('critical');

      expect(display1).toEqual(display2);
    });
  });

  describe('Priority scoring', () => {
    it('should assign higher priority score to critical recommendations', () => {
      const criticalAnalysis: BikeFitAnalysis = {
        angles: { knee: 100 },
        recommendations: [
          {
            area: 'Knee Angle',
            message: 'Critical',
            type: 'warning',
            angle: 100,
          },
        ],
        overall: 'needs-adjustment',
      };

      const moderateAnalysis: BikeFitAnalysis = {
        angles: { knee: 137 },
        recommendations: [
          {
            area: 'Knee Angle',
            message: 'Moderate',
            type: 'warning',
            angle: 137,
          },
        ],
        overall: 'good',
      };

      const criticalResult = enhanceBikeFitRecommendations(criticalAnalysis);
      const moderateResult = enhanceBikeFitRecommendations(moderateAnalysis);

      expect(criticalResult[0].priorityScore).toBeGreaterThan(moderateResult[0].priorityScore!);
    });

    it('should assign higher priority score to moderate than minor', () => {
      const moderateAnalysis: RunningFormAnalysis = {
        angles: { bodyLean: 2 },
        recommendations: [
          {
            area: 'Body Lean',
            message: 'Moderate',
            type: 'warning',
            angle: 2,
          },
        ],
        overall: 'needs-improvement',
      };

      const minorAnalysis: RunningFormAnalysis = {
        angles: { bodyLean: 7 },
        recommendations: [
          {
            area: 'Body Lean',
            message: 'Minor',
            type: 'info',
            angle: 7,
          },
        ],
        overall: 'good',
      };

      const moderateResult = enhanceRunningRecommendations(moderateAnalysis);
      const minorResult = enhanceRunningRecommendations(minorAnalysis);

      expect(moderateResult[0].priorityScore).toBeGreaterThan(minorResult[0].priorityScore!);
    });
  });

  describe('Integration tests', () => {
    it('should enhance complete bike fit analysis', () => {
      const analysis: BikeFitAnalysis = {
        angles: {
          knee: 150,
          hip: 55,
          elbow: 155,
          back: 42,
        },
        recommendations: [
          {
            area: 'Knee Angle',
            message: 'Good knee extension',
            type: 'success',
            angle: 150,
          },
          {
            area: 'Hip Angle',
            message: 'Good hip angle',
            type: 'success',
            angle: 55,
          },
        ],
        overall: 'excellent',
      };

      const result = enhanceBikeFitRecommendations(analysis);

      expect(result.length).toBe(2);
      expect(result.every(r => r.severity)).toBe(true);
      expect(result.every(r => r.priorityScore !== undefined)).toBe(true);
    });

    it('should enhance complete running form analysis', () => {
      const analysis: RunningFormAnalysis = {
        angles: {
          bodyLean: 8,
          kneeLift: 120,
          hipExtension: 165,
          armSwing: 95,
        },
        recommendations: [
          {
            area: 'Body Lean',
            message: 'Good forward lean',
            type: 'success',
            angle: 8,
          },
          {
            area: 'Hip Extension',
            message: 'Excellent hip extension',
            type: 'success',
            angle: 165,
          },
        ],
        overall: 'excellent',
      };

      const result = enhanceRunningRecommendations(analysis);

      expect(result.length).toBe(2);
      expect(result.every(r => r.severity)).toBe(true);
      expect(result.every(r => r.priorityScore !== undefined)).toBe(true);
    });
  });

  describe('Drill recommendations', () => {
    it('should provide drills for knee angle issues', () => {
      const analysis: BikeFitAnalysis = {
        angles: { knee: 120 },
        recommendations: [
          {
            area: 'Knee Angle',
            message: 'Saddle too low',
            type: 'warning',
            angle: 120,
          },
        ],
        overall: 'needs-adjustment',
      };

      const result = enhanceBikeFitRecommendations(analysis);

      expect(result[0].drills).toBeDefined();
      expect(result[0].drills!.length).toBeGreaterThan(0);
      expect(result[0].drills!.some(drill => drill.toLowerCase().includes('saddle'))).toBe(true);
    });

    it('should provide drills for running form issues', () => {
      const analysis: RunningFormAnalysis = {
        angles: { bodyLean: 2 },
        recommendations: [
          {
            area: 'Body Lean',
            message: 'Too upright',
            type: 'warning',
            angle: 2,
          },
        ],
        overall: 'needs-improvement',
      };

      const result = enhanceRunningRecommendations(analysis);

      expect(result[0].drills).toBeDefined();
      expect(result[0].drills!.length).toBeGreaterThan(0);
      expect(result[0].drills!.some(drill => drill.toLowerCase().includes('lean'))).toBe(true);
    });
  });
});
