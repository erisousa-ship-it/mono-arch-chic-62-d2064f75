import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import BottomNav from '../components/BottomNav';
import { Search, MapPin, Phone, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ServicesPage() {
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const categories = [
    { value: 'all', label: 'Todos' },
    { value: 'food', label: t('food') },
    { value: 'legal', label: t('legal') },
    { value: 'health', label: t('health') },
    { value: 'housing', label: t('housing') },
    { value: 'work', label: t('work') },
    { value: 'education', label: t('education') }
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [searchTerm, category, services]);

  const fetchServices = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setServices(data);
        setFilteredServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = services;

    if (category !== 'all') {
      filtered = filtered.filter(s => s.category === category);
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredServices(filtered);
  };

  const getCategoryColor = (cat) => {
    const colors = {
      food: 'bg-green-100 text-green-700',
      legal: 'bg-blue-100 text-blue-700',
      health: 'bg-red-100 text-red-700',
      housing: 'bg-orange-100 text-orange-700',
      work: 'bg-yellow-100 text-yellow-700',
      education: 'bg-orange-100 text-orange-700'
    };
    return colors[cat] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="services-page">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 glassmorphism">
        <div className="container mx-auto px-4 py-4 space-y-4">
          <h1 className="text-2xl font-heading font-bold text-textPrimary">{t('search')} Serviços</h1>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                data-testid="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar serviços..."
                className="pl-10 rounded-xl"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="category-filter" className="w-40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-textMuted">Carregando serviços...</div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12 text-textMuted" data-testid="no-services-message">
            Nenhum serviço encontrado
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <div 
                key={service.id}
                data-testid="service-card"
                className="bg-white rounded-3xl p-6 shadow-card card-hover"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-textPrimary flex-1">{service.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(service.category)}`}>
                    {categories.find(c => c.value === service.category)?.label}
                  </span>
                </div>
                {service.description && (
                  <p className="text-textSecondary mb-3 text-sm leading-relaxed">{service.description}</p>
                )}
                <div className="space-y-2 text-sm text-textMuted">
                  {service.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{service.address}</span>
                    </div>
                  )}
                  {service.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={16} />
                      <span>{service.phone}</span>
                    </div>
                  )}
                  {service.hours && (
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{service.hours}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
