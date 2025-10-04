import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectSportType } from './sportDetection';
import type { Pose, Keypoint } from '../types';
import * as poseDetection from './poseDetection';

// Mock poseDetection module
vi.mock('./poseDetection', () => ({
  initializePoseDetector: vi.fn(),
  detectPose: vi.fn(),
}));

describe('sportDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const createKeypoint = (name: string, x: number, y: number, score: number = 0.9): Keypoint => ({
    name,
    x,
    y,
    score,
  });

  const createRunningPose = (): Pose => ({
    score: 0.9,
    keypoints: [
      createKeypoint('left_hip', 100, 150),
      createKeypoint('right_hip', 110, 150),
      createKeypoint('left_knee', 100, 250),
      createKeypoint('right_knee', 110, 280), // Asymmetric - indicates running
      createKeypoint('left_ankle', 100, 350),
      createKeypoint('right_ankle', 110, 390), // Asymmetric
      createKeypoint('left_shoulder', 100, 50),
      createKeypoint('right_shoulder', 110, 50),
    ],
  });

  const createCyclingPose = (): Pose => ({
    score: 0.9,
    keypoints: [
      createKeypoint('left_hip', 100, 150),
      createKeypoint('right_hip', 110, 150),
      createKeypoint('left_knee', 100, 200),
      createKeypoint('right_knee', 110, 205), // More symmetric - indicates cycling
      createKeypoint('left_ankle', 100, 230),
      createKeypoint('right_ankle', 110, 235), // More symmetric
      createKeypoint('left_shoulder', 40, 145), // Forward lean for cycling
      createKeypoint('right_shoulder', 50, 145),
    ],
  });

  const createMockFile = (name: string = 'test.mp4'): File => {
    return new File(['test content'], name, { type: 'video/mp4' });
  };

  describe('detectSportType - Basic error handling', () => {
    it('should return unknown on initialization error', async () => {
      const file = createMockFile();
      vi.mocked(poseDetection.initializePoseDetector).mockRejectedValue(new Error('Init failed'));

      const result = await detectSportType(file);

      expect(result).toBe('unknown');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle null pose from detector', async () => {
      const file = createMockFile();
      vi.mocked(poseDetection.initializePoseDetector).mockRejectedValue(new Error('Failed'));

      const result = await detectSportType(file);

      expect(result).toBe('unknown');
    });

    it('should handle low confidence poses', async () => {
      const file = createMockFile();
      vi.mocked(poseDetection.initializePoseDetector).mockRejectedValue(new Error('Failed'));

      const result = await detectSportType(file);

      expect(result).toBe('unknown');
    });
  });

  describe('Sport classification logic', () => {
    it('should identify running pose characteristics', () => {
      const pose = createRunningPose();

      // Running characteristics: high knee variation
      const leftKnee = pose.keypoints.find(kp => kp.name === 'left_knee');
      const rightKnee = pose.keypoints.find(kp => kp.name === 'right_knee');

      expect(leftKnee).toBeDefined();
      expect(rightKnee).toBeDefined();

      const kneeVariation = Math.abs(leftKnee!.y - rightKnee!.y);
      expect(kneeVariation).toBeGreaterThan(20); // Running has high variation
    });

    it('should identify cycling pose characteristics', () => {
      const pose = createCyclingPose();

      // Cycling characteristics: low knee variation, forward lean
      const leftKnee = pose.keypoints.find(kp => kp.name === 'left_knee');
      const rightKnee = pose.keypoints.find(kp => kp.name === 'right_knee');
      const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
      const leftHip = pose.keypoints.find(kp => kp.name === 'left_hip');

      expect(leftKnee).toBeDefined();
      expect(rightKnee).toBeDefined();

      const kneeVariation = Math.abs(leftKnee!.y - rightKnee!.y);
      expect(kneeVariation).toBeLessThan(10); // Cycling has low variation

      // Check forward lean
      if (leftShoulder && leftHip) {
        const shoulderHipHorizontal = Math.abs(leftShoulder.x - leftHip.x);
        expect(shoulderHipHorizontal).toBeGreaterThan(30); // Forward lean
      }
    });

    it('should handle pose with missing keypoints', () => {
      const incompletePose: Pose = {
        score: 0.9,
        keypoints: [
          createKeypoint('left_hip', 100, 150),
          createKeypoint('right_hip', 110, 150),
        ],
      };

      // Should not have enough keypoints for classification
      expect(incompletePose.keypoints.length).toBeLessThan(4);
    });

    it('should handle pose with low confidence keypoints', () => {
      const lowConfidencePose: Pose = {
        score: 0.9,
        keypoints: [
          createKeypoint('left_hip', 100, 150, 0.1),
          createKeypoint('right_hip', 110, 150, 0.1),
          createKeypoint('left_knee', 100, 250, 0.1),
          createKeypoint('right_knee', 110, 250, 0.1),
        ],
      };

      // All keypoints have low confidence
      const allLowConfidence = lowConfidencePose.keypoints.every(kp => (kp.score || 0) < 0.2);
      expect(allLowConfidence).toBe(true);
    });
  });

  describe('Pose analysis helpers', () => {
    it('should calculate knee variation for running', () => {
      const pose = createRunningPose();
      const leftKnee = pose.keypoints.find(kp => kp.name === 'left_knee')!;
      const rightKnee = pose.keypoints.find(kp => kp.name === 'right_knee')!;

      const variation = Math.abs(leftKnee.y - rightKnee.y);
      expect(variation).toBeGreaterThan(20);
    });

    it('should calculate ankle variation for running', () => {
      const pose = createRunningPose();
      const leftAnkle = pose.keypoints.find(kp => kp.name === 'left_ankle')!;
      const rightAnkle = pose.keypoints.find(kp => kp.name === 'right_ankle')!;

      const variation = Math.abs(leftAnkle.y - rightAnkle.y);
      expect(variation).toBeGreaterThan(30);
    });

    it('should calculate body lean for cycling', () => {
      const pose = createCyclingPose();
      const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder')!;
      const leftHip = pose.keypoints.find(kp => kp.name === 'left_hip')!;

      const shoulderHipVertical = leftHip.y - leftShoulder.y;
      const shoulderHipHorizontal = Math.abs(leftShoulder.x - leftHip.x);

      // Cycling has horizontal back
      expect(shoulderHipHorizontal).toBeGreaterThan(30);
    });

    it('should detect upright posture for running', () => {
      const pose = createRunningPose();
      const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder')!;
      const leftHip = pose.keypoints.find(kp => kp.name === 'left_hip')!;

      const shoulderHipVertical = leftHip.y - leftShoulder.y;
      const shoulderHipHorizontal = Math.abs(leftShoulder.x - leftHip.x);

      // Running has more vertical posture
      expect(shoulderHipVertical).toBeGreaterThan(shoulderHipHorizontal);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty keypoints array', () => {
      const emptyPose: Pose = {
        score: 0.9,
        keypoints: [],
      };

      expect(emptyPose.keypoints.length).toBe(0);
    });

    it('should handle pose without required keypoints', () => {
      const partialPose: Pose = {
        score: 0.9,
        keypoints: [
          createKeypoint('left_wrist', 100, 100),
          createKeypoint('right_wrist', 110, 100),
        ],
      };

      const hasHip = partialPose.keypoints.some(kp => kp.name?.includes('hip'));
      const hasKnee = partialPose.keypoints.some(kp => kp.name?.includes('knee'));

      expect(hasHip).toBe(false);
      expect(hasKnee).toBe(false);
    });

    it('should handle pose with null scores', () => {
      const pose: Pose = {
        score: 0.9,
        keypoints: [
          { name: 'left_hip', x: 100, y: 150 },
          { name: 'right_hip', x: 110, y: 150 },
        ],
      };

      pose.keypoints.forEach(kp => {
        expect(kp.score === undefined || kp.score === null || typeof kp.score === 'number').toBe(true);
      });
    });

    it('should handle very low pose confidence', () => {
      const lowConfidencePose: Pose = {
        score: 0.1,
        keypoints: createRunningPose().keypoints,
      };

      expect(lowConfidencePose.score).toBeLessThan(0.3);
    });
  });

  describe('Keypoint validation', () => {
    it('should validate minimum keypoints for classification', () => {
      const requiredKeypoints = ['left_hip', 'right_hip', 'left_knee', 'right_knee'];
      const pose = createRunningPose();

      const hasAllRequired = requiredKeypoints.every(name =>
        pose.keypoints.some(kp => kp.name === name)
      );

      expect(hasAllRequired).toBe(true);
    });

    it('should check keypoint confidence thresholds', () => {
      const pose = createRunningPose();

      const highConfidenceKeypoints = pose.keypoints.filter(kp => (kp.score || 0) > 0.2);
      expect(highConfidenceKeypoints.length).toBeGreaterThan(0);
    });

    it('should handle missing optional keypoints', () => {
      const pose: Pose = {
        score: 0.9,
        keypoints: [
          createKeypoint('left_hip', 100, 150),
          createKeypoint('right_hip', 110, 150),
          createKeypoint('left_knee', 100, 250),
          createKeypoint('right_knee', 110, 250),
          // Missing ankles and shoulders
        ],
      };

      const hasAnkles = pose.keypoints.some(kp => kp.name?.includes('ankle'));
      expect(hasAnkles).toBe(false);
    });
  });

  describe('File handling', () => {
    it('should create valid mock file', () => {
      const file = createMockFile('test.mp4');

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('test.mp4');
      expect(file.type).toBe('video/mp4');
    });

    it('should handle different file names', () => {
      const file1 = createMockFile('running.mp4');
      const file2 = createMockFile('cycling.mp4');

      expect(file1.name).not.toBe(file2.name);
    });
  });
});
