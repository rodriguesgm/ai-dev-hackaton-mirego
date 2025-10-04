interface AnalysisLoaderProps {
  progress: number;
  message: string;
}

/**
 * Generic loading component for video analysis
 */
function AnalysisLoader({ progress, message }: AnalysisLoaderProps) {
  return (
    <div className="analyzing">
      <div className="loader"></div>
      <p>{message}</p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <p className="progress-text">{Math.round(progress)}%</p>
    </div>
  );
}

export default AnalysisLoader;
