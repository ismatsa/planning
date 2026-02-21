import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';
import { METIERS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

const JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function Creneaux() {
  const { postes, disponibilites, setDisponibilites } = useStore();
  const [selectedPoste, setSelectedPoste] = useState(postes[0]?.id || '');

  const poste = postes.find(p => p.id === selectedPoste);
  const metier = METIERS.find(m => m.id === poste?.metierId);

  const posteDispos = useMemo(
    () => disponibilites.filter(d => d.posteId === selectedPoste).sort((a, b) => a.jourSemaine - b.jourSemaine),
    [disponibilites, selectedPoste]
  );

  function updatePlage(jourSemaine: number, plageIndex: number, field: 'debut' | 'fin', value: string) {
    setDisponibilites(prev =>
      prev.map(d => {
        if (d.posteId !== selectedPoste || d.jourSemaine !== jourSemaine) return d;
        const newPlages = [...d.plages];
        newPlages[plageIndex] = { ...newPlages[plageIndex], [field]: value };
        return { ...d, plages: newPlages };
      })
    );
  }

  function updateField(jourSemaine: number, field: 'dureeDefaut' | 'tampon', value: number) {
    setDisponibilites(prev =>
      prev.map(d => {
        if (d.posteId !== selectedPoste || d.jourSemaine !== jourSemaine) return d;
        return { ...d, [field]: value };
      })
    );
  }

  function copyToAll() {
    if (posteDispos.length === 0) return;
    const source = posteDispos[0];
    setDisponibilites(prev =>
      prev.map(d => {
        if (d.posteId !== selectedPoste) return d;
        return { ...d, plages: [...source.plages], dureeDefaut: source.dureeDefaut, tampon: source.tampon };
      })
    );
    toast.success('Configuration du lundi appliquée à tous les jours.');
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold">Gestion des créneaux</h1>
        <p className="text-sm text-muted-foreground">Configurez les plages horaires pour chaque poste.</p>
      </div>

      {/* Poste selector */}
      <div className="flex items-center gap-3 mb-6">
        <Select value={selectedPoste} onValueChange={setSelectedPoste}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METIERS.map(m => {
              const mPostes = postes.filter(p => p.metierId === m.id);
              return mPostes.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {m.nom} — {p.nom}
                </SelectItem>
              ));
            })}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={copyToAll} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Appliquer le lundi à tous
        </Button>
      </div>

      {/* Day cards */}
      <div className="grid gap-3">
        {posteDispos.map(dispo => (
          <Card key={dispo.jourSemaine} className="animate-fade-in">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold">{JOURS[dispo.jourSemaine]}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="flex flex-wrap items-end gap-4">
                {dispo.plages.map((plage, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Début</Label>
                      <Input
                        type="time"
                        value={plage.debut}
                        onChange={e => updatePlage(dispo.jourSemaine, i, 'debut', e.target.value)}
                        className="w-28 h-8 text-xs"
                      />
                    </div>
                    <span className="text-muted-foreground mt-4">→</span>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Fin</Label>
                      <Input
                        type="time"
                        value={plage.fin}
                        onChange={e => updatePlage(dispo.jourSemaine, i, 'fin', e.target.value)}
                        className="w-28 h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Durée défaut</Label>
                  <Input
                    type="number"
                    value={dispo.dureeDefaut}
                    onChange={e => updateField(dispo.jourSemaine, 'dureeDefaut', Number(e.target.value))}
                    className="w-20 h-8 text-xs"
                    min={15}
                    step={15}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Tampon (min)</Label>
                  <Input
                    type="number"
                    value={dispo.tampon}
                    onChange={e => updateField(dispo.jourSemaine, 'tampon', Number(e.target.value))}
                    className="w-20 h-8 text-xs"
                    min={0}
                    step={5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
