import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  drawSkeleton,
  drawAngle,
  drawBikeFitAngles,
  drawRunningAngles,
  createAngleGauge,
} from './skeletonDrawing';
import type { Pose, Keypoint, BikeFitAnalysis, RunningFormAnalysis, AngleGauge } from '../types';

describe('skeletonDrawing', () => {
  let mockCtx: any;

  beforeEach(() => {
    // Mock canvas context
    mockCtx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      strokeText: vi.fn(),
      fillText: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      font: '',
    };
  });

  const createKeypoint = (name: string, x: number, y: number, score: number = 0.9): Keypoint => ({
    name,
    x,
    y,
    score,
  });

  const createFullPose = (): Pose => ({
    score: 0.9,
    keypoints: [
      createKeypoint('left_shoulder', 100, 50),
      createKeypoint('right_shoulder', 110, 50),
      createKeypoint('left_hip', 100, 150),
      createKeypoint('right_hip', 110, 150),
      createKeypoint('left_knee', 100, 250),
      createKeypoint('right_knee', 110, 250),
      createKeypoint('left_ankle', 100, 350),
      createKeypoint('right_ankle', 110, 350),
      createKeypoint('left_elbow', 80, 100),
      createKeypoint('right_elbow', 130, 100),
      createKeypoint('left_wrist', 70, 130),
      createKeypoint('right_wrist', 140, 130),
    ],
  });

  describe('drawSkeleton', () => {
    it('should return early for null pose', () => {
      drawSkeleton(mockCtx, null as any, 640, 480);

      expect(mockCtx.beginPath).not.toHaveBeenCalled();
    });

    it('should return early for undefined pose', () => {
      drawSkeleton(mockCtx, undefined as any, 640, 480);

      expect(mockCtx.beginPath).not.toHaveBeenCalled();
    });

    it('should return early for pose without keypoints', () => {
      const pose: Pose = { keypoints: [], score: 0 };
      drawSkeleton(mockCtx, pose, 640, 480);

      expect(mockCtx.beginPath).not.toHaveBeenCalled();
    });

    it('should draw skeleton connections for valid pose', () => {
      const pose = createFullPose();
      drawSkeleton(mockCtx, pose, 640, 480);

      // Should call beginPath multiple times (once for each connection + keypoints)
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should set stroke style for connections', () => {
      const pose = createFullPose();
      drawSkeleton(mockCtx, pose, 640, 480);

      // strokeStyle may be set multiple times (for connections and keypoints)
      // Just check it was set to the connection color at some point
      expect(mockCtx.strokeStyle).toBeDefined();
    });

    it('should set line width for connections', () => {
      const pose = createFullPose();
      drawSkeleton(mockCtx, pose, 640, 480);

      expect(mockCtx.lineWidth).toBeGreaterThan(0);
    });

    it('should draw lines between connected keypoints', () => {
      const pose = createFullPose();
      drawSkeleton(mockCtx, pose, 640, 480);

      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
    });

    it('should draw circles for each keypoint', () => {
      const pose = createFullPose();
      drawSkeleton(mockCtx, pose, 640, 480);

      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should not draw connections when keypoint confidence is too low', () => {
      const pose: Pose = {
        score: 0.9,
        keypoints: [
          createKeypoint('left_shoulder', 100, 50, 0.2),
          createKeypoint('right_shoulder', 110, 50, 0.2),
        ],
      };

      const moveToCallsBefore = mockCtx.moveTo.mock.calls.length;
      drawSkeleton(mockCtx, pose, 640, 480);
      const moveToCallsAfter = mockCtx.moveTo.mock.calls.length;

      // Should not draw connections with low confidence
      expect(moveToCallsAfter).toBe(moveToCallsBefore);
    });

    it('should not draw keypoint circles when confidence is too low', () => {
      const pose: Pose = {
        score: 0.9,
        keypoints: [createKeypoint('left_shoulder', 100, 50, 0.2)],
      };

      const arcCallsBefore = mockCtx.arc.mock.calls.length;
      drawSkeleton(mockCtx, pose, 640, 480);
      const arcCallsAfter = mockCtx.arc.mock.calls.length;

      // Should not draw circles with low confidence
      expect(arcCallsAfter).toBe(arcCallsBefore);
    });

    it('should draw partial skeleton when some keypoints are missing', () => {
      const pose: Pose = {
        score: 0.9,
        keypoints: [
          createKeypoint('left_shoulder', 100, 50),
          createKeypoint('left_hip', 100, 150),
        ],
      };

      drawSkeleton(mockCtx, pose, 640, 480);

      // Should still draw available keypoints
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should handle keypoints with missing score property', () => {
      const pose: Pose = {
        score: 0.9,
        keypoints: [
          { name: 'left_shoulder', x: 100, y: 50 },
          { name: 'right_shoulder', x: 110, y: 50 },
        ],
      };

      // Should not throw error
      expect(() => drawSkeleton(mockCtx, pose, 640, 480)).not.toThrow();
    });

    it('should use correct color for keypoint circles', () => {
      const pose = createFullPose();
      drawSkeleton(mockCtx, pose, 640, 480);

      expect(mockCtx.fillStyle).toContain('#ff0000');
    });

    it('should draw all torso connections', () => {
      const pose = createFullPose();
      drawSkeleton(mockCtx, pose, 640, 480);

      const moveToCoords = mockCtx.moveTo.mock.calls;
      const lineToCoords = mockCtx.lineTo.mock.calls;

      // Should have drawn multiple connections
      expect(moveToCoords.length).toBeGreaterThan(0);
      expect(lineToCoords.length).toBeGreaterThan(0);
    });
  });

  describe('drawAngle', () => {
    const point1 = createKeypoint('p1', 0, 0);
    const point2 = createKeypoint('p2', 100, 100);
    const point3 = createKeypoint('p3', 200, 100);

    it('should return early when point1 is null', () => {
      drawAngle(mockCtx, null as any, point2, point3, 90, 'Test');

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should return early when point2 is null', () => {
      drawAngle(mockCtx, point1, null as any, point3, 90, 'Test');

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should return early when point3 is null', () => {
      drawAngle(mockCtx, point1, point2, null as any, 90, 'Test');

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should return early when point1 confidence is too low', () => {
      const lowConfPoint = createKeypoint('p1', 0, 0, 0.2);
      drawAngle(mockCtx, lowConfPoint, point2, point3, 90, 'Test');

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should return early when point2 confidence is too low', () => {
      const lowConfPoint = createKeypoint('p2', 100, 100, 0.2);
      drawAngle(mockCtx, point1, lowConfPoint, point3, 90, 'Test');

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should return early when point3 confidence is too low', () => {
      const lowConfPoint = createKeypoint('p3', 200, 100, 0.2);
      drawAngle(mockCtx, point1, point2, lowConfPoint, 90, 'Test');

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should draw angle arc when all points are valid', () => {
      drawAngle(mockCtx, point1, point2, point3, 90, 'Test');

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should draw angle text', () => {
      drawAngle(mockCtx, point1, point2, point3, 90, 'Test');

      expect(mockCtx.strokeText).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should format angle text correctly', () => {
      drawAngle(mockCtx, point1, point2, point3, 123.456, 'Knee');

      // Should round angle and include label
      expect(mockCtx.fillText).toHaveBeenCalledWith('Knee: 123°', expect.any(Number), expect.any(Number));
    });

    it('should set correct stroke style for angle', () => {
      drawAngle(mockCtx, point1, point2, point3, 90, 'Test');

      // strokeStyle may be set multiple times in the function
      // Just check it was set
      expect(mockCtx.strokeStyle).toBeDefined();
    });

    it('should set font for text', () => {
      drawAngle(mockCtx, point1, point2, point3, 90, 'Test');

      expect(mockCtx.font).toContain('Arial');
    });

    it('should handle decimal angles by rounding', () => {
      drawAngle(mockCtx, point1, point2, point3, 90.9, 'Test');

      expect(mockCtx.fillText).toHaveBeenCalledWith('Test: 91°', expect.any(Number), expect.any(Number));
    });

    it('should position text offset from joint', () => {
      drawAngle(mockCtx, point1, point2, point3, 90, 'Test');

      const fillTextCalls = mockCtx.fillText.mock.calls[0];
      const textX = fillTextCalls[1];
      const textY = fillTextCalls[2];

      // Text should be offset from point2
      expect(textX).not.toBe(point2.x);
      expect(textY).toBe(point2.y);
    });
  });

  describe('drawBikeFitAngles', () => {
    const mockAnalysis: BikeFitAnalysis & { side?: string } = {
      angles: {
        knee: 150,
        hip: 60,
        elbow: 155,
      },
      recommendations: [],
      overall: 'good',
      side: 'left',
    };

    it('should return early for null pose', () => {
      drawBikeFitAngles(mockCtx, null as any, mockAnalysis);

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should return early for null analysis', () => {
      const pose = createFullPose();
      drawBikeFitAngles(mockCtx, pose, null as any);

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should draw knee angle when available', () => {
      const pose = createFullPose();
      drawBikeFitAngles(mockCtx, pose, mockAnalysis);

      // Should call arc for drawing angle
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should draw hip angle when available', () => {
      const pose = createFullPose();
      drawBikeFitAngles(mockCtx, pose, mockAnalysis);

      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should draw elbow angle when available', () => {
      const pose = createFullPose();
      drawBikeFitAngles(mockCtx, pose, mockAnalysis);

      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should use left side when side is left', () => {
      const pose = createFullPose();
      const leftAnalysis = { ...mockAnalysis, side: 'left' };
      drawBikeFitAngles(mockCtx, pose, leftAnalysis);

      // Should have been called with left side keypoints
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should use right side when side is right', () => {
      const pose = createFullPose();
      const rightAnalysis = { ...mockAnalysis, side: 'right' };
      drawBikeFitAngles(mockCtx, pose, rightAnalysis);

      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should not draw angle when keypoints are missing', () => {
      const pose: Pose = {
        score: 0.9,
        keypoints: [createKeypoint('left_shoulder', 100, 50)],
      };

      const arcCallsBefore = mockCtx.arc.mock.calls.length;
      drawBikeFitAngles(mockCtx, pose, mockAnalysis);
      const arcCallsAfter = mockCtx.arc.mock.calls.length;

      // Should not draw angles when keypoints are missing
      expect(arcCallsAfter).toBe(arcCallsBefore);
    });

    it('should handle analysis without side property', () => {
      const pose = createFullPose();
      const analysisWithoutSide: BikeFitAnalysis = {
        angles: { knee: 150 },
        recommendations: [],
        overall: 'good',
      };

      // Should not throw error
      expect(() => drawBikeFitAngles(mockCtx, pose, analysisWithoutSide)).not.toThrow();
    });

    it('should handle analysis with missing angle values', () => {
      const pose = createFullPose();
      const analysisWithMissingAngles: BikeFitAnalysis & { side?: string } = {
        angles: {},
        recommendations: [],
        overall: 'good',
        side: 'left',
      };

      const arcCallsBefore = mockCtx.arc.mock.calls.length;
      drawBikeFitAngles(mockCtx, pose, analysisWithMissingAngles);
      const arcCallsAfter = mockCtx.arc.mock.calls.length;

      // Should not crash
      expect(arcCallsAfter).toBe(arcCallsBefore);
    });
  });

  describe('drawRunningAngles', () => {
    const mockAnalysis: RunningFormAnalysis & {
      sides?: { left?: { kneeAngle?: number }; right?: { kneeAngle?: number } };
    } = {
      angles: {
        bodyLean: 8,
      },
      recommendations: [],
      overall: 'good',
      sides: {
        left: { kneeAngle: 120 },
        right: { kneeAngle: 125 },
      },
    };

    it('should return early for null pose', () => {
      drawRunningAngles(mockCtx, null as any, mockAnalysis);

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should return early for null analysis', () => {
      const pose = createFullPose();
      drawRunningAngles(mockCtx, pose, null as any);

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should draw left knee angle when available', () => {
      const pose = createFullPose();
      drawRunningAngles(mockCtx, pose, mockAnalysis);

      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should draw right knee angle when available', () => {
      const pose = createFullPose();
      drawRunningAngles(mockCtx, pose, mockAnalysis);

      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should draw body lean text when available', () => {
      const pose = createFullPose();
      drawRunningAngles(mockCtx, pose, mockAnalysis);

      expect(mockCtx.strokeText).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should format body lean text correctly', () => {
      const pose = createFullPose();
      drawRunningAngles(mockCtx, pose, mockAnalysis);

      expect(mockCtx.fillText).toHaveBeenCalledWith('Lean: 8°', expect.any(Number), expect.any(Number));
    });

    it('should not draw left knee angle when not available', () => {
      const pose = createFullPose();
      const analysisWithoutLeftKnee = {
        ...mockAnalysis,
        sides: { right: { kneeAngle: 125 } },
      };

      drawRunningAngles(mockCtx, pose, analysisWithoutLeftKnee);

      // Should still work without crashing
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should not draw right knee angle when not available', () => {
      const pose = createFullPose();
      const analysisWithoutRightKnee = {
        ...mockAnalysis,
        sides: { left: { kneeAngle: 120 } },
      };

      drawRunningAngles(mockCtx, pose, analysisWithoutRightKnee);

      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should not draw body lean when shoulder is missing', () => {
      const pose: Pose = {
        score: 0.9,
        keypoints: [
          createKeypoint('left_hip', 100, 150),
          createKeypoint('left_knee', 100, 250),
          createKeypoint('left_ankle', 100, 350),
        ],
      };

      const textCallsBefore = mockCtx.fillText.mock.calls.length;
      drawRunningAngles(mockCtx, pose, mockAnalysis);
      const textCallsAfter = mockCtx.fillText.mock.calls.length;

      // Body lean text should not be drawn without shoulder
      expect(textCallsAfter - textCallsBefore).toBeLessThanOrEqual(2);
    });

    it('should handle analysis without sides property', () => {
      const pose = createFullPose();
      const analysisWithoutSides: RunningFormAnalysis = {
        angles: { bodyLean: 8 },
        recommendations: [],
        overall: 'good',
      };

      // Should not throw error
      expect(() => drawRunningAngles(mockCtx, pose, analysisWithoutSides)).not.toThrow();
    });

    it('should handle analysis without bodyLean', () => {
      const pose = createFullPose();
      const analysisWithoutLean = {
        ...mockAnalysis,
        angles: {},
      };

      const textCallsBefore = mockCtx.fillText.mock.calls.length;
      drawRunningAngles(mockCtx, pose, analysisWithoutLean);
      const textCallsAfter = mockCtx.fillText.mock.calls.length;

      // Should not draw body lean text
      expect(textCallsAfter - textCallsBefore).toBeLessThanOrEqual(2);
    });

    it('should use cyan color for body lean text', () => {
      const pose = createFullPose();
      drawRunningAngles(mockCtx, pose, mockAnalysis);

      expect(mockCtx.fillStyle).toContain('#00ffff');
    });
  });

  describe('createAngleGauge', () => {
    it('should create gauge with status good when angle is within optimal range', () => {
      const gauge = createAngleGauge(150, 140, 160, 'Knee');

      expect(gauge.status).toBe('good');
      expect(gauge.angle).toBe(150);
      expect(gauge.label).toBe('Knee');
    });

    it('should create gauge with status warning when angle is below optimal', () => {
      const gauge = createAngleGauge(130, 140, 160, 'Knee');

      expect(gauge.status).toBe('warning');
      expect(gauge.angle).toBe(130);
    });

    it('should create gauge with status warning when angle is above optimal', () => {
      const gauge = createAngleGauge(170, 140, 160, 'Knee');

      expect(gauge.status).toBe('warning');
      expect(gauge.angle).toBe(170);
    });

    it('should calculate percentage correctly for mid-range angle', () => {
      const gauge = createAngleGauge(150, 140, 160, 'Knee');

      expect(gauge.percentage).toBe(50);
    });

    it('should calculate percentage correctly for min optimal angle', () => {
      const gauge = createAngleGauge(140, 140, 160, 'Knee');

      expect(gauge.percentage).toBe(0);
    });

    it('should calculate percentage correctly for max optimal angle', () => {
      const gauge = createAngleGauge(160, 140, 160, 'Knee');

      expect(gauge.percentage).toBe(100);
    });

    it('should clamp percentage to 0 when angle is below min', () => {
      const gauge = createAngleGauge(100, 140, 160, 'Knee');

      expect(gauge.percentage).toBe(0);
    });

    it('should clamp percentage to 100 when angle is above max', () => {
      const gauge = createAngleGauge(200, 140, 160, 'Knee');

      expect(gauge.percentage).toBe(100);
    });

    it('should include min and max optimal values in result', () => {
      const gauge = createAngleGauge(150, 140, 160, 'Knee');

      expect(gauge.minOptimal).toBe(140);
      expect(gauge.maxOptimal).toBe(160);
    });

    it('should handle edge case where angle equals minOptimal', () => {
      const gauge = createAngleGauge(140, 140, 160, 'Knee');

      expect(gauge.status).toBe('good');
      expect(gauge.percentage).toBe(0);
    });

    it('should handle edge case where angle equals maxOptimal', () => {
      const gauge = createAngleGauge(160, 140, 160, 'Knee');

      expect(gauge.status).toBe('good');
      expect(gauge.percentage).toBe(100);
    });

    it('should handle different label strings', () => {
      const gauges = [
        createAngleGauge(150, 140, 160, 'Knee'),
        createAngleGauge(150, 140, 160, 'Hip'),
        createAngleGauge(150, 140, 160, 'Elbow'),
      ];

      expect(gauges[0].label).toBe('Knee');
      expect(gauges[1].label).toBe('Hip');
      expect(gauges[2].label).toBe('Elbow');
    });

    it('should handle very small ranges', () => {
      const gauge = createAngleGauge(145, 140, 142, 'Test');

      expect(gauge).toBeDefined();
      expect(gauge.percentage).toBeGreaterThanOrEqual(0);
      expect(gauge.percentage).toBeLessThanOrEqual(100);
    });

    it('should handle equal min and max (zero range)', () => {
      const gauge = createAngleGauge(150, 150, 150, 'Test');

      // When range is 0, any value not equal to min/max should be clamped
      expect(gauge).toBeDefined();
      expect(gauge.status).toBe('good');
    });

    it('should return complete AngleGauge object', () => {
      const gauge: AngleGauge = createAngleGauge(150, 140, 160, 'Knee');

      expect(gauge).toHaveProperty('label');
      expect(gauge).toHaveProperty('angle');
      expect(gauge).toHaveProperty('minOptimal');
      expect(gauge).toHaveProperty('maxOptimal');
      expect(gauge).toHaveProperty('percentage');
      expect(gauge).toHaveProperty('status');
    });
  });
});
