import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DetailedMetrics from './DetailedMetrics';
import type { DetailedMetrics as DetailedMetricsType, Asymmetry, FrameData } from '../types';

describe('DetailedMetrics', () => {
  it('should return null when metrics is null', () => {
    const { container } = render(
      <DetailedMetrics metrics={null} asymmetry={null} frameData={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render metrics when provided', () => {
    const metrics: DetailedMetricsType = {
      kneeAngle: {
        min: 90,
        max: 110,
        avg: 100,
        stdDev: 5,
        range: 20,
        consistency: 95,
        values: [90, 95, 100, 105, 110],
      },
    };

    render(<DetailedMetrics metrics={metrics} asymmetry={null} frameData={[]} />);

    expect(screen.getByText(/detailed metrics/i)).toBeInTheDocument();
  });

  it('should display knee angle statistics', () => {
    const metrics: DetailedMetricsType = {
      kneeAngle: {
        min: 90,
        max: 110,
        avg: 100,
        stdDev: 5,
        range: 20,
        consistency: 95,
        values: [90, 95, 100, 105, 110],
      },
    };

    render(<DetailedMetrics metrics={metrics} asymmetry={null} frameData={[]} />);

    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/90/)).toBeInTheDocument();
    expect(screen.getByText(/110/)).toBeInTheDocument();
  });

  it('should display asymmetry data when provided', () => {
    const metrics: DetailedMetricsType = {
      kneeAngle: {
        min: 90,
        max: 110,
        avg: 100,
        stdDev: 5,
        range: 20,
        consistency: 95,
        values: [90, 95, 100, 105, 110],
      },
    };

    const asymmetry: Asymmetry = {
      kneeAngle: {
        left: 100,
        right: 105,
        difference: 5,
        percentDiff: 5,
        status: 'balanced',
      },
    };

    render(<DetailedMetrics metrics={metrics} asymmetry={asymmetry} frameData={[]} />);

    expect(screen.getByText(/Left vs Right Balance/i)).toBeInTheDocument();
  });

  it('should handle multiple angle metrics', () => {
    const metrics: DetailedMetricsType = {
      kneeAngle: {
        min: 90,
        max: 110,
        avg: 100,
        stdDev: 5,
        range: 20,
        consistency: 95,
        values: [90, 95, 100, 105, 110],
      },
      hipAngle: {
        min: 40,
        max: 60,
        avg: 50,
        stdDev: 4,
        range: 20,
        consistency: 92,
        values: [40, 45, 50, 55, 60],
      },
    };

    const { container } = render(
      <DetailedMetrics metrics={metrics} asymmetry={null} frameData={[]} />
    );

    expect(container.textContent).toContain('100');
    expect(container.textContent).toContain('50');
  });

  it('should render with empty frame data', () => {
    const metrics: DetailedMetricsType = {
      kneeAngle: {
        min: 90,
        max: 110,
        avg: 100,
        stdDev: 5,
        range: 20,
        consistency: 95,
        values: [],
      },
    };

    const { container } = render(
      <DetailedMetrics metrics={metrics} asymmetry={null} frameData={[]} />
    );

    expect(container.firstChild).not.toBeNull();
  });
});
