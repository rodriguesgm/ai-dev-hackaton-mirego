import './DetailedMetrics.css';
import { getConsistencyRating, getAsymmetryStatus } from '../utils/detailedMetrics';

function DetailedMetrics({ metrics, asymmetry, frameData }) {
  if (!metrics) return null;

  return (
    <div className="detailed-metrics">
      <h4>Detailed Metrics</h4>

      {/* Angle Statistics Table */}
      <div className="metrics-table-container">
        <table className="metrics-table">
          <thead>
            <tr>
              <th>Angle</th>
              <th>Min</th>
              <th>Avg</th>
              <th>Max</th>
              <th>Range</th>
              <th>Consistency</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(metrics).map(([key, data]) => {
              const rating = getConsistencyRating(data.consistency);
              return (
                <tr key={key}>
                  <td className="angle-name">{formatAngleName(key)}</td>
                  <td>{data.min}°</td>
                  <td className="avg-value">{data.avg}°</td>
                  <td>{data.max}°</td>
                  <td>{data.range}°</td>
                  <td>
                    <span
                      className="consistency-badge"
                      style={{ backgroundColor: rating.color }}
                    >
                      {data.consistency}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Frame-by-Frame Mini Chart */}
      {frameData && frameData.length > 0 && (
        <div className="frame-chart-section">
          <h5>Frame-by-Frame Variation</h5>
          <div className="mini-charts">
            {Object.keys(metrics).map(angleKey => (
              <div key={angleKey} className="mini-chart">
                <div className="chart-label">{formatAngleName(angleKey)}</div>
                <div className="chart-bars">
                  {frameData.map((frame, index) => {
                    const value = frame[angleKey];
                    if (value === undefined) return null;

                    const { min, max } = metrics[angleKey];
                    const height = max > min ? ((value - min) / (max - min)) * 100 : 50;

                    return (
                      <div
                        key={index}
                        className="chart-bar"
                        style={{ height: `${height}%` }}
                        title={`Frame ${frame.frame}: ${value}°`}
                      />
                    );
                  })}
                </div>
                <div className="chart-range">
                  <span>{metrics[angleKey].min}°</span>
                  <span>{metrics[angleKey].max}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Left vs Right Asymmetry */}
      {asymmetry && Object.keys(asymmetry).length > 0 && (
        <div className="asymmetry-section">
          <h5>Left vs Right Balance</h5>
          <div className="asymmetry-cards">
            {Object.entries(asymmetry).map(([key, data]) => {
              const status = getAsymmetryStatus(data.status);
              return (
                <div key={key} className="asymmetry-card">
                  <div className="asymmetry-header">
                    <span className="asymmetry-name">{formatAngleName(key)}</span>
                    <span
                      className="asymmetry-status"
                      style={{ color: status.color }}
                    >
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <div className="asymmetry-values">
                    <div className="side-value">
                      <span className="side-label">Left</span>
                      <span className="side-angle">{data.left}°</span>
                    </div>
                    <div className="diff-indicator">
                      <span className="diff-value">{data.difference}°</span>
                      <span className="diff-percent">({data.percentDiff}%)</span>
                    </div>
                    <div className="side-value">
                      <span className="side-label">Right</span>
                      <span className="side-angle">{data.right}°</span>
                    </div>
                  </div>
                  <div className="balance-bar">
                    <div
                      className="balance-fill left"
                      style={{
                        width: `${(data.left / (data.left + data.right)) * 100}%`,
                      }}
                    ></div>
                    <div
                      className="balance-fill right"
                      style={{
                        width: `${(data.right / (data.left + data.right)) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatAngleName(key) {
  const nameMap = {
    knee: 'Knee',
    hip: 'Hip',
    elbow: 'Elbow',
    back: 'Back',
    bodyLean: 'Body Lean',
    kneeLift: 'Knee Lift',
    hipExtension: 'Hip Extension',
    armSwing: 'Arm Swing',
    kneeAngle: 'Knee',
    hipAngle: 'Hip',
    armAngle: 'Arm',
  };
  return nameMap[key] || key;
}

export default DetailedMetrics;
