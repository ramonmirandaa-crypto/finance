import { useAuth } from '@getmocha/users-service/react';
import { LogOut, User } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthButton() {
  const { user, redirectToLogin, logout, isPending } = useAuth();

  if (isPending) {
    return (
      <div className="animate-pulse">
        <div className="w-32 h-10 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50">
          {user.google_user_data.picture ? (
            <img 
              src={user.google_user_data.picture} 
              alt={user.google_user_data.name || user.email}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <User className="w-5 h-5 text-gray-600" />
          )}
          <span className="text-sm font-medium text-gray-900">
            {user.google_user_data.given_name || user.email}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={redirectToLogin}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
    >
      <GoogleIcon />
      Entrar com Google
    </button>
  );
}
