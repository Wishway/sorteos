import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register, user, handleGoogleCallback, loading: authLoading } = useAuth();
  const isMountedRef = useRef(true);
  const processingGoogleRef = useRef(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cedula, setCedula] = useState('');
  const [celular, setCelular] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && user && isMountedRef.current) {
      navigate('/usuario', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const processGoogleCallback = async () => {
      if (processingGoogleRef.current) return;
      
      if (window.location.hash.includes('session_id=')) {
        processingGoogleRef.current = true;
        
        if (isMountedRef.current) {
          setLoading(true);
        }
        
        try {
          await handleGoogleCallback();
          if (isMountedRef.current) {
            toast.success('¡Cuenta creada exitosamente!');
            // La navegación se hará automáticamente por el useEffect anterior
          }
        } catch (error) {
          if (isMountedRef.current) {
            toast.error('Error al registrarse con Google');
            setLoading(false);
          }
        }
      }
    };
    
    processGoogleCallback();
  }, [handleGoogleCallback]);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      await register(email, password, name, cedula, celular);
      if (isMountedRef.current) {
        toast.success('¡Cuenta creada! Por favor inicia sesión.');
        setTimeout(() => {
          if (isMountedRef.current) {
            navigate('/login', { replace: true });
          }
        }, 100);
      }
    } catch (error) {
      if (isMountedRef.current) {
        toast.error(error.response?.data?.detail || 'Error al registrarse');
        setLoading(false);
      }
    }
  };

  const handleGoogleRegister = () => {
    const redirectUrl = `${window.location.origin}/register`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-background px-4">
      <Card className="w-full max-w-md sorteo-card" data-testid="register-card">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Crear Cuenta</CardTitle>
          <CardDescription>Únese a WishWay y comience a participar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="register-name-input"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="register-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="register-password-input"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                data-testid="register-confirm-password-input"
              />
            </div>
            <div>
              <Label htmlFor="cedula">Número de Cédula</Label>
              <Input
                id="cedula"
                type="text"
                placeholder="1234567890"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                required
                data-testid="register-cedula-input"
              />
            </div>
            <div>
              <Label htmlFor="celular">Número de Celular</Label>
              <Input
                id="celular"
                type="tel"
                placeholder="0987654321"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                required
                data-testid="register-celular-input"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full btn-primary" 
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">O continúa con</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleRegister}
            disabled={loading}
            data-testid="google-register-btn"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>

          <p className="text-center text-sm text-gray-600 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Inicia sesión aquí
            </Link>
          </p>

          <p className="text-center text-sm mt-2">
            <Link to="/" className="text-gray-600 hover:text-primary">
              Volver al inicio
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
