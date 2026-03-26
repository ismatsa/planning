import { useLocation } from 'react-router-dom';
import WeeklyPlanning from '@/components/planning/WeeklyPlanning';

const Index = () => {
  const location = useLocation();
  const convertFromDevis = location.state?.convertFromDevis || null;

  return (
    <div className="h-screen flex flex-col">
      <WeeklyPlanning convertFromDevis={convertFromDevis} />
    </div>
  );
};

export default Index;
