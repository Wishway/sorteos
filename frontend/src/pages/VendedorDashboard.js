import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { DollarSign, ShoppingCart, Link as LinkIcon, LogOut, Home, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VendedorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ventas, setVentas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'vendedor') {
      navigate('/login');
      return;
    }
    fetchMisVentas();
  }, [user]);

  const fetchMisVentas = async () => {
    try {
      const response = await axios.get(`${API}/vendedor/mis-ventas`, { withCredentials: true });
      setVentas(response.data);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      toast.error('Error al cargar tus ventas');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const copyLink = () => {
    const link = `${window.location.origin}/?ref=${ventas.link_unico}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('¡Enlace copiado!');
    setTimeout(() => setCopied(false), 2000);
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xl">
                {user?.name?.[0]?.toUpperCase() || 'V'}
              </div>
              <div>
                <h1 className="text-2xl font-bold">Panel de Vendedor</h1>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/')} data-testid="home-btn">
                <Home className="w-4 h-4 mr-2" />
                Inicio
              </Button>
              <Button variant="outline" onClick={handleLogout} data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Link único */}
        <Card className="mb-8 sorteo-card bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Tu Enlace de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${window.location.origin}/?ref=${ventas.link_unico}`}
                readOnly
                className="flex-1 px-4 py-2 border rounded-lg bg-white"
                data-testid="vendedor-link-input"
              />
              <Button onClick={copyLink} data-testid="copy-link-btn">
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Comparte este enlace para ganar comisiones por cada venta
            </p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ventas.total_ventas}</div>
            </CardContent>
          </Card>

          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comisiones Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(ventas.total_comisiones)}
              </div>
            </CardContent>
          </Card>

          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comisiones Pendientes</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(ventas.comisiones_pendientes)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="ventas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ventas" data-testid="tab-ventas">Mis Ventas</TabsTrigger>
            <TabsTrigger value="comisiones" data-testid="tab-comisiones">Comisiones</TabsTrigger>
          </TabsList>

          <TabsContent value="ventas" className="space-y-4">
            {ventas.boletos.length === 0 ? (
              <Card className="p-12 text-center">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">Aún no tienes ventas</h3>
                <p className="text-gray-600 mb-4">
                  Comparte tu enlace personalizado para comenzar a ganar comisiones
                </p>
                <Button onClick={copyLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Enlace
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {ventas.boletos.map((boleto) => (
                  <Card key={boleto.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-lg mb-1">
                            Boleto #{boleto.numero_boleto}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            Sorteo ID: {boleto.sorteo_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(boleto.fecha_compra)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">
                            {formatCurrency(boleto.precio_pagado)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comisiones" className="space-y-4">
            {ventas.comisiones.length === 0 ? (
              <Card className="p-12 text-center">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No tienes comisiones</h3>
                <p className="text-gray-600">
                  Las comisiones aparecerán aquí cuando realices ventas
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {ventas.comisiones.map((comision) => (
                  <Card key={comision.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              comision.estado === 'pagado' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {comision.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            Boleto ID: {comision.boleto_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(comision.fecha)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(comision.monto)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendedorDashboard;
