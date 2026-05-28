import React from 'react';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';

export default function MapPreview({ location, size = 'medium' }) {
  if (!location || !location.lat || !location.lng) return null;

  const { lat, lng, address } = location;
  
  // URL do Google Maps para abrir
  const directUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  
  const sizeClasses = {
    small: 'h-32',
    medium: 'h-48',
    large: 'h-64'
  };

  return (
    <div className="w-full space-y-2 my-3">
      {/* Mapa Visual Estilizado */}
      <div 
        className={`${sizeClasses[size] || sizeClasses.medium} rounded-2xl overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-blue-100 via-blue-50 to-orange-100 relative group cursor-pointer shadow-lg hover:shadow-xl transition-all`}
        onClick={() => window.open(directUrl, '_blank')}
      >
        {/* Grid de fundo simulando mapa */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, #1CA9C9 1px, transparent 1px),
              linear-gradient(to bottom, #1CA9C9 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }} />
        </div>
        
        {/* Círculos concêntricos simulando radar */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="absolute w-32 h-32 border-2 border-primary/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute w-24 h-24 border-2 border-primary/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-16 h-16 border-2 border-primary/40 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
        </div>
        
        {/* Marcador Principal */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative animate-bounce" style={{ animationDuration: '2s' }}>
            <MapPin size={48} className="text-red-500 drop-shadow-2xl" fill="currentColor" strokeWidth={1.5} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full" />
          </div>
        </div>
        
        {/* Elementos decorativos - Linhas de rua */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-0 w-full h-1 bg-primary transform rotate-12" />
          <div className="absolute top-3/4 left-0 w-full h-1 bg-primary transform -rotate-12" />
          <div className="absolute top-0 left-1/4 w-1 h-full bg-primary transform rotate-12" />
          <div className="absolute top-0 left-3/4 w-1 h-full bg-primary transform -rotate-12" />
        </div>
        
        {/* Overlay de hover */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-white rounded-full p-4 shadow-xl transform scale-0 group-hover:scale-100 transition-transform duration-300">
            <Navigation size={32} className="text-primary" />
          </div>
        </div>
        
        {/* Badge de coordenadas */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-mono text-primary border border-primary/20 shadow-sm">
          {lat.toFixed(4)}°, {lng.toFixed(4)}°
        </div>
      </div>
      
      {/* Info da Localização */}
      <div className="bg-gradient-to-r from-blue-50 to-orange-50 p-3 sm:p-4 rounded-xl border-2 border-primary/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="bg-primary/10 p-2 rounded-lg">
              <MapPin size={18} className="text-primary flex-shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-textMuted">📍 Localização</p>
              <p className="text-sm font-medium text-textPrimary truncate">
                {address || 'Localização compartilhada'}
              </p>
            </div>
          </div>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-primary text-white px-3 sm:px-4 py-2 rounded-full hover:bg-primary-hover text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-sm hover:shadow-md"
          >
            <span className="hidden sm:inline">Abrir</span> Mapa
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
