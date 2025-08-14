import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Declare optional gtag for type-safety
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Hata raporlama servisi entegrasyonu için
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <AlertTriangle 
                size={64} 
                className="mx-auto text-red-500 mb-4" 
              />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Bir şeyler ters gitti
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Bu bölümde beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya tekrar deneyin.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
                  <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300">
                    Hata Detayları (Geliştirici Modu)
                  </summary>
                  <pre className="text-xs text-red-600 dark:text-red-400 mt-2 overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw size={16} className="mr-2" />
                Tekrar Dene
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="block w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Sayfayı Yenile
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;