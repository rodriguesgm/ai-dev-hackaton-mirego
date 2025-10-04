import { useState } from 'react';
import './App.css';
import BikeFitAnalysis from './components/BikeFitAnalysis';

function App() {
  const [video, setVideo] = useState(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [analysisType, setAnalysisType] = useState(null); // 'bike' or 'running'

  const validateVideo = (file) => {
    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      return 'Please select a valid video file';
    }

    // Check file size (20MB = 20 * 1024 * 1024 bytes)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Video size must be less than 20MB';
    }

    return null;
  };

  const checkVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 30) {
          reject('Video duration must be less than 30 seconds');
        } else {
          resolve();
        }
      };

      video.onerror = () => {
        reject('Error loading video file');
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setError('');
    setPreview('');
    setAnalysisType(null);

    if (!file) {
      setVideo(null);
      return;
    }

    // Validate file type and size
    const validationError = validateVideo(file);
    if (validationError) {
      setError(validationError);
      setVideo(null);
      e.target.value = '';
      return;
    }

    // Check video duration
    try {
      await checkVideoDuration(file);
      setVideo(file);
      setPreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err);
      setVideo(null);
      e.target.value = '';
    }
  };

  const handleBikeAnalysis = () => {
    if (!video) {
      setError('Please select a video file');
      return;
    }
    setAnalysisType('bike');
  };

  const handleRunningAnalysis = () => {
    if (!video) {
      setError('Please select a video file');
      return;
    }
    setAnalysisType('running');
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Sports Performance Analysis</h1>
        <p className="subtitle">Upload a training video (max 30 seconds, 20MB)</p>

        <div className="upload-form">
          <div className="file-input-wrapper">
            <label htmlFor="video-input" className="file-label">
              Choose Video File
            </label>
            <input
              id="video-input"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="file-input"
            />
          </div>

          {video && (
            <div className="file-info">
              <p><strong>File:</strong> {video.name}</p>
              <p><strong>Size:</strong> {(video.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          )}

          {preview && (
            <div className="preview">
              <video controls width="100%" src={preview}></video>
            </div>
          )}

          {error && <div className="error">{error}</div>}

          {video && !analysisType && (
            <div className="analysis-buttons">
              <button type="button" onClick={handleBikeAnalysis} className="analyze-btn bike-btn">
                Analyze Bike Fit
              </button>
              <button type="button" onClick={handleRunningAnalysis} className="analyze-btn running-btn">
                Analyze Running Form
              </button>
            </div>
          )}

          {analysisType === 'bike' && <BikeFitAnalysis videoFile={video} />}

          {analysisType === 'running' && (
            <div className="coming-soon">
              <p>🏃 Running form analysis coming soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
