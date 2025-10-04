# Sports Performance Analysis

## About

This is an app where you can upload video to be analysed and it'll give you insights about your posture and movement for Running or Cycling. The app was **completely generated with Claude AI** just for fun and experimentation.

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

**Video Processing:**
- MediaRecorder API - Video recording
- Canvas API - Video frame analysis

### Project Structure
- `/src/components` - React components
- `/src/__tests__` - Test files
- `/src/App.tsx` - Main application component

### Development Server
The project uses Vite with Hot Module Replacement (HMR) for fast refresh during development.
