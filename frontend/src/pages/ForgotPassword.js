import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_rafflehub-1/artifacts/13c8161p_descarga.png';
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Email requerido', {
        description: 'Por favor ingresa tu correo electrónico',
      });
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
      toast.success('Solicitud enviada', {
        description: 'Revisa tu correo para restablecer tu contraseña',
      });
    } catch (error) {
      toast.error('Error', {
        description: error.response?.data?.detail || 'No se pudo procesar la solicitud',
      });
    } finally {
      setLoading(false);
    }
  };

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
            {sent ? '¡Correo enviado!' : 'Recuperar contraseña'}
          </h1>
          <p className="text-gray-600">
            {sent 
              ? 'Te hemos enviado un enlace para restablecer tu contraseña'
              : 'Ingresa tu correo y te enviaremos un enlace de recuperación'
            }
          </p>
        </div>

        {/* Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-5">
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
                      data-testid="forgot-password-email-input"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={loading}
                  data-testid="forgot-password-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace de recuperación'
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
                    Hemos enviado un enlace de recuperación a:
                  </p>
                  <p className="font-semibold text-gray-900">{email}</p>
                  <p className="text-sm text-gray-500 mt-4">
                    El enlace expirará en 1 hora
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Por favor, revisa tu bandeja de entrada y tu carpeta de spam.
                  </p>
                </div>

                {/* Resend Button */}
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => setSent(false)}
                >
                  Enviar de nuevo
                </Button>
              </div>
            )}

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver al inicio de sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
