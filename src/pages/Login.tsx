import { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import logo from '@/assets/powertech-full.png';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!login(username, password)) {
      setError('Identifiant ou mot de passe incorrect.');
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center pb-2">
          <img src={logo} alt="PowerTech" className="h-12 object-contain mb-3" />
          <CardTitle className="text-lg font-display">Connexion</CardTitle>
          <CardDescription>Accédez à votre espace de gestion.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="username">Identifiant</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
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
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full">
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
