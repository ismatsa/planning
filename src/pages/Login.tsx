import { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import logo from '@/assets/powertech-full.png';

export default function Login() {
  const { login, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSignup) {
      const err = await signup(email, password);
      if (err) {
        setError(err);
      } else {
        setSignupSuccess(true);
      }
    } else {
      const err = await login(email, password);
      if (err) {
        setError('Email ou mot de passe incorrect.');
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center pb-2">
          <img src={logo} alt="PowerTech" className="h-12 object-contain mb-3" />
          <CardTitle className="text-lg font-display">
            {isSignup ? 'Créer un compte' : 'Connexion'}
          </CardTitle>
          <CardDescription>
            {isSignup ? 'Créez votre compte administrateur.' : 'Accédez à votre espace de gestion.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signupSuccess ? (
            <div className="text-center py-4">
              <p className="text-sm text-green-600 font-medium">Compte créé avec succès !</p>
              <p className="text-sm text-muted-foreground mt-1">Vérifiez votre email pour confirmer, puis connectez-vous.</p>
              <Button variant="outline" className="mt-4" onClick={() => { setIsSignup(false); setSignupSuccess(false); }}>
                Se connecter
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoFocus
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Chargement…' : isSignup ? 'Créer le compte' : 'Se connecter'}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                onClick={() => { setIsSignup(!isSignup); setError(''); }}
              >
                {isSignup ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
