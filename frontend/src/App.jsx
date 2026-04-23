import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import AuthPage from './pages/AuthPage';
import './index.css';

const AuthGuard = ({ children }) => {
  const token = localStorage.getItem('omni_token');
  if (!token) return <Navigate to="/auth" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={
          <AuthGuard>
            <ChatPage />
          </AuthGuard>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
