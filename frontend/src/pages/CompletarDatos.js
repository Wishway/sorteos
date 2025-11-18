import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CompletarDatos = () => {
  const navigate = useNavigate();
  const [cedula, setCedula] = useState('');
  const [celular, setCelular] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/auth/completar-datos?cedula=${cedula}&celular=${celular}`, {}, { withCredentials: true });
      toast.success('¡Datos completados exitosamente!');
      navigate('/usuario');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al completar datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-background px-4">
      <Card className="w-full max-w-md sorteo-card" data-testid="completar-datos-card">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Completar Datos</CardTitle>
          <CardDescription>
            Necesitamos algunos datos adicionales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cedula">Número de Cédula</Label>
              <Input
                id="cedula"
                type="text"
                placeholder="1234567890"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                required
                data-testid="cedula-input"
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
                data-testid="celular-input"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full btn-primary" 
              disabled={loading}
              data-testid="submit-datos-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Datos'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletarDatos;
