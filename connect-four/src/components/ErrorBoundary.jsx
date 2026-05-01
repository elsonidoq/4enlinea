import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    Sentry.captureException(error, { extra: info });
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onRetry }) {
  const { t } = useTranslation();
  return (
    <div style={{ padding: 32, textAlign: 'center', color: '#fff' }}>
      <p>{t('error.generic')}</p>
      <button onClick={onRetry} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  );
}
