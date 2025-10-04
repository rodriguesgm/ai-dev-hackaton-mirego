# Sports Performance Analysis

## About

This is an app where you can upload video to be analysed and it'll give you insights about your posture and movement for Running or Cycling. The app was **completely generated with Claude AI** just for fun and experimentation.

For development notes about this experience with Claude, see [notes.txt](./notes.txt).

### Demo

[Watch Demo Video](./demo.mov)

> **Note:** The video used for the demo analyses was sourced from YouTube as a publicly available video. The analysis results shown are for demonstration purposes only and may not be accurate, as they have not been validated by health professionals. This demo serves solely as an example of how the application performs.

**⚠️ IMPORTANT DISCLAIMER:** This application has NOT been validated by health professionals. It is a proof-of-concept project and should NOT be used for actual medical or health assessments.

## How to Run

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation & Startup
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## How to Test

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Test coverage reports will be generated in the `coverage/` directory.

## Development

### Tech Stack

**Frontend:**
- React 18 - UI framework
- TypeScript - Type-safe JavaScript
- Vite - Build tool and dev server
- TailwindCSS - Utility-first CSS framework

**Testing:**
- Vitest - Test runner
- @testing-library/react - React component testing
- jsdom - DOM environment for tests

**Video Analysis & AI:**
- **TensorFlow.js** - Machine learning library for JavaScript
- **@tensorflow-models/pose-detection** - Pose estimation models
- **MoveNet** - Lightweight pose detection model for real-time analysis
- **Canvas API** - Frame extraction and skeleton visualization
- **MediaRecorder API** - Video recording capabilities

**Analysis Process:**
1. **Frame Sampling**: Extracts 24 frames evenly distributed across the video
2. **Pose Detection**: Uses MoveNet to detect 17 body keypoints per frame
3. **Angle Calculation**: Computes joint angles (knee, hip, elbow, back, etc.)
4. **Metrics Analysis**: Calculates consistency, asymmetry, and frame-by-frame variations
5. **Sport-Specific Evaluation**: Compares measurements against optimal ranges for cycling or running

**Generated Reports:**
- **Performance Summary**: Personalized overview with specific measurements
  - What you're doing well (strengths with exact angles)
  - Areas to improve (specific issues with measurements)
  - Top priority action item with recommended drills
- **Detailed Metrics**: Statistical analysis of all angles
  - Min/Max/Average values
  - Consistency percentages
  - Range variations
- **Asymmetry Analysis**: Left vs. right balance comparison
  - Percentage differences
  - Visual balance indicators
  - Status classification (balanced/minor/significant)
- **Visual Analysis**: Skeleton overlay with angle markers
- **Interactive Timeline**: Frame-by-frame video scrubbing with issue markers
- **Prioritized Recommendations**: Severity-based suggestions (critical/moderate/minor)
  - Specific impacts on performance
  - Actionable drills and exercises

### Project Structure
- `/src/components` - React components
- `/src/__tests__` - Test files
- `/src/App.tsx` - Main application component

### Development Server
The project uses Vite with Hot Module Replacement (HMR) for fast refresh during development.
