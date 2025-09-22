import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const { exchangeCodeForSessionToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        navigate('/');
      } catch (error) {
        console.error('Authentication failed:', error);
        navigate('/');
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 paper-texture flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Finalizando Login</h2>
          <p className="text-gray-600">Só um momento enquanto configuramos sua conta...</p>
        </div>
      </div>
    </div>
  );
}
