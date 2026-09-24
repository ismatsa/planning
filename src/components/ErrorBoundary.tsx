import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Erreur applicative:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground">
              L'affichage de cette page a échoué. Vos données ne sont pas perdues.
            </p>
            <p className="text-xs text-muted-foreground break-words">{this.state.error.message}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => this.setState({ error: null })}>Réessayer</Button>
              <Button variant="outline" onClick={() => window.location.assign('/')}>
                Retour à l'accueil
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
