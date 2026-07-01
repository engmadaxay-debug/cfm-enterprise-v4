import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  return user ? children : <Navigate to="/login" replace />;
}
