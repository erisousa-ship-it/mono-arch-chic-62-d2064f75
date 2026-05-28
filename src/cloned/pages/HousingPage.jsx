import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../ClonedAuthContext';
import BottomNav from '../components/BottomNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Home,
  Plus,
  MapPin,
  Users,
  Heart,
  Star,
  MessageCircle,
  Search,
  Bed,
  Sofa,
  Building,
  ChevronLeft,
  ChevronRight,
  User,
  Wifi,
  Car,
  Flame,
  Waves,
  X,
  Filter,
  SlidersHorizontal,
  Share2,
  Calendar,
  Clock,
  Shield,
  BadgeCheck,
  Sparkles,
  Camera
} from 'lucide-react';

export default function HousingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  
  // States
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  
  // Create listing states
  const [listingType, setListingType] = useState('');
  const [createStep, setCreateStep] = useState(1);
  const [newListing, setNewListing] = useState({
    title: '',
    description: '',
    city: '',
    address: '',
    accommodation_type: 'room',
    duration: 'temporary',
    max_guests: 1,
    amenities: [],
    pets_allowed: false,
    available_from: '',
    available_until: '',
    exchange_services: '',
    photos: []
  });

  // Sample images for listings without photos
  const defaultImages = [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
  ];

  const accommodationTypes = [
    { value: 'room', label: t('privateRoom'), icon: Bed, emoji: '🛏️' },
    { value: 'sofa', label: t('sofaCouch'), icon: Sofa, emoji: '🛋️' },
    { value: 'house', label: t('entireHouse'), icon: Building, emoji: '🏠' },
    { value: 'shared', label: t('sharedRoom'), icon: Users, emoji: '👥' }
  ];

  const durationTypes = [
    { value: 'emergency', label: t('emergencyStay'), desc: '1-3 ' + t('days'), emoji: '🆘' },
    { value: 'temporary', label: t('temporaryStay'), desc: '1-4 ' + t('weeks'), emoji: '📅' },
    { value: 'long_term', label: t('longTermStay'), desc: '1+ ' + t('months'), emoji: '🏡' },
    { value: 'exchange', label: t('exchangeStay'), desc: t('houseSittingExchange'), emoji: '🤝' }
  ];

  const amenitiesList = [
    { id: 'wifi', label: 'WiFi', icon: Wifi },
    { id: 'kitchen', label: t('kitchen'), icon: Flame },
    { id: 'washing', label: t('washingMachine'), icon: Waves },
    { id: 'heating', label: t('heating'), icon: Flame },
    { id: 'parking', label: t('parking'), icon: Car },
    { id: 'accessible', label: t('accessible'), icon: Users }
  ];

  const cities = [
    { name: 'Paris', emoji: '🗼' },
    { name: 'Lyon', emoji: '🦁' },
    { name: 'Marseille', emoji: '⚓' },
    { name: 'Toulouse', emoji: '🌹' },
    { name: 'Nice', emoji: '🌴' },
    { name: 'Bordeaux', emoji: '🍷' },
    { name: 'Lille', emoji: '🏛️' },
    { name: 'Nantes', emoji: '🐘' }
  ];

  useEffect(() => {
    fetchListings();
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('housing_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, [filterType, filterCity]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      let url = `${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/housing?`;
      if (filterType !== 'all') url += `type=${filterType}&`;
      if (filterCity) url += `city=${filterCity}&`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setListings(data);
      }
    } catch (error) {
      console.error('Error fetching housing listings:', error);
      toast.error(t('errorLoadingListings'));
    } finally {
      setLoading(false);
    }
  };

  const createListing = async () => {
    if (!newListing.title || !newListing.city) {
      toast.error(t('fillRequiredFields'));
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/housing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newListing,
          listing_type: listingType
        })
      });

      if (response.ok) {
        toast.success(listingType === 'offer' ? t('housingOfferCreated') : t('housingRequestCreated'));
        setShowCreateModal(false);
        resetForm();
        fetchListings();
      } else {
        throw new Error('Failed to create listing');
      }
    } catch (error) {
      toast.error(t('errorCreatingListing'));
    }
  };

  const resetForm = () => {
    setListingType('');
    setCreateStep(1);
    setNewListing({
      title: '',
      description: '',
      city: '',
      address: '',
      accommodation_type: 'room',
      duration: 'temporary',
      max_guests: 1,
      amenities: [],
      pets_allowed: false,
      available_from: '',
      available_until: '',
      exchange_services: '',
      photos: []
    });
  };

  const toggleFavorite = (listingId) => {
    const newFavorites = favorites.includes(listingId)
      ? favorites.filter(id => id !== listingId)
      : [...favorites, listingId];
    setFavorites(newFavorites);
    localStorage.setItem('housing_favorites', JSON.stringify(newFavorites));
  };

  const toggleAmenity = (amenityId) => {
    setNewListing(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const filteredListings = listings.filter(listing => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return listing.title?.toLowerCase().includes(query) ||
             listing.city?.toLowerCase().includes(query) ||
             listing.description?.toLowerCase().includes(query);
    }
    return true;
  });

  const getRandomImage = (index) => {
    return defaultImages[index % defaultImages.length];
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Airbnb-style Header */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Logo and Search */}
          <div className="flex items-center justify-between gap-4">
            <button onClick={() => navigate('/home')} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Home size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl hidden sm:block text-orange-500">PertoDeMimServicos</span>
            </button>

            {/* Search Bar - Airbnb Style */}
            <div className="flex-1 max-w-2xl">
              <div className="flex items-center bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-shadow">
                <button className="flex-1 flex items-center gap-3 px-4 py-3 text-left">
                  <Search size={18} className="text-gray-500" />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchHousingPlaceholder')}
                      className="w-full text-sm font-medium bg-transparent outline-none placeholder:text-gray-400"
                    />
                  </div>
                </button>
                <button 
                  onClick={() => setShowFiltersModal(true)}
                  className="p-3 mx-1 bg-orange-500 hover:bg-orange-600 rounded-full text-white transition-colors"
                >
                  <SlidersHorizontal size={16} />
                </button>
              </div>
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowCreateModal(true)}
                variant="outline" 
                className="rounded-full hidden sm:flex"
              >
                <Plus size={16} className="mr-1" />
                {t('createListing')}
              </Button>
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                <User size={20} className="text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs - Airbnb Style */}
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex gap-6 overflow-x-auto scrollbar-hide">
            {[
              { type: 'all', label: t('allFilter'), icon: Sparkles },
              { type: 'offer', label: t('offersHousing'), icon: Home },
              { type: 'need', label: t('needsHousing'), icon: Search },
            ].map((tab) => (
              <button
                key={tab.type}
                onClick={() => setFilterType(tab.type)}
                className={`flex flex-col items-center gap-1 pb-2 px-2 border-b-2 transition-all whitespace-nowrap ${
                  filterType === tab.type
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <tab.icon size={24} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
            <div className="h-8 w-px bg-gray-200 mx-2 self-center"></div>
            {cities.slice(0, 5).map((city) => (
              <button
                key={city.name}
                onClick={() => setFilterCity(filterCity === city.name ? '' : city.name)}
                className={`flex flex-col items-center gap-1 pb-2 px-2 border-b-2 transition-all whitespace-nowrap ${
                  filterCity === city.name
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{city.emoji}</span>
                <span className="text-xs font-medium">{city.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-center gap-8 sm:gap-16">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                {listings.filter(l => l.listing_type === 'offer').length}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">{t('availableHomes')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-orange-500">
                {listings.filter(l => l.listing_type === 'need').length}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">{t('peopleSearching')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-600">
                {listings.filter(l => l.listing_status === 'matched').length}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">{t('successfulMatches')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Airbnb Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-xl mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Home size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('noListingsYet')}</h3>
            <p className="text-gray-500 mb-6">{t('beFirstToOffer')}</p>
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="rounded-full bg-orange-500 hover:bg-orange-600 px-8"
            >
              <Plus size={18} className="mr-2" />
              {t('createListing')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing, index) => (
              <div
                key={listing.id}
                className="group cursor-pointer"
                onClick={() => setSelectedListing(listing)}
              >
                {/* Image Container */}
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                  <img
                    src={listing.photos?.[0] || getRandomImage(index)}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(listing.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
                  >
                    <Heart 
                      size={20} 
                      className={favorites.includes(listing.id) ? 'fill-orange-500 text-orange-500' : 'text-gray-600'}
                    />
                  </button>

                  {/* Type Badge */}
                  <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold ${
                    listing.listing_type === 'offer'
                      ? 'bg-green-500 text-white'
                      : 'bg-orange-500 text-white'
                  }`}>
                    {listing.listing_type === 'offer' ? '🏡 ' + t('offersHousing') : '🔍 ' + t('needsHousing')}
                  </div>

                  {/* Duration Badge */}
                  {listing.duration === 'exchange' && (
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-orange-500 text-white rounded-full text-xs font-bold">
                      🤝 House Sitting
                    </div>
                  )}

                  {/* Image Dots (simulating carousel) */}
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((dot, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Card Content */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1">
                      {listing.city}, France
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                      <Star size={14} className="fill-black" />
                      <span className="text-sm font-medium">{listing.user?.rating || '4.9'}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-500 text-sm line-clamp-1">{listing.title}</p>
                  
                  <p className="text-gray-500 text-sm">
                    {accommodationTypes.find(a => a.value === listing.accommodation_type)?.emoji}{' '}
                    {accommodationTypes.find(a => a.value === listing.accommodation_type)?.label}
                    {listing.max_guests > 1 && ` · ${listing.max_guests} ${t('guests')}`}
                  </p>

                  {/* Availability Dates */}
                  {listing.available_from && (
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(listing.available_from).toLocaleDateString()} 
                      {listing.available_until && ` - ${new Date(listing.available_until).toLocaleDateString()}`}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {listing.listing_type === 'offer' ? (
                      <span className="text-sm">
                        <span className="font-semibold text-green-600">{t('free')}</span>
                        <span className="text-gray-500"> · {t('solidaryHosting')}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-orange-600 font-medium">
                        {t('searchingHost')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button - Mobile */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-40 sm:hidden"
      >
        <Plus size={28} />
      </button>

      {/* Listing Detail Modal */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-3xl mx-2 p-0 rounded-2xl overflow-hidden max-h-[90vh]">
          {selectedListing && (
            <div className="flex flex-col max-h-[85vh]">
              {/* Image */}
              <div className="relative h-64 sm:h-80">
                <img
                  src={selectedListing.photos?.[0] || getRandomImage(listings.indexOf(selectedListing))}
                  alt={selectedListing.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedListing(null)}
                  className="absolute top-4 left-4 p-2 bg-white rounded-full shadow-lg"
                >
                  <X size={20} />
                </button>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button className="p-2 bg-white rounded-full shadow-lg">
                    <Share2 size={20} />
                  </button>
                  <button 
                    onClick={() => toggleFavorite(selectedListing.id)}
                    className="p-2 bg-white rounded-full shadow-lg"
                  >
                    <Heart 
                      size={20} 
                      className={favorites.includes(selectedListing.id) ? 'fill-orange-500 text-orange-500' : ''}
                    />
                  </button>
                </div>
                <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-full text-sm font-bold ${
                  selectedListing.listing_type === 'offer'
                    ? 'bg-green-500 text-white'
                    : 'bg-orange-500 text-white'
                }`}>
                  {selectedListing.listing_type === 'offer' ? '🏡 ' + t('offersHousing') : '🔍 ' + t('needsHousing')}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedListing.title}</h2>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={16} />
                      <span>{selectedListing.city}, France</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-lg">
                    <Star size={16} className="fill-black" />
                    <span className="font-semibold">{selectedListing.user?.rating || '4.9'}</span>
                    <span className="text-gray-500">({selectedListing.user?.reviews_count || 0})</span>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl mb-6">
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {accommodationTypes.find(a => a.value === selectedListing.accommodation_type)?.emoji}
                    </div>
                    <p className="text-xs text-gray-600">
                      {accommodationTypes.find(a => a.value === selectedListing.accommodation_type)?.label}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">👥</div>
                    <p className="text-xs text-gray-600">{selectedListing.max_guests} {t('guests')}</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {durationTypes.find(d => d.value === selectedListing.duration)?.emoji}
                    </div>
                    <p className="text-xs text-gray-600">
                      {durationTypes.find(d => d.value === selectedListing.duration)?.label}
                    </p>
                  </div>
                </div>

                {/* Availability Calendar */}
                {(selectedListing.available_from || selectedListing.available_until) && (
                  <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-orange-600" />
                      {t('availability')}
                    </h3>
                    <div className="flex items-center gap-4">
                      {selectedListing.available_from && (
                        <div className="flex-1 p-3 bg-white rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">{t('from')}</p>
                          <p className="font-semibold text-orange-600">
                            {new Date(selectedListing.available_from).toLocaleDateString('pt-BR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                      {selectedListing.available_until && (
                        <>
                          <ChevronRight className="text-gray-400" />
                          <div className="flex-1 p-3 bg-white rounded-lg text-center">
                            <p className="text-xs text-gray-500 mb-1">{t('until')}</p>
                            <p className="font-semibold text-orange-600">
                              {new Date(selectedListing.available_until).toLocaleDateString('pt-BR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">{t('description')}</h3>
                  <p className="text-gray-600 leading-relaxed">{selectedListing.description}</p>
                </div>

                {/* Exchange Services */}
                {selectedListing.exchange_services && (
                  <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      🤝 {t('exchangeServices')}
                    </h3>
                    <p className="text-gray-600">{selectedListing.exchange_services}</p>
                  </div>
                )}

                {/* Amenities */}
                {selectedListing.amenities?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3">{t('amenities')}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedListing.amenities.map(amenityId => {
                        const amenity = amenitiesList.find(a => a.id === amenityId);
                        if (!amenity) return null;
                        return (
                          <div key={amenityId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <amenity.icon size={20} className="text-gray-600" />
                            <span className="text-sm">{amenity.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pets */}
                {selectedListing.pets_allowed && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg mb-6">
                    <span className="text-2xl">🐾</span>
                    <span className="text-green-700 font-medium">{t('petsAllowed')}</span>
                  </div>
                )}

                {/* Host Info */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                      <User size={28} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedListing.user?.name || 'Host'}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <BadgeCheck size={14} className="text-orange-500" />
                        <span>{t('verified')}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      setSelectedListing(null);
                      navigate(`/direct-chat/${selectedListing.user_id}`);
                    }}
                    className="rounded-full bg-orange-500 hover:bg-orange-600"
                  >
                    <MessageCircle size={18} className="mr-2" />
                    {t('contact')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Listing Modal - Airbnb Style */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowCreateModal(open);
      }}>
        <DialogContent className="max-w-xl mx-2 p-0 rounded-2xl overflow-hidden max-h-[90vh]">
          <div className="flex flex-col h-full max-h-[85vh]">
            
            {/* Step 1: Choose Type */}
            {!listingType && (
              <>
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-bold text-center">{t('solidaryHousing')}</h2>
                  <p className="text-gray-500 text-center mt-1">{t('whatWouldYouLikeToDo')}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <button
                    onClick={() => setListingType('offer')}
                    className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Home size={32} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{t('offerHousing')}</h3>
                        <p className="text-sm text-gray-500">{t('offerHousingDesc')}</p>
                      </div>
                      <ChevronRight className="text-gray-400" />
                    </div>
                  </button>

                  <button
                    onClick={() => setListingType('need')}
                    className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Search size={32} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{t('needHousing')}</h3>
                        <p className="text-sm text-gray-500">{t('needHousingDesc')}</p>
                      </div>
                      <ChevronRight className="text-gray-400" />
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setListingType('offer');
                      setNewListing(prev => ({...prev, duration: 'exchange'}));
                    }}
                    className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Heart size={32} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{t('houseSitting')}</h3>
                        <p className="text-sm text-gray-500">{t('houseSittingDesc')}</p>
                      </div>
                      <ChevronRight className="text-gray-400" />
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Create Form */}
            {listingType && (
              <>
                <div className="p-4 border-b flex items-center gap-3">
                  <button 
                    onClick={() => setListingType('')}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex-1">
                    <h2 className="font-bold">
                      {listingType === 'offer' ? t('offerHousing') : t('needHousing')}
                    </h2>
                    <p className="text-sm text-gray-500">{t('fillDetailsBelow')}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Title */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">{t('listingTitle')}</Label>
                    <Input
                      value={newListing.title}
                      onChange={(e) => setNewListing({...newListing, title: e.target.value})}
                      placeholder={listingType === 'offer' ? t('offerTitlePlaceholder') : t('needTitlePlaceholder')}
                      className="rounded-xl h-12"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">{t('city')}</Label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {cities.slice(0, 8).map(city => (
                        <button
                          key={city.name}
                          onClick={() => setNewListing({...newListing, city: city.name})}
                          className={`p-2 rounded-xl border-2 text-center transition-all ${
                            newListing.city === city.name
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-lg block">{city.emoji}</span>
                          <span className="text-xs">{city.name}</span>
                        </button>
                      ))}
                    </div>
                    <Input
                      value={newListing.city}
                      onChange={(e) => setNewListing({...newListing, city: e.target.value})}
                      placeholder={t('otherCity')}
                      className="rounded-xl"
                    />
                  </div>

                  {/* Accommodation Type */}
                  {listingType === 'offer' && (
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">{t('accommodationType')}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {accommodationTypes.map(type => (
                          <button
                            key={type.value}
                            onClick={() => setNewListing({...newListing, accommodation_type: type.value})}
                            className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                              newListing.accommodation_type === type.value
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-2xl">{type.emoji}</span>
                            <span className="text-sm font-medium">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duration */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">{t('duration')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {durationTypes.map(dur => (
                        <button
                          key={dur.value}
                          onClick={() => setNewListing({...newListing, duration: dur.value})}
                          className={`p-3 rounded-xl border-2 transition-all text-left ${
                            newListing.duration === dur.value
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-lg mr-2">{dur.emoji}</span>
                          <span className="text-sm font-medium">{dur.label}</span>
                          <p className="text-xs text-gray-500 mt-1">{dur.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Availability Calendar */}
                  {listingType === 'offer' && (
                    <div>
                      <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                        <Calendar size={16} className="text-orange-500" />
                        {t('availability')}
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">{t('availableFrom')}</label>
                          <Input
                            type="date"
                            value={newListing.available_from}
                            onChange={(e) => setNewListing({...newListing, available_from: e.target.value})}
                            min={new Date().toISOString().split('T')[0]}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">{t('availableUntil')}</label>
                          <Input
                            type="date"
                            value={newListing.available_until}
                            onChange={(e) => setNewListing({...newListing, available_until: e.target.value})}
                            min={newListing.available_from || new Date().toISOString().split('T')[0]}
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 {t('availabilityHint')}
                      </p>
                    </div>
                  )}

                  {/* Exchange Services */}
                  {newListing.duration === 'exchange' && (
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">{t('exchangeServices')}</Label>
                      <Textarea
                        value={newListing.exchange_services}
                        onChange={(e) => setNewListing({...newListing, exchange_services: e.target.value})}
                        placeholder={t('exchangeServicesPlaceholder')}
                        className="rounded-xl"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Max Guests */}
                  {listingType === 'offer' && (
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">{t('maxGuests')}</Label>
                      <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <button
                          onClick={() => setNewListing({...newListing, max_guests: Math.max(1, newListing.max_guests - 1)})}
                          className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center text-xl"
                        >
                          -
                        </button>
                        <span className="text-3xl font-bold w-16 text-center">{newListing.max_guests}</span>
                        <button
                          onClick={() => setNewListing({...newListing, max_guests: newListing.max_guests + 1})}
                          className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center text-xl"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Amenities */}
                  {listingType === 'offer' && (
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">{t('amenities')}</Label>
                      <div className="flex flex-wrap gap-2">
                        {amenitiesList.map(amenity => (
                          <button
                            key={amenity.id}
                            onClick={() => toggleAmenity(amenity.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                              newListing.amenities.includes(amenity.id)
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <amenity.icon size={16} />
                            <span className="text-sm">{amenity.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pets Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🐾</span>
                      <span className="font-medium">{t('petsAllowed')}</span>
                    </div>
                    <button
                      onClick={() => setNewListing({...newListing, pets_allowed: !newListing.pets_allowed})}
                      className={`w-14 h-8 rounded-full transition-all ${
                        newListing.pets_allowed ? 'bg-orange-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform ${
                        newListing.pets_allowed ? 'translate-x-7' : 'translate-x-1'
                      }`}></div>
                    </button>
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">{t('description')}</Label>
                    <Textarea
                      value={newListing.description}
                      onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                      placeholder={listingType === 'offer' ? t('offerDescPlaceholder') : t('needDescPlaceholder')}
                      className="rounded-xl"
                      rows={4}
                    />
                  </div>

                  {/* Photos Upload */}
                  <div>
                    <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                      <Camera size={16} className="text-orange-500" />
                      📸 {t('addPhotos')} <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                    </Label>

                    {newListing.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {newListing.photos.map((photo, idx) => (
                          <div key={idx} className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200" data-testid={`housing-photo-preview-${idx}`}>
                            <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewListing({...newListing, photos: newListing.photos.filter((_, i) => i !== idx)})}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
                              data-testid={`remove-housing-photo-${idx}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {newListing.photos.length < 5 && (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors" data-testid="housing-photo-upload-label">
                        <Camera size={32} className="text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600 font-medium">{t('addPhotos')}</span>
                        <span className="text-xs text-gray-400 mt-1">Máx. 5 fotos · 5MB cada</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5_000_000) {
                              toast.error('Imagem muito grande! Máximo 5MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewListing(prev => ({...prev, photos: [...prev.photos, reader.result]}));
                              toast.success('Foto adicionada!');
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                          className="hidden"
                          data-testid="housing-photo-input"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white">
                  <Button 
                    onClick={createListing}
                    className={`w-full rounded-xl py-6 text-base font-bold ${
                      listingType === 'offer'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                    }`}
                  >
                    {listingType === 'offer' ? '🏡 ' + t('publishOffer') : '🔍 ' + t('publishRequest')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
