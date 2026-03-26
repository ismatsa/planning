import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/StoreContext';
import DevisModal from '@/components/devis/DevisModal';

export default function CreerDevis() {
  const navigate = useNavigate();
  const { devis: { addDevis, updateDevis, deleteDevis, devisResponsibles, devisIntervenants, devisMetiers } } = useStore();
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
      onAdd={addDevis}
      onUpdate={updateDevis}
      onDelete={deleteDevis}
    />
  );
}
