import { useStore } from '@/store/StoreContext';
import { METIERS } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const JOURS_LABELS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
];

export default function Parametres() {
  const { postes, settings, setSettings, setPostes } = useStore();

  function toggleJour(jour: number) {
    setSettings(prev => ({
      ...prev,
      joursOuvres: prev.joursOuvres.includes(jour)
        ? prev.joursOuvres.filter(j => j !== jour)
        : [...prev.joursOuvres, jour].sort(),
    }));
  }

  function togglePosteActif(posteId: string) {
    setPostes(prev => prev.map(p => p.id === posteId ? { ...p, actif: !p.actif } : p));
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration générale de l'atelier.</p>
      </div>

      <div className="grid gap-6">
        {/* Jours ouvrés */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Jours ouvrés</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {JOURS_LABELS.map(j => (
              <label key={j.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={settings.joursOuvres.includes(j.value)}
                  onCheckedChange={() => toggleJour(j.value)}
                />
                <span className="text-sm">{j.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Plages horaires */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Plages horaires affichées</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Heure min</Label>
              <Input
                type="time"
                value={settings.heureMin}
                onChange={e => setSettings(prev => ({ ...prev, heureMin: e.target.value }))}
                className="w-32"
              />
            </div>
            <span className="text-muted-foreground mt-4">→</span>
            <div>
              <Label className="text-xs text-muted-foreground">Heure max</Label>
              <Input
                type="time"
                value={settings.heureMax}
                onChange={e => setSettings(prev => ({ ...prev, heureMax: e.target.value }))}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ressources */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Ressources / Postes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {METIERS.map(m => {
                const mPostes = postes.filter(p => p.metierId === m.id);
                return (
                  <div key={m.id} className="flex items-start gap-3">
                    <Badge className={`metier-${m.couleur} shrink-0 mt-0.5`}>{m.nom}</Badge>
                    <div className="flex flex-wrap gap-2">
                      {mPostes.map(p => (
                        <label key={p.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox checked={p.actif} onCheckedChange={() => togglePosteActif(p.id)} />
                          {p.nom}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
