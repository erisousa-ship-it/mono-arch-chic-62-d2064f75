import { toast } from 'sonner';

/**
 * Solicita permissão de localização com tratamento completo de erros
 * @param {Object} options - Opções de configuração
 * @returns {Promise<{lat: number, lng: number, address?: string}>}
 */
export const requestLocationPermission = async (options = {}) => {
  const {
    onStart = () => {},
    onSuccess = () => {},
    onError = () => {},
    showToast = true,
    fallbackLocation = null
  } = options;

  // Verificar se geolocalização é suportada
  if (!navigator.geolocation) {
    const error = new Error('Geolocalização não suportada');
    if (showToast) {
      toast.error('❌ Geolocalização não suportada', {
        description: 'Seu navegador não suporta geolocalização. Por favor, use um navegador mais recente.'
      });
    }
    onError(error);
    return fallbackLocation;
  }

  // Verificar permissão atual
  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'denied') {
        if (showToast) {
          toast.error('🔒 Permissão de localização bloqueada', {
            description: 'Você bloqueou o acesso à localização. Para ativar:\n\n' +
              '📱 No celular: Configurações > Navegador > Permissões > Localização\n' +
              '💻 No PC: Clique no cadeado 🔒 ao lado da URL > Permissões > Localização',
            duration: 10000
          });
        }
        const error = new Error('Permissão negada anteriormente');
        error.code = 1;
        onError(error);
        return fallbackLocation;
      }
    }
  } catch (e) {
    console.log('Permissions API não disponível:', e);
  }

  onStart();

  if (showToast) {
    toast.info('📍 Solicitando sua localização...', {
      description: 'Por favor, clique em "Permitir" quando o navegador solicitar',
      duration: 5000,
      id: 'location-request'
    });
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        toast.dismiss('location-request');
        
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        // Tentar obter endereço
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`,
            {
              headers: {
                'User-Agent': 'PertoDeMimServicos-App'
              }
            }
          );
          const data = await response.json();
          if (data.display_name) {
            location.address = data.display_name;
          }
        } catch (e) {
          console.log('Erro ao obter endereço:', e);
        }

        if (showToast) {
          toast.success('✅ Localização obtida!', {
            description: location.address || `${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`
          });
        }

        onSuccess(location);
        resolve(location);
      },
      (error) => {
        toast.dismiss('location-request');
        
        let errorTitle = 'Erro ao obter localização';
        let errorDescription = '';
        let instructions = '';

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorTitle = '🔒 Permissão de localização negada';
            errorDescription = 'Você negou o acesso à localização.';
            instructions = '\n\n📱 Como ativar no celular:\n' +
              '1. Abra as Configurações do seu celular\n' +
              '2. Vá em Apps > Navegador\n' +
              '3. Permissões > Localização > Permitir\n\n' +
              '💻 Como ativar no computador:\n' +
              '1. Clique no cadeado 🔒 ao lado da URL\n' +
              '2. Clique em "Permissões"\n' +
              '3. Ative "Localização"';
            break;
          
          case 2: // POSITION_UNAVAILABLE
            errorTitle = '📡 Localização indisponível';
            errorDescription = 'Não foi possível determinar sua localização.';
            instructions = '\n\nVerifique:\n' +
              '• Se o GPS/Localização está ativado no dispositivo\n' +
              '• Se você tem conexão com internet\n' +
              '• Se está em um local com sinal GPS';
            break;
          
          case 3: // TIMEOUT
            errorTitle = '⏱️ Tempo esgotado';
            errorDescription = 'A solicitação demorou muito.';
            instructions = '\n\nTente:\n' +
              '• Aguardar alguns segundos e tentar novamente\n' +
              '• Verificar sua conexão com internet\n' +
              '• Ativar o GPS no dispositivo';
            break;
        }

        if (showToast) {
          toast.error(errorTitle, {
            description: errorDescription + instructions,
            duration: 12000
          });
        }

        onError(error);
        
        if (fallbackLocation) {
          resolve(fallbackLocation);
        } else {
          reject(error);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Verifica o status da permissão de localização
 * @returns {Promise<string>} 'granted', 'denied', 'prompt' ou 'unavailable'
 */
export const checkLocationPermission = async () => {
  if (!navigator.geolocation) {
    return 'unavailable';
  }

  if (!navigator.permissions) {
    return 'unknown';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  } catch (e) {
    return 'unknown';
  }
};

/**
 * Mostra instruções para ativar localização
 */
export const showLocationInstructions = () => {
  toast.info('🗺️ Como ativar a localização', {
    description: 
      '📱 No celular:\n' +
      '1. Configurações > Apps > Navegador\n' +
      '2. Permissões > Localização > Permitir\n\n' +
      '💻 No computador:\n' +
      '1. Clique no cadeado 🔒 ao lado da URL\n' +
      '2. Permissões > Localização > Ativar',
    duration: 15000
  });
};
