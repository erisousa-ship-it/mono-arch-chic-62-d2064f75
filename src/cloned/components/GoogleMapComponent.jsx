import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const GoogleMapComponent = ({ locations, userLocation, onClose }) => {
  const [map, setMap] = useState(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '8px'
  };

  const center = userLocation || {
    lat: 48.8566,
    lng: 2.3522 // Paris center
  };

  const onLoad = React.useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = React.useCallback(function callback(map) {
    setMap(null);
  }, []);

  if (!apiKey) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-600">Google Maps API key não configurada.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {onClose && (
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 z-10 bg-white shadow-md"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
      
      <LoadScript googleMapsApiKey={apiKey}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={13}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {/* User location marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
              }}
              title="Sua localização"
            />
          )}

          {/* Location markers */}
          {locations && locations.map((location, index) => (
            <Marker
              key={index}
              position={{ lat: location.latitude, lng: location.longitude }}
              title={location.name}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
              }}
            />
          ))}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default GoogleMapComponent;
