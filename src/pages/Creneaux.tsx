import { useState, useMemo } from 'react';
import { useStore } from '@/store/StoreContext';

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

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function Creneaux() {
  const { postes, disponibilites, setDisponibilites, settings } = useStore();
  const activePostes = useMemo(() => postes.filter(p => p.actif), [postes]);

  // Only show days that are enabled in settings
  const joursOuvres = settings.joursOuvres;

  // Disponibilités grouped by jour (across all postes)
  const disposByJour = useMemo(() => {
    return joursOuvres.map(jour => {
      // Get dispo for first active poste for this day as reference
      const dispo = disponibilites.find(d => d.jourSemaine === jour && activePostes.some(p => p.id === d.posteId));
      return {
        jourSemaine: jour,
        plages: dispo?.plages || [{ debut: settings.heureMin, fin: settings.heureMax }],
        dureeDefaut: dispo?.dureeDefaut || 60,
        tampon: dispo?.tampon || 10,
      };
    });
  }, [joursOuvres, disponibilites, activePostes, settings]);

  function updatePlage(jourSemaine: number, plageIndex: number, field: 'debut' | 'fin', value: string) {
    setDisponibilites(prev =>
      prev.map(d => {
        if (d.jourSemaine !== jourSemaine) return d;
        const newPlages = [...d.plages];
        newPlages[plageIndex] = { ...newPlages[plageIndex], [field]: value };
        return { ...d, plages: newPlages };
      })
    );
  }

  function updateField(jourSemaine: number, field: 'dureeDefaut' | 'tampon', value: number) {
    setDisponibilites(prev =>
      prev.map(d => {
        if (d.jourSemaine !== jourSemaine) return d;
        return { ...d, [field]: value };
      })
    );
  }

  function copyToAll() {
    if (disposByJour.length === 0) return;
    const source = disposByJour[0];
    setDisponibilites(prev =>
      prev.map(d => {
        if (!joursOuvres.includes(d.jourSemaine)) return d;
        return { ...d, plages: [...source.plages], dureeDefaut: source.dureeDefaut, tampon: source.tampon };
      })
    );
    toast.success(`Configuration du ${JOURS[source.jourSemaine]} appliquée à tous les jours.`);
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold">Gestion des créneaux</h1>
        <p className="text-sm text-muted-foreground">
          Configurez les plages horaires pour tous les postes. Les modifications s'appliquent à l'ensemble des postes actifs.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={copyToAll} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Appliquer le {JOURS[disposByJour[0]?.jourSemaine] || 'premier jour'} à tous
        </Button>
      </div>

      {/* Day cards — only jours ouvrés */}
      <div className="grid gap-3">
        {disposByJour.map(dispo => (
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

        {joursOuvres.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Aucun jour ouvré sélectionné.</p>
            <p className="text-xs mt-1">Activez des jours dans les Paramètres.</p>
          </div>
        )}
      </div>
    </div>
  );
}
