import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevisStore } from '@/store/useDevisStore';
import DevisModal from '@/components/devis/DevisModal';

export default function CreerDevis() {
  const navigate = useNavigate();
  const { addDevis, updateDevis, deleteDevis, devisResponsibles, devisIntervenants, devisMetiers } = useDevisStore();
  const [open, setOpen] = useState(true);

  return (
    <DevisModal
      open={open}
      onClose={() => {
        setOpen(false);
        navigate('/devis');
      }}
      devisResponsibles={devisResponsibles}
      devisIntervenants={devisIntervenants}
      devisMetiers={devisMetiers}
      onAdd={async (...args) => {
        const result = await addDevis(...args);
        return result;
      }}
      onUpdate={updateDevis}
      onDelete={deleteDevis}
    />
  );
}
