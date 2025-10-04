import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock the sport detection utility
vi.mock('./utils/sportDetection', () => ({
  detectSportType: vi.fn().mockResolvedValue('cycling'),
}));

// Mock the components
vi.mock('./components/BikeFitAnalysis', () => ({
  default: ({ videoFile }: { videoFile: File }) => (
    <div data-testid="bike-fit-analysis">Bike Fit Analysis: {videoFile.name}</div>
  ),
}));

vi.mock('./components/RunningFormAnalysis', () => ({
  default: ({ videoFile }: { videoFile: File }) => (
    <div data-testid="running-form-analysis">Running Form Analysis: {videoFile.name}</div>
  ),
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('App', () => {
  it('should render the main title', () => {
    render(<App />);
    expect(screen.getByText('Sports Performance Analysis')).toBeInTheDocument();
  });

  it('should render the subtitle with file constraints', () => {
    render(<App />);
    expect(screen.getByText(/max 30 seconds, 20MB/i)).toBeInTheDocument();
  });

  it('should render file input', () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/choose video file/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'video/*');
  });

  it('should show error for non-video file', async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/choose video file/i) as HTMLInputElement;

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/please select a valid video file/i)).toBeInTheDocument();
    });
  });

  it('should show error for file larger than 20MB', async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/choose video file/i) as HTMLInputElement;

    // Create a mock video file larger than 20MB
    const largeFile = new File(['x'.repeat(21 * 1024 * 1024)], 'large-video.mp4', {
      type: 'video/mp4',
    });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/video size must be less than 20MB/i)).toBeInTheDocument();
    });
  });

  it('should display file info when valid video is selected', async () => {
    const originalCreateElement = document.createElement.bind(document);

    // Mock video element and its methods
    const mockVideo = originalCreateElement('video');
    Object.defineProperty(mockVideo, 'duration', { value: 25, writable: true });

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'video') {
        setTimeout(() => {
          mockVideo.dispatchEvent(new Event('loadedmetadata'));
        }, 0);
        return mockVideo;
      }
      return originalCreateElement(tagName);
    });

    render(<App />);
    const fileInput = screen.getByLabelText(/choose video file/i) as HTMLInputElement;

    const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test-video.mp4/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    createElementSpy.mockRestore();
  });

  it('should show analysis buttons after video is loaded', async () => {
    const originalCreateElement = document.createElement.bind(document);

    // Mock video element
    const mockVideo = originalCreateElement('video');
    Object.defineProperty(mockVideo, 'duration', { value: 25, writable: true });

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'video') {
        setTimeout(() => {
          mockVideo.dispatchEvent(new Event('loadedmetadata'));
        }, 0);
        return mockVideo;
      }
      return originalCreateElement(tagName);
    });

    render(<App />);
    const fileInput = screen.getByLabelText(/choose video file/i) as HTMLInputElement;

    const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const bikeButton = screen.queryByText(/analyze bike fit/i);
      const runningButton = screen.queryByText(/analyze running form/i);
      expect(bikeButton || runningButton).toBeInTheDocument();
    }, { timeout: 3000 });

    createElementSpy.mockRestore();
  });

  it('should show BikeFitAnalysis component when bike button is clicked', async () => {
    const originalCreateElement = document.createElement.bind(document);

    // Mock video element
    const mockVideo = originalCreateElement('video');
    Object.defineProperty(mockVideo, 'duration', { value: 25, writable: true });

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'video') {
        setTimeout(() => {
          mockVideo.dispatchEvent(new Event('loadedmetadata'));
        }, 0);
        return mockVideo;
      }
      return originalCreateElement(tagName);
    });

    render(<App />);
    const fileInput = screen.getByLabelText(/choose video file/i) as HTMLInputElement;

    const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const bikeButton = screen.getByText(/analyze bike fit/i);
      expect(bikeButton).toBeInTheDocument();
      fireEvent.click(bikeButton);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByTestId('bike-fit-analysis')).toBeInTheDocument();
    });

    createElementSpy.mockRestore();
  });
});
