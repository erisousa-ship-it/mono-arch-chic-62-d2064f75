import { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGooglePlacesAutocomplete } from '@/hooks/useGooglePlacesAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { AuthSheet } from '@/components/AuthSheet';
import { SEOHead } from '@/components/SEOHead';
import { Trash2 } from 'lucide-react';
import { z } from 'zod';

const eventSchema = z.object({
  eventName: z.string().trim().min(1, 'Nome do evento é obrigatório').max(200, 'Nome deve ter menos de 200 caracteres'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de início deve estar no formato HH:MM (ex.: 15:00)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de término deve estar no formato HH:MM (ex.: 16:00)'),
  location: z.string().trim().min(1, 'Localização é obrigatória').max(300, 'Localização deve ter menos de 300 caracteres'),
  description: z.string().trim().min(1, 'Descrição é obrigatória').max(2000, 'Descrição deve ter menos de 2000 caracteres'),
});

const EditEvent = () => {
  const { id } = useParams();
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registrants, setRegistrants] = useState<Array<{ display_name: string; registered_at: string }>>([]);
  
  
  const locationInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { onPlaceSelected } = useGooglePlacesAutocomplete(locationInputRef);

  useEffect(() => {
    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setShowAuthModal(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        setShowAuthModal(false);
      } else {
        setShowAuthModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && id) {
      fetchEvent();
    }
  }, [user, id]);

  useEffect(() => {
    onPlaceSelected((place) => {
      const address = place.formatted_address || place.name || '';
      setLocation(address);
    });
  }, [onPlaceSelected]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [eventName]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Evento não encontrado');
        navigate('/my-events');
        return;
      }

      // Check if user is the creator
      if (data.created_by !== user?.id) {
        toast.error('Você não tem permissão para editar este evento');
        navigate('/my-events');
        return;
      }

      // Populate form fields
      setEventName(data.title);
      setDescription(data.description);
      setLocation(data.address);
      setImagePreview(data.background_image_url);

      // Parse date and time
      const targetDate = new Date(data.target_date);
      setStartDate(targetDate);
      
      // Extract times from the time string (format: "HH:MM - HH:MM")
      const [start, end] = data.time.split(' - ');
      setStartTime(start);
      setEndTime(end);

      // For end date, we'll use the same as start for now
      setEndDate(targetDate);

      // Fetch registrants
      await fetchRegistrants();

      setLoading(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching event:', error);
      toast.error('Falha ao carregar evento');
      navigate('/my-events');
    }
  };

  const fetchRegistrants = async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          registered_at,
          profiles:user_id (display_name)
        `)
        .eq('event_id', id)
        .order('registered_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedRegistrants = data.map((reg: any) => ({
          display_name: reg.profiles?.display_name || 'Anônimo',
          registered_at: reg.registered_at
        }));
        setRegistrants(formattedRegistrants);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching registrants:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Envie uma imagem JPG, PNG, GIF ou WebP');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter menos de 5MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Validate date fields first
    if (!startDate) {
      toast.error('Selecione uma data de início');
      return;
    }
    if (!endDate) {
      toast.error('Selecione uma data de término');
      return;
    }

    // Validate input fields with Zod
    const validationResult = eventSchema.safeParse({
      eventName,
      startTime,
      endTime,
      location,
      description,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    // Validate date/time logic
    const startDateTime = new Date(startDate);
    const [startHours, startMinutes] = startTime.split(':');
    startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

    const endDateTime = new Date(endDate);
    const [endHours, endMinutes] = endTime.split(':');
    endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

    if (endDateTime <= startDateTime) {
      toast.error('A data/hora de término deve ser posterior à de início');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = imagePreview;

      // Upload new image if changed
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Create target_date from start date and time
      const targetDate = new Date(startDate);
      const [hours, minutes] = startTime.split(':');
      targetDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0);

      // Format date and time strings
      const dateStr = format(startDate, 'MMMM dd, yyyy');
      const timeStr = `${startTime} - ${endTime}`;

      // Get creator name from profile or fallback to email
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const creatorName = profile?.display_name || user.email?.split('@')[0] || 'Anônimo';

      // Update event in database
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: eventName,
          description: description,
          date: dateStr,
          time: timeStr,
          address: location,
          background_image_url: imageUrl,
          target_date: targetDate.toISOString(),
          creator: creatorName,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Evento atualizado com sucesso!');
      navigate('/my-events');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating event:', error);
      toast.error('Falha ao atualizar evento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Evento excluído com sucesso');
      navigate('/my-events');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error deleting event:', error);
      toast.error('Falha ao excluir evento');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex h-screen items-center justify-center">
          <div className="text-[#1A1A1A] text-2xl">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Editar Evento"
        description="Atualize os detalhes e configurações do seu evento"
      />
      <AuthSheet isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      
      <div className="min-h-screen bg-white">
        <Navbar />
        
        {user ? (
          <div className="max-w-7xl mx-auto pt-24 md:pt-32 pb-8 md:pb-16 px-4 md:px-8">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-start">
              {/* Left: Image Upload */}
              <div className="flex flex-col gap-3 md:gap-4">
            <label className="w-full aspect-[4/3] border border-black bg-[#D9D9D9] flex items-center justify-center cursor-pointer hover:bg-[#CECECE] transition-colors">
              {imagePreview ? (
                <img src={imagePreview} alt="Event preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-black text-[11px] font-medium uppercase tracking-wider">
                  ADICIONAR IMAGEM
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
            
            {imagePreview && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 text-[13px] font-medium uppercase tracking-wider border border-black bg-white hover:bg-black hover:text-white transition-colors"
              >
                Trocar imagem
              </button>
            )}
              </div>

              {/* Right: Form Fields */}
              <div className="space-y-4 md:space-y-6">
                <textarea
                  ref={titleRef}
                  placeholder="Nome do evento"
                  className="w-full text-black text-[32px] md:text-[48px] lg:text-[56px] font-medium leading-[1.2] mb-4 md:mb-8 focus:outline-none bg-transparent border-none p-0 placeholder:text-[#C4C4C4] resize-none overflow-hidden whitespace-pre-wrap break-words"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  rows={1}
                />

                {/* Start/End Date/Time Container */}
                <div className="relative">
                  {/* Start Date/Time */}
                  <div className="grid grid-cols-[80px_1fr_80px] md:grid-cols-[100px_1fr_100px] gap-0 border border-black mb-4 md:mb-6">
                    <div className="flex items-center justify-start gap-1.5 md:gap-2 border-r border-black px-2 md:px-3 py-2 md:py-3">
                      <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-black rounded-full"></div>
                      <span className="text-[14px] md:text-[17px] font-medium">Início</span>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            "px-2 md:px-4 py-2 md:py-3 text-[14px] md:text-[17px] text-left border-r border-black focus:outline-none bg-white",
                            !startDate && "text-[#C4C4C4]"
                          )}
                        >
                          {startDate ? format(startDate, "EEE, dd MMM") : "Qui, 28 Out"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <input
                      type="text"
                      placeholder="15:00"
                      className="px-2 md:px-4 py-2 md:py-3 text-[14px] md:text-[17px] text-black text-center focus:outline-none placeholder:text-[#C4C4C4]"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  {/* End Date/Time */}
                  <div className="grid grid-cols-[80px_1fr_80px] md:grid-cols-[100px_1fr_100px] gap-0 border border-black">
                <div className="flex items-center justify-start gap-1.5 md:gap-2 border-r border-black px-2 md:px-3 py-2 md:py-3">
                  <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-black rounded-full"></div>
                  <span className="text-[14px] md:text-[17px] font-medium">Término</span>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "px-2 md:px-4 py-2 md:py-3 text-[14px] md:text-[17px] text-left border-r border-black focus:outline-none bg-white",
                        !endDate && "text-[#C4C4C4]"
                      )}
                    >
                      {endDate ? format(endDate, "EEE, dd MMM") : "Qui, 28 Out"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <input
                  type="text"
                  placeholder="16:00"
                  className="px-2 md:px-4 py-2 md:py-3 text-[14px] md:text-[17px] text-black text-center focus:outline-none placeholder:text-[#C4C4C4]"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Location */}
            <input
              ref={locationInputRef}
              type="text"
              placeholder="Adicione a localização do evento"
              className="w-full px-3 md:px-4 py-2 md:py-3 text-[14px] md:text-[17px] text-black border border-black focus:outline-none placeholder:text-[#C4C4C4]"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            {/* Description */}
            <textarea
              placeholder="Adicione uma descrição"
              rows={6}
              className="w-full px-3 md:px-4 py-2 md:py-3 text-[14px] md:text-[17px] text-black border border-black focus:outline-none resize-none placeholder:text-[#C4C4C4]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Registrants List */}
            {registrants.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[18px] font-medium mb-4">Inscrições ({registrants.length})</h3>
                <div className="border border-black">
                  {registrants.map((registrant, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "px-3 md:px-4 py-2 md:py-3 flex justify-between items-center",
                        index !== registrants.length - 1 && "border-b border-black"
                      )}
                    >
                      <span className="text-[14px] md:text-[17px] font-medium">{registrant.display_name}</span>
                      <span className="text-[12px] md:text-[14px] text-gray-500">
                        {format(new Date(registrant.registered_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

                {/* Submit Button */}
                <div className="flex gap-3 items-center mt-4 md:mt-8">
                  <div className="group flex items-center self-stretch relative overflow-hidden flex-1">
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex h-[50px] justify-center items-center gap-2.5 border relative px-2.5 py-3.5 border-solid transition-all duration-300 ease-in-out w-[calc(100%-50px)] z-10 bg-[#1A1A1A] border-[#1A1A1A] group-hover:w-full group-hover:bg-[#FA76FF] group-hover:border-[#FA76FF] disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Atualizar evento"
                    >
                      <span className="text-white text-[13px] font-normal uppercase relative transition-colors duration-300 group-hover:text-black">
                        {isSubmitting ? 'ATUALIZANDO...' : 'ATUALIZAR EVENTO'}
                      </span>
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 12 12" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute right-[18px] opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100"
                        aria-hidden="true"
                      >
                        <path d="M0.857178 6H10.3929" stroke="#1A1A1A" strokeWidth="1.5" />
                        <path d="M6.39282 10L10.3928 6L6.39282 2" stroke="#1A1A1A" strokeWidth="1.5" />
                      </svg>
                    </button>
                    <div className="flex w-[50px] h-[50px] justify-center items-center border absolute right-0 bg-white rounded-[99px] border-solid border-[#1A1A1A] transition-all duration-300 ease-in-out group-hover:opacity-0 group-hover:scale-50 pointer-events-none z-0">
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 12 12" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="arrow-icon"
                        aria-hidden="true"
                      >
                        <path d="M0.857178 6H10.3929" stroke="#1A1A1A" strokeWidth="1.5" />
                        <path d="M6.39282 10L10.3928 6L6.39282 2" stroke="#1A1A1A" strokeWidth="1.5" />
                      </svg>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={handleDeleteEvent}
                    className="flex w-[50px] h-[50px] justify-center items-center border border-red-500 bg-red-500 text-white transition-all duration-300 hover:bg-red-600 hover:border-red-600"
                    aria-label="Excluir evento"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default EditEvent;
