import { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function Profil() {
  const { user, updateEmail, updatePassword, isAdmin } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Update email if changed
    if (email !== user?.email) {
      const err = await updateEmail(email);
      if (err) {
        toast({ title: 'Erreur', description: err, variant: 'destructive' });
        setLoading(false);
        return;
      }
    }

    // Update password if provided
    if (password) {
      if (password !== confirmPassword) {
        toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        toast({ title: 'Erreur', description: 'Le mot de passe doit faire au moins 6 caractères.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const err = await updatePassword(password);
      if (err) {
        toast({ title: 'Erreur', description: err, variant: 'destructive' });
        setLoading(false);
        return;
      }
    }

    toast({ title: 'Profil mis à jour', description: 'Vos informations ont été modifiées avec succès.' });
    setPassword('');
    setConfirmPassword('');
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">Modifiez vos informations de connexion.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Identifiants</CardTitle>
          <CardDescription>Ces informations seront utilisées pour vous connecter.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="prof-email">Email</Label>
              <Input id="prof-email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!isAdmin} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prof-pass">Nouveau mot de passe</Label>
              <Input id="prof-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="prof-confirm">Confirmer le mot de passe</Label>
              <Input id="prof-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
