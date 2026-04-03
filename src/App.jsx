import React from 'react';
import LandingPage from './pages/LandingPage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('React Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: "'Inter', sans-serif" }}>
          <h1 style={{ color: 'red' }}>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 20 }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Main App Component
 * Gallery Wall Configurator - React + JavaScript + Tailwind CSS
 */
function App() {
  return (
    <ErrorBoundary>
      <LandingPage />
    </ErrorBoundary>
  );
}

export default App;
