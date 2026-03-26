import { useNavigate } from 'react-router-dom';
import DevisForm from '@/components/devis/DevisForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CreerDevis() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/devis')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <h1 className="text-xl font-display font-bold">Nouveau devis</h1>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <DevisForm onSaved={() => navigate('/devis')} />
      </div>
    </div>
  );
}
