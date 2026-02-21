import { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function Profil() {
  const { credentials, updateCredentials } = useAuth();
  const [username, setUsername] = useState(credentials.username);
  const [password, setPassword] = useState(credentials.password);
  const [confirmPassword, setConfirmPassword] = useState(credentials.password);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      toast({ title: 'Erreur', description: "L'identifiant ne peut pas être vide.", variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas.', variant: 'destructive' });
      return;
    }
    if (password.length < 3) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit faire au moins 3 caractères.', variant: 'destructive' });
      return;
    }
    updateCredentials({ username: username.trim(), password });
    toast({ title: 'Profil mis à jour', description: 'Vos identifiants ont été modifiés avec succès.' });
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">Modifiez vos identifiants de connexion.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Identifiants</CardTitle>
          <CardDescription>Ces informations seront utilisées pour vous connecter.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="prof-user">Identifiant</Label>
              <Input id="prof-user" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prof-pass">Nouveau mot de passe</Label>
              <Input id="prof-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prof-confirm">Confirmer le mot de passe</Label>
              <Input id="prof-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
