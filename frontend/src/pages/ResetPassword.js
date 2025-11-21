import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_rafflehub-1/artifacts/13c8161p_descarga.png';
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      toast.error('Token inválido', {
        description: 'No se encontró el token de recuperación',
      });
      setVerifying(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/auth/verify-reset-token`, { token });
      setTokenValid(true);
      setEmail(response.data.email);
    } catch (error) {
      toast.error('Token inválido o expirado', {
        description: 'Por favor solicita un nuevo enlace de recuperación',
      });
      setTokenValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Contraseña muy corta', {
        description: 'La contraseña debe tener al menos 6 caracteres',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden', {
        description: 'Por favor verifica que ambas contraseñas sean iguales',
      });
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
      toast.success('¡Contraseña actualizada!', {
        description: 'Ahora puedes iniciar sesión con tu nueva contraseña',
      });
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      toast.error('Error al actualizar contraseña', {
        description: error.response?.data?.detail || 'No se pudo actualizar la contraseña',
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src={LOGO_URL} 
              alt="WishWay Logo" 
              className="h-16 mx-auto mb-6 object-contain"
            />
          </div>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Token inválido</h2>
                <p className="text-gray-600">
                  Este enlace de recuperación ha expirado o no es válido
                </p>
                <div className="pt-4 space-y-3">
                  <Link to="/forgot-password">
                    <Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700">
                      Solicitar nuevo enlace
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" className="w-full h-12">
                      Volver al inicio de sesión
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
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
            className="h-16 mx-auto mb-6 object-contain"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {success ? '¡Contraseña actualizada!' : 'Nueva contraseña'}
          </h1>
          <p className="text-gray-600">
            {success 
              ? 'Tu contraseña ha sido actualizada exitosamente'
              : `Restablecer contraseña para ${email}`
            }
          </p>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password Input */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="new-password" 
                    className="text-sm font-medium text-gray-700"
                  >
                    Nueva contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="pl-10 pr-12 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all"
                      data-testid="new-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="confirm-password" 
                    className="text-sm font-medium text-gray-700"
                  >
                    Confirmar contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pl-10 pr-12 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all"
                      data-testid="confirm-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-2 font-medium">La contraseña debe tener:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className={newPassword.length >= 6 ? 'text-green-600' : ''}>
                      • Al menos 6 caracteres
                    </li>
                    <li className={newPassword === confirmPassword && newPassword ? 'text-green-600' : ''}>
                      • Las contraseñas deben coincidir
                    </li>
                  </ul>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={loading}
                  data-testid="reset-password-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar contraseña'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </div>

                {/* Success Message */}
                <div className="text-center space-y-2">
                  <p className="text-gray-600">
                    Tu contraseña ha sido actualizada exitosamente
                  </p>
                  <p className="text-sm text-gray-500">
                    Redirigiendo al inicio de sesión...
                  </p>
                </div>

                {/* Manual Login Link */}
                <Link to="/login">
                  <Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700">
                    Ir a iniciar sesión
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
