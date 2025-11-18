import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Home, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PerfilAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    nombre_titular: '',
    banco: '',
    tipo_cuenta: 'Corriente',
    numero_cuenta: '',
    cedula_ruc: '',
    correo_pagos: '',
    numero_whatsapp: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchConfiguracion();
  }, [user]);

  const fetchConfiguracion = async () => {
    try {
      const response = await axios.get(`${API}/admin/configuracion`, { withCredentials: true });
      setConfig(response.data);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`${API}/admin/configuracion`, config, { withCredentials: true });
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-background">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Configuración de Perfil</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/admin')} data-testid="back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                <Home className="w-4 h-4 mr-2" />
                Inicio
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="sorteo-card">
          <CardHeader>
            <CardTitle>Datos de Pago y Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre_titular">Nombre del Titular</Label>
                  <Input
                    id="nombre_titular"
                    name="nombre_titular"
                    value={config.nombre_titular}
                    onChange={handleInputChange}
                    required
                    data-testid="nombre-titular-input"
                  />
                </div>

                <div>
                  <Label htmlFor="banco">Banco</Label>
                  <Input
                    id="banco"
                    name="banco"
                    value={config.banco}
                    onChange={handleInputChange}
                    required
                    data-testid="banco-input"
                  />
                </div>

                <div>
                  <Label htmlFor="tipo_cuenta">Tipo de Cuenta</Label>
                  <Select value={config.tipo_cuenta} onValueChange={(value) => setConfig(prev => ({ ...prev, tipo_cuenta: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corriente">Corriente</SelectItem>
                      <SelectItem value="Ahorros">Ahorros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="numero_cuenta">Número de Cuenta</Label>
                  <Input
                    id="numero_cuenta"
                    name="numero_cuenta"
                    value={config.numero_cuenta}
                    onChange={handleInputChange}
                    required
                    data-testid="numero-cuenta-input"
                  />
                </div>

                <div>
                  <Label htmlFor="cedula_ruc">Cédula/RUC</Label>
                  <Input
                    id="cedula_ruc"
                    name="cedula_ruc"
                    value={config.cedula_ruc}
                    onChange={handleInputChange}
                    required
                    data-testid="cedula-ruc-input"
                  />
                </div>

                <div>
                  <Label htmlFor="correo_pagos">Correo de Pagos</Label>
                  <Input
                    id="correo_pagos"
                    name="correo_pagos"
                    type="email"
                    value={config.correo_pagos}
                    onChange={handleInputChange}
                    required
                    data-testid="correo-pagos-input"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="numero_whatsapp">Número de WhatsApp</Label>
                  <Input
                    id="numero_whatsapp"
                    name="numero_whatsapp"
                    value={config.numero_whatsapp}
                    onChange={handleInputChange}
                    placeholder="+593987654321"
                    required
                    data-testid="whatsapp-input"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Incluye el código de país (ej: +593987654321)
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/admin')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} data-testid="guardar-config-btn">
                  {saving ? (
                    <>Guardando...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerfilAdmin;
