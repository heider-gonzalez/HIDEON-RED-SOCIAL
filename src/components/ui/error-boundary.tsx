import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if this is a DOM manipulation error that could cause infinite loops
    if (error.message.includes('insertBefore') || error.message.includes('removeChild') || error.message.includes('appendChild')) {
      console.warn('⚠️ DOM manipulation error detected - preventing potential infinite loop');
      // Don't reload on DOM manipulation errors to prevent loops
      return;
    }
    
    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log to monitoring service if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        error_id: this.state.errorId
      });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="p-6 m-4 max-w-md mx-auto">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">¡Oops! Algo salió mal</h3>
              <p className="text-sm text-muted-foreground">
                Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 p-3 bg-muted rounded-md text-left">
                  <summary className="cursor-pointer text-sm font-medium">
                    Detalles del error (dev)
                  </summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap overflow-auto">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={this.handleRetry}
                className="flex items-center gap-2"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
                Intentar de nuevo
              </Button>
              
              {/* Temporarily disable page reload to prevent error loops */}
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                size="sm"
                disabled
              >
                Recargar página (deshabilitado)
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// React hook version for functional components
export function useErrorHandler() {
  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // Log to monitoring service
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  };

  return { handleError };
}