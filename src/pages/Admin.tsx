import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { SEOHead } from '@/components/SEOHead';

// Input validation schema
const eventSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título deve ter menos de 200 caracteres'),
  creator: z.string()
    .trim()
    .min(1, 'Criador é obrigatório')
    .max(100, 'Criador deve ter menos de 100 caracteres'),
  description: z.string()
    .trim()
    .min(1, 'Descrição é obrigatória')
    .max(2000, 'Descrição deve ter menos de 2000 caracteres'),
  date: z.string()
    .trim()
    .min(1, 'Data é obrigatória')
    .max(50, 'Data deve ter menos de 50 caracteres'),
  time: z.string()
    .trim()
    .min(1, 'Horário é obrigatório')
    .max(50, 'Horário deve ter menos de 50 caracteres'),
  address: z.string()
    .trim()
    .min(1, 'Endereço é obrigatório')
    .max(300, 'Endereço deve ter menos de 300 caracteres'),
  target_date: z.string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Formato de data inválido'),
});

interface Event {
  id: string;
  title: string;
  creator: string;
  description: string;
  date: string;
  time: string;
  address: string;
  background_image_url: string;
  target_date: string;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    // Check if user has admin role
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();

    if (error || !roles) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem privilégios de admin',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    fetchEvents();
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*');

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEvents(data || []);
      if (data && data.length > 0) {
        setSelectedEvent(data[0]);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedEvent) return;
    
    const file = e.target.files[0];
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Envie uma imagem JPG, PNG, GIF ou WebP',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter menos de 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const fileExt = file.name.split('.').pop();
      // Organize uploads by user_id as required by storage policies
      const fileName = `${session.user.id}/${selectedEvent.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      setSelectedEvent({ ...selectedEvent, background_image_url: publicUrl });
      
      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    // Convert datetime-local string to ISO timestamp
    const targetDateISO = selectedEvent.target_date.includes('T') 
      ? new Date(selectedEvent.target_date).toISOString()
      : selectedEvent.target_date;

    // Validate event data
    try {
      eventSchema.parse({
        title: selectedEvent.title,
        creator: selectedEvent.creator,
        description: selectedEvent.description,
        date: selectedEvent.date,
        time: selectedEvent.time,
        address: selectedEvent.address,
        target_date: targetDateISO,
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: validationError.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    const { error } = await supabase
      .from('events')
      .update({
        title: selectedEvent.title.trim(),
        creator: selectedEvent.creator.trim(),
        description: selectedEvent.description.trim(),
        date: selectedEvent.date.trim(),
        time: selectedEvent.time.trim(),
        address: selectedEvent.address.trim(),
        background_image_url: selectedEvent.background_image_url,
        target_date: targetDateISO,
      })
      .eq('id', selectedEvent.id);

    if (error) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Evento atualizado com sucesso',
      });
      fetchEvents();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <SEOHead 
        title="Painel Admin"
        description="Gerencie eventos e conteúdo da sua plataforma"
      />
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-normal text-[#1A1A1A] tracking-[-0.02em]">
            CMS de Eventos
          </h1>
          <Button onClick={handleSignOut} variant="outline">
            Sair
          </Button>
        </div>

        {selectedEvent && (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="text-[#1A1A1A] text-sm font-normal uppercase mb-2 block">
                Título do evento
              </label>
              <Input
                value={selectedEvent.title}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, title: e.target.value })
                }
                className="border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="text-[#1A1A1A] text-sm font-normal uppercase mb-2 block">
                Criador
              </label>
              <Input
                value={selectedEvent.creator}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, creator: e.target.value })
                }
                className="border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="text-[#1A1A1A] text-sm font-normal uppercase mb-2 block">
                Descrição
              </label>
              <Textarea
                value={selectedEvent.description}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, description: e.target.value })
                }
                className="border-[#1A1A1A] min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[#1A1A1A] text-sm font-normal uppercase mb-2 block">
                  Data
                </label>
                <Input
                  value={selectedEvent.date}
                  onChange={(e) =>
                    setSelectedEvent({ ...selectedEvent, date: e.target.value })
                  }
                  className="border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="text-[#1A1A1A] text-sm font-normal uppercase mb-2 block">
                  Horário
                </label>
                <Input
                  value={selectedEvent.time}
                  onChange={(e) =>
                    setSelectedEvent({ ...selectedEvent, time: e.target.value })
                  }
                  className="border-[#1A1A1A]"
                />
              </div>
            </div>

            <div>
              <label className="text-[#1A1A1A] text-sm font-normal uppercase mb-2 block">
                Endereço
              </label>
              <Input
                value={selectedEvent.address}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, address: e.target.value })
                }
                className="border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="text-[#1A1A1A] text-sm font-normal uppercase mb-2 block">
                Imagem de fundo
              </label>
              {selectedEvent.background_image_url && (
                <img 
                  src={selectedEvent.background_image_url} 
                  alt="Fundo atual" 
                  className="w-full h-32 object-cover mb-2 rounded"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="border-[#1A1A1A]"
              />
              {uploading && <p className="text-sm text-[#1A1A1A] mt-1">Enviando...</p>}
            </div>

            <div>
              <label className="text-[#1A1A1A] text-sm font-normal uppercase mb-2 block">
                Data alvo (AAAA-MM-DD HH:MM:SS)
              </label>
              <Input
                type="datetime-local"
                value={selectedEvent.target_date.slice(0, 16)}
                onChange={(e) =>
                  setSelectedEvent({ ...selectedEvent, target_date: e.target.value })
                }
                className="border-[#1A1A1A]"
              />
            </div>

            <Button type="submit" className="w-full bg-[#1A1A1A] text-white hover:bg-opacity-90">
              Salvar alterações
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Admin;
