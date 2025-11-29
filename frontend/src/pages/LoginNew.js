import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Lock, Mail } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_rafflehub-1/artifacts/13c8161p_descarga.png';

const Login = () => {
  const navigate = useNavigate();
  const { login, user, handleGoogleCallback, loading: authLoading } = useAuth();
  const isMounted = useRef(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && user && isMounted.current) {
      redirectBasedOnRole(user.role);
    }
  }, [user, authLoading]);

  useEffect(() => {
    const processingRef = { current: false };
    
    const processGoogleCallback = async () => {
      if (processingRef.current) return;
      
      if (window.location.hash.includes('session_id=')) {
        processingRef.current = true;
        
        if (isMounted.current) {
          setLoading(true);
        }
        
        try {
          const userData = await handleGoogleCallback();
          if (isMounted.current) {
            toast.success('¡Bienvenido de nuevo!', {
              description: `Has iniciado sesión como ${userData.name}`,
            });
            // La redirección se hará automáticamente por el useEffect anterior
          }
        } catch (error) {
          if (isMounted.current) {
            toast.error('Error al iniciar sesión', {
              description: 'No se pudo completar el inicio de sesión con Google',
            });
            setLoading(false);
          }
        }
      }
    };
    
    processGoogleCallback();
  }, [handleGoogleCallback]);

  const redirectBasedOnRole = (role) => {
    if (!isMounted.current) return;
    
    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'vendedor') {
      navigate('/vendedor');
    } else {
      navigate('/usuario');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Campos requeridos', {
        description: 'Por favor ingresa tu email y contraseña',
      });
      return;
    }

    if (isMounted.current) {
      setLoading(true);
    }

    try {
      const userData = await login(email, password);
      if (isMounted.current) {
        toast.success('¡Bienvenido de nuevo!', {
          description: `Has iniciado sesión exitosamente`,
        });
        redirectBasedOnRole(userData.role);
      }
    } catch (error) {
      if (isMounted.current) {
        toast.error('Error al iniciar sesión', {
          description: error.response?.data?.detail || 'Email o contraseña incorrectos',
        });
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = `${window.location.origin}/login`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={LOGO_URL} 
            alt="WishWay Logo" 
            className="h-24 md:h-28 mx-auto mb-6 object-contain"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido de vuelta
          </h1>
          <p className="text-gray-600">
            Inicia sesión en tu cuenta
          </p>
        </div>

        {/* Card Premium */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-sm font-medium text-gray-700"
                >
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all"
                    data-testid="login-email-input"
                  />
                </div>
              </div>

              {/* Password Input with Toggle */}
              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="text-sm font-medium text-gray-700"
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-12 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    data-testid="toggle-password-visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                  data-testid="forgot-password-link"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">O continúa con</span>
              </div>
            </div>

            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
              onClick={handleGoogleLogin}
              disabled={loading}
              data-testid="google-login-btn"
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="font-medium">Continuar con Google</span>
            </Button>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ¿No tienes cuenta?{' '}
                <Link 
                  to="/register" 
                  className="font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Regístrate gratis
                </Link>
              </p>
            </div>

            {/* Back to Home */}
            <div className="mt-4 text-center">
              <Link 
                to="/" 
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Volver al inicio
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Al continuar, aceptas nuestros términos de servicio y política de privacidad
        </p>
      </div>
    </div>
  );
};

export default Login;
