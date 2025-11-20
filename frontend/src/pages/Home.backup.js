import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Trophy, Calendar, DollarSign, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const { user } = useAuth();
  const [sorteos, setSorteos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSorteos();
  }, []);

  const fetchSorteos = async () => {
    try {
      const response = await axios.get(`${API}/sorteos?estado=activo`);
      setSorteos(response.data);
    } catch (error) {
      console.error('Error al cargar sorteos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-background">
      {/* Hero Section */}
      <div className="hero-gradient py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            WishWay Sorteos
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Participa en sorteos emocionantes y gana premios increíbles. Tu próximo sueño está a un boleto de distancia.
          </p>
          {user ? (
            <div className="flex gap-4 justify-center">
              <Link to={user.role === 'admin' ? '/admin' : user.role === 'vendedor' ? '/vendedor' : '/usuario'}>
                <Button className="btn-primary" size="lg" data-testid="go-to-panel-btn">
                  Ir a Mi Panel
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link to="/login">
                <Button className="btn-primary" size="lg" data-testid="hero-login-btn">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/register">
                <Button className="btn-secondary" size="lg" data-testid="hero-register-btn">
                  Registrarse
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Sorteos Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-8">Sorteos Activos</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : sorteos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No hay sorteos activos en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorteos.map((sorteo) => (
              <Card key={sorteo.id} className="sorteo-card card-hover" data-testid={`sorteo-card-${sorteo.id}`}>
                <CardHeader>
                  <div className="aspect-video relative overflow-hidden rounded-lg mb-4">
                    {sorteo.imagenes && sorteo.imagenes.length > 0 ? (
                      <img 
                        src={sorteo.imagenes[0]} 
                        alt={sorteo.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: sorteo.color_primario }}
                      >
                        <Trophy className="w-16 h-16 text-white opacity-50" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{sorteo.titulo}</CardTitle>
                  <CardDescription className="line-clamp-2">{sorteo.descripcion}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        Boleto: {formatCurrency(sorteo.precio_boleto)}
                      </span>
                      <span className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(sorteo.fecha_cierre)}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Progreso</span>
                        <span className="text-sm font-bold" style={{ color: sorteo.color_primario }}>
                          {sorteo.progreso_porcentaje.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={sorteo.progreso_porcentaje} 
                        className="h-2"
                        style={{ 
                          backgroundColor: '#e5e7eb',
                        }}
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        {sorteo.cantidad_vendida} de {sorteo.cantidad_total_boletos} boletos vendidos
                      </p>
                    </div>

                    {sorteo.tipo === 'etapas' && sorteo.etapas.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {sorteo.etapas.length} etapas de premios
                        </p>
                      </div>
                    )}

                    <Link to={`/sorteo/${sorteo.landing_slug}`}>
                      <Button 
                        className="w-full" 
                        style={{ backgroundColor: sorteo.color_primario }}
                        data-testid={`ver-sorteo-btn-${sorteo.id}`}
                      >
                        Ver Sorteo
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
