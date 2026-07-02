import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import StudentDashboard from '@/pages/StudentDashboard';
import AdminDashboard from '@/pages/AdminDashboard';

const Index = () => {
  const { usuario, isAdmin, isEstudante } = useAuth();

  if (!usuario) return <LoginPage />;
  if (isAdmin) return <AdminDashboard />;
  if (isEstudante) return <StudentDashboard />;
  
  return <LoginPage />;
};

export default Index;
