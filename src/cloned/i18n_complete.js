import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  pt: {
    translation: {
      // Landing & Auth
      welcome: 'Bem-vindo ao PertoDeMimServicos',
      tagline: 'Conectando migrantes e ajudantes em Paris. Encontre apoio, ofereça ajuda, construa comunidade.',
      needHelp: 'Preciso de Ajuda',
      needHelpDesc: 'Encontre ajuda com trabalho, moradia, alimentação, serviços jurídicos e mais.',
      wantToHelp: 'Quero Ajudar',
      wantToHelpDesc: 'Ofereça seu apoio, compartilhe recursos e faça a diferença na vida de alguém.',
      alreadyAccount: 'Já tem uma conta?',
      noAccount: 'Não tem conta? Cadastre-se',
      hasAccount: 'Já tem conta? Entre',
      login: 'Entrar',
      register: 'Cadastrar',
      email: 'Email',
      password: 'Senha',
      name: 'Nome',
      phone: 'Telefone',
      
      // Categories
      food: 'Alimentação',
      legal: 'Jurídico',
      health: 'Saúde',
      housing: 'Moradia',
      work: 'Trabalho',
      education: 'Educação',
      social: 'Social',
      transport: 'Transporte',
      
      // Navigation
      chat: 'Chat AI',
      feed: 'Feed',
      profile: 'Perfil',
      map: 'Mapa',
      volunteers: 'Voluntários',
      services: 'Serviços',
      
      // Actions
      search: 'Buscar',
      askQuestion: 'Faça uma pergunta...',
      sendMessage: 'Enviar',
      save: 'Salvar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Excluir',
      share: 'Compartilhar',
      showMap: 'Mostrar Mapa',
      hideMap: 'Ocultar Mapa',
      filter: 'Filtrar',
      
      // Roles & Users
      migrant: 'Migrante',
      migrants: 'Migrantes',
      helper: 'Ajudante',
      helpers: 'Ajudantes',
      professional: 'Profissional',
      admin: 'Administrador',
      
      // Location
      location: 'Localização',
      yourLocation: 'Sua localização',
      getMyLocation: 'Obter Minha Localização',
      locationObtained: 'Localização obtida!',
      updateLocation: 'Atualizar Localização',
      locationAdded: 'Localização adicionada',
      locationShared: 'Sua localização será compartilhada',
      locationSuccess: 'Localização obtida com sucesso!',
      nearbyHelpers: 'Ajudantes próximos',
      distance: 'Distância',
      enableLocation: 'Habilitar localização',
      locationPermission: 'Permissão de localização necessária',
      
      // Professional Section
      forProfessionals: 'Para Profissionais',
      volunteerTitle: 'Seja um Voluntário Profissional',
      volunteerDesc: 'Advogados, médicos, psicólogos, assistentes sociais e outros profissionais',
      verifiedProfile: 'Cadastro Verificado',
      verifiedDesc: 'Perfil profissional com áreas de especialização e credenciais',
      targetedConnections: 'Conexões Direcionadas',
      targetedDesc: 'Receba pedidos de ajuda apenas nas suas áreas de expertise',
      impactMeasure: 'Impacto Medido',
      impactDesc: 'Acompanhe quantas pessoas você ajudou e o impacto gerado',
      registerVolunteer: 'Cadastrar como Voluntário Profissional',
      
      // Create Post
      createPost: 'Criar Pedido',
      postType: 'Tipo de Pedido',
      requestHelp: 'Pedir Ajuda',
      offerHelp: 'Oferecer Ajuda',
      category: 'Categoria',
      selectCategory: 'Selecione a Categoria',
      postTitle: 'Título do Pedido',
      postTitlePlaceholder: 'Ex: Preciso de roupas de inverno',
      beSpecific: 'Seja claro e específico',
      details: 'Detalhes',
      detailsPlaceholder: 'Descreva em detalhes: tamanhos, quantidades, quando precisa, etc...',
      moreDetails: 'Quanto mais detalhes, melhor!',
      addInfo: 'Adicionar Mais Informações (Opcional)',
      addPhotos: 'Adicionar Fotos',
      photosAdded: 'Fotos adicionadas:',
      publishNow: 'Publicar Agora',
      fillInfoToPublish: 'Preencha as informações abaixo para publicar',
      
      // Status & Messages
      loading: 'Carregando...',
      loadingMessages: 'Carregando mensagens...',
      noPostsFilter: 'Nenhum post encontrado com esses filtros.',
      noPostsYet: 'Nenhum post ainda. Seja o primeiro!',
      noUsersFound: 'Nenhum usuário encontrado',
      noPublicationsFound: 'Nenhuma publicação encontrada',
      noMessagesYet: 'Nenhuma mensagem ainda. Comece a conversa!',
      noCampaigns: 'Nenhuma divulgação cadastrada',
      
      // Common
      accessSite: 'Acessar site',
      urgent: 'URGENTE',
      tip: 'Dica',
      visitFor: 'Visite',
      forMoreResources: 'para mais recursos e informações atualizadas.',
      searchByName: 'Buscar por nome ou email...',
      searchPosts: 'Buscar publicações...',
      registrationDate: 'Data de Cadastro',
      helpRequests: 'Pedidos de Ajuda',
      helpOffers: 'Ofertas de Ajuda',
      
      // Admin Dashboard
      dashboard: 'Painel Administrativo',
      statistics: 'Estatísticas',
      users: 'Usuários',
      posts: 'Publicações',
      campaigns: 'Divulgações',
      totalUsers: 'Total de Usuários',
      totalPosts: 'Total de Publicações',
      
      // Chat
      mediaShared: 'Mídia compartilhada',
      locationSent: 'Localização enviada!',
      
      // Category descriptions
      helpWithWork: 'Ajuda com trabalho',
      helpWithHousing: 'Ajuda com habitação',
      helpWithTransport: 'Ajuda com deslocamento',
      helpWithFood: 'Ajuda com alimentação',
      helpWithLegal: 'Assistência jurídica',
      helpWithHealth: 'Ajuda com saúde',
      helpWithEducation: 'Ajuda com educação',
      helpWithSocial: 'Suporte social',
    }
  },
  fr: {
    translation: {
      // Landing & Auth
      welcome: 'Bienvenue à PertoDeMimServicos',
      tagline: 'Connecter les migrants et les aidants à Paris. Trouvez du soutien, offrez de l\'aide, construisez une communauté.',
      needHelp: "J'ai besoin d'aide",
      needHelpDesc: 'Trouvez de l\'aide pour le travail, le logement, l\'alimentation, les services juridiques et plus encore.',
      wantToHelp: 'Je veux aider',
      wantToHelpDesc: 'Offrez votre soutien, partagez des ressources et faites une différence.',
      alreadyAccount: 'Vous avez déjà un compte?',
      noAccount: 'Pas de compte? Inscrivez-vous',
      hasAccount: 'Vous avez un compte? Connectez-vous',
      login: 'Se connecter',
      register: "S'inscrire",
      email: 'Email',
      password: 'Mot de passe',
      name: 'Nom',
      phone: 'Téléphone',
      
      // Categories
      food: 'Alimentation',
      legal: 'Juridique',
      health: 'Santé',
      housing: 'Logement',
      work: 'Travail',
      education: 'Éducation',
      social: 'Social',
      transport: 'Transport',
      
      // Navigation
      chat: 'Chat IA',
      feed: 'Fil',
      profile: 'Profil',
      map: 'Carte',
      volunteers: 'Bénévoles',
      services: 'Services',
      
      // Actions
      search: 'Rechercher',
      askQuestion: 'Posez une question...',
      sendMessage: 'Envoyer',
      save: 'Enregistrer',
      cancel: 'Annuler',
      edit: 'Modifier',
      delete: 'Supprimer',
      share: 'Partager',
      showMap: 'Afficher la carte',
      hideMap: 'Masquer la carte',
      filter: 'Filtrer',
      
      // Roles & Users
      migrant: 'Migrant',
      migrants: 'Migrants',
      helper: 'Aidant',
      helpers: 'Aidants',
      professional: 'Professionnel',
      admin: 'Administrateur',
      
      // Location
      location: 'Localisation',
      yourLocation: 'Votre position',
      getMyLocation: 'Obtenir ma position',
      locationObtained: 'Position obtenue!',
      updateLocation: 'Mettre à jour la position',
      locationAdded: 'Position ajoutée',
      locationShared: 'Votre position sera partagée',
      locationSuccess: 'Position obtenue avec succès!',
      nearbyHelpers: 'Aidants à proximité',
      distance: 'Distance',
      enableLocation: 'Activer la localisation',
      locationPermission: 'Permission de localisation nécessaire',
      
      // Professional Section
      forProfessionals: 'Pour les professionnels',
      volunteerTitle: 'Devenez bénévole professionnel',
      volunteerDesc: 'Avocats, médecins, psychologues, assistants sociaux et autres professionnels',
      verifiedProfile: 'Profil Vérifié',
      verifiedDesc: 'Profil professionnel avec domaines de spécialisation',
      targetedConnections: 'Connexions Ciblées',
      targetedDesc: 'Recevez des demandes uniquement dans vos domaines',
      impactMeasure: 'Impact Mesuré',
      impactDesc: 'Suivez combien de personnes vous avez aidées',
      registerVolunteer: 'S\'inscrire comme Bénévole',
      
      // Create Post
      createPost: 'Créer une demande',
      postType: 'Type de demande',
      requestHelp: 'Demander de l\'aide',
      offerHelp: 'Offrir de l\'aide',
      category: 'Catégorie',
      selectCategory: 'Sélectionner la catégorie',
      postTitle: 'Titre de la demande',
      postTitlePlaceholder: 'Ex: J\'ai besoin de vêtements d\'hiver',
      beSpecific: 'Soyez clair et précis',
      details: 'Détails',
      detailsPlaceholder: 'Décrivez en détail: tailles, quantités, quand vous en avez besoin...',
      moreDetails: 'Plus de détails, mieux c\'est!',
      addInfo: 'Ajouter plus d\'informations (Optionnel)',
      addPhotos: 'Ajouter des photos',
      photosAdded: 'Photos ajoutées:',
      publishNow: 'Publier maintenant',
      fillInfoToPublish: 'Remplissez les informations pour publier',
      
      // Status & Messages
      loading: 'Chargement...',
      loadingMessages: 'Chargement des messages...',
      noPostsFilter: 'Aucun post trouvé avec ces filtres.',
      noPostsYet: 'Aucun post encore. Soyez le premier!',
      noUsersFound: 'Aucun utilisateur trouvé',
      noPublicationsFound: 'Aucune publication trouvée',
      noMessagesYet: 'Aucun message encore. Commencez la conversation!',
      noCampaigns: 'Aucune campagne enregistrée',
      
      // Common
      accessSite: 'Accéder au site',
      urgent: 'URGENT',
      tip: 'Conseil',
      visitFor: 'Visitez',
      forMoreResources: 'pour plus de ressources et d\'informations',
      searchByName: 'Rechercher par nom ou email...',
      searchPosts: 'Rechercher des publications...',
      registrationDate: 'Date d\'inscription',
      helpRequests: 'Demandes d\'aide',
      helpOffers: 'Offres d\'aide',
      
      // Admin Dashboard
      dashboard: 'Tableau de bord administratif',
      statistics: 'Statistiques',
      users: 'Utilisateurs',
      posts: 'Publications',
      campaigns: 'Campagnes',
      totalUsers: 'Total d\'utilisateurs',
      totalPosts: 'Total de publications',
      
      // Chat
      mediaShared: 'Média partagé',
      locationSent: 'Position envoyée!',
      
      // Category descriptions
      helpWithWork: 'Aide pour le travail',
      helpWithHousing: 'Aide pour le logement',
      helpWithTransport: 'Aide pour le transport',
      helpWithFood: 'Aide alimentaire',
      helpWithLegal: 'Assistance juridique',
      helpWithHealth: 'Aide santé',
      helpWithEducation: 'Aide éducation',
      helpWithSocial: 'Soutien social',
    }
  },
  en: {
    translation: {
      // Landing & Auth
      welcome: 'Welcome to PertoDeMimServicos',
      tagline: 'Connecting migrants and helpers in Paris. Find support, offer help, build community.',
      needHelp: 'I Need Help',
      needHelpDesc: 'Find help with work, housing, food, legal services and more.',
      wantToHelp: 'I Want to Help',
      wantToHelpDesc: 'Offer your support, share resources and make a difference.',
      alreadyAccount: 'Already have an account?',
      noAccount: 'No account? Sign up',
      hasAccount: 'Have an account? Login',
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      name: 'Name',
      phone: 'Phone',
      
      // Categories
      food: 'Food',
      legal: 'Legal',
      health: 'Health',
      housing: 'Housing',
      work: 'Work',
      education: 'Education',
      social: 'Social',
      transport: 'Transport',
      
      // Navigation
      chat: 'AI Chat',
      feed: 'Feed',
      profile: 'Profile',
      map: 'Map',
      volunteers: 'Volunteers',
      services: 'Services',
      
      // Actions
      search: 'Search',
      askQuestion: 'Ask a question...',
      sendMessage: 'Send',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      share: 'Share',
      showMap: 'Show Map',
      hideMap: 'Hide Map',
      filter: 'Filter',
      
      // Roles & Users
      migrant: 'Migrant',
      migrants: 'Migrants',
      helper: 'Helper',
      helpers: 'Helpers',
      professional: 'Professional',
      admin: 'Administrator',
      
      // Location
      location: 'Location',
      yourLocation: 'Your location',
      getMyLocation: 'Get My Location',
      locationObtained: 'Location obtained!',
      updateLocation: 'Update Location',
      locationAdded: 'Location added',
      locationShared: 'Your location will be shared',
      locationSuccess: 'Location obtained successfully!',
      nearbyHelpers: 'Nearby helpers',
      distance: 'Distance',
      enableLocation: 'Enable location',
      locationPermission: 'Location permission needed',
      
      // Professional Section
      forProfessionals: 'For Professionals',
      volunteerTitle: 'Become a Professional Volunteer',
      volunteerDesc: 'Lawyers, doctors, psychologists, social workers and professionals',
      verifiedProfile: 'Verified Profile',
      verifiedDesc: 'Professional profile with areas of expertise',
      targetedConnections: 'Targeted Connections',
      targetedDesc: 'Receive help requests only in your areas',
      impactMeasure: 'Measured Impact',
      impactDesc: 'Track how many people you\'ve helped',
      registerVolunteer: 'Register as Professional Volunteer',
      
      // Create Post
      createPost: 'Create Request',
      postType: 'Request Type',
      requestHelp: 'Request Help',
      offerHelp: 'Offer Help',
      category: 'Category',
      selectCategory: 'Select Category',
      postTitle: 'Request Title',
      postTitlePlaceholder: 'Ex: Need winter clothes',
      beSpecific: 'Be clear and specific',
      details: 'Details',
      detailsPlaceholder: 'Describe in detail: sizes, quantities, when you need it...',
      moreDetails: 'More details, the better!',
      addInfo: 'Add More Information (Optional)',
      addPhotos: 'Add Photos',
      photosAdded: 'Photos added:',
      publishNow: 'Publish Now',
      fillInfoToPublish: 'Fill in the information to publish',
      
      // Status & Messages
      loading: 'Loading...',
      loadingMessages: 'Loading messages...',
      noPostsFilter: 'No posts found with these filters.',
      noPostsYet: 'No posts yet. Be the first!',
      noUsersFound: 'No users found',
      noPublicationsFound: 'No publications found',
      noMessagesYet: 'No messages yet. Start the conversation!',
      noCampaigns: 'No campaigns registered',
      
      // Common
      accessSite: 'Access site',
      urgent: 'URGENT',
      tip: 'Tip',
      visitFor: 'Visit',
      forMoreResources: 'for more resources and information',
      searchByName: 'Search by name or email...',
      searchPosts: 'Search posts...',
      registrationDate: 'Registration Date',
      helpRequests: 'Help Requests',
      helpOffers: 'Help Offers',
      
      // Admin Dashboard
      dashboard: 'Admin Dashboard',
      statistics: 'Statistics',
      users: 'Users',
      posts: 'Posts',
      campaigns: 'Campaigns',
      totalUsers: 'Total Users',
      totalPosts: 'Total Posts',
      
      // Chat
      mediaShared: 'Media shared',
      locationSent: 'Location sent!',
      
      // Category descriptions
      helpWithWork: 'Help with work',
      helpWithHousing: 'Help with housing',
      helpWithTransport: 'Help with transport',
      helpWithFood: 'Help with food',
      helpWithLegal: 'Legal assistance',
      helpWithHealth: 'Help with health',
      helpWithEducation: 'Help with education',
      helpWithSocial: 'Social support',
    }
  },
  es: {
    translation: {
      // Landing & Auth
      welcome: 'Bienvenido a PertoDeMimServicos',
      tagline: 'Conectando migrantes y ayudantes en París. Encuentra apoyo, ofrece ayuda, construye comunidad.',
      needHelp: 'Necesito Ayuda',
      needHelpDesc: 'Encuentra ayuda con trabajo, vivienda, alimentación, servicios legales y más.',
      wantToHelp: 'Quiero Ayudar',
      wantToHelpDesc: 'Ofrece tu apoyo, comparte recursos y marca la diferencia.',
      alreadyAccount: '¿Ya tienes una cuenta?',
      noAccount: '¿No tienes cuenta? Regístrate',
      hasAccount: '¿Tienes cuenta? Inicia sesión',
      login: 'Iniciar sesión',
      register: 'Registrarse',
      email: 'Email',
      password: 'Contraseña',
      name: 'Nombre',
      phone: 'Teléfono',
      
      // Categories
      food: 'Alimentación',
      legal: 'Legal',
      health: 'Salud',
      housing: 'Vivienda',
      work: 'Trabajo',
      education: 'Educación',
      social: 'Social',
      transport: 'Transporte',
      
      // Navigation
      chat: 'Chat IA',
      feed: 'Feed',
      profile: 'Perfil',
      map: 'Mapa',
      volunteers: 'Voluntarios',
      services: 'Servicios',
      
      // Actions
      search: 'Buscar',
      askQuestion: 'Haz una pregunta...',
      sendMessage: 'Enviar',
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      share: 'Compartir',
      showMap: 'Mostrar Mapa',
      hideMap: 'Ocultar Mapa',
      filter: 'Filtrar',
      
      // Roles & Users
      migrant: 'Migrante',
      migrants: 'Migrantes',
      helper: 'Ayudante',
      helpers: 'Ayudantes',
      professional: 'Profesional',
      admin: 'Administrador',
      
      // Location
      location: 'Ubicación',
      yourLocation: 'Tu ubicación',
      getMyLocation: 'Obtener Mi Ubicación',
      locationObtained: '¡Ubicación obtenida!',
      updateLocation: 'Actualizar Ubicación',
      locationAdded: 'Ubicación agregada',
      locationShared: 'Tu ubicación será compartida',
      locationSuccess: '¡Ubicación obtenida con éxito!',
      nearbyHelpers: 'Ayudantes cercanos',
      distance: 'Distancia',
      enableLocation: 'Habilitar ubicación',
      locationPermission: 'Se necesita permiso de ubicación',
      
      // Professional Section
      forProfessionals: 'Para Profesionales',
      volunteerTitle: 'Conviértete en Voluntario Profesional',
      volunteerDesc: 'Abogados, médicos, psicólogos, trabajadores sociales y profesionales',
      verifiedProfile: 'Perfil Verificado',
      verifiedDesc: 'Perfil profesional con áreas de especialización',
      targetedConnections: 'Conexiones Dirigidas',
      targetedDesc: 'Recibe solicitudes solo en tus áreas',
      impactMeasure: 'Impacto Medido',
      impactDesc: 'Rastrea cuántas personas has ayudado',
      registerVolunteer: 'Registrarse como Voluntario',
      
      // Create Post
      createPost: 'Crear Solicitud',
      postType: 'Tipo de solicitud',
      requestHelp: 'Solicitar ayuda',
      offerHelp: 'Ofrecer ayuda',
      category: 'Categoría',
      selectCategory: 'Seleccionar categoría',
      postTitle: 'Título de la solicitud',
      postTitlePlaceholder: 'Ej: Necesito ropa de invierno',
      beSpecific: 'Sé claro y específico',
      details: 'Detalles',
      detailsPlaceholder: 'Describe en detalle: tallas, cantidades, cuándo lo necesitas...',
      moreDetails: '¡Cuantos más detalles, mejor!',
      addInfo: 'Agregar Más Información (Opcional)',
      addPhotos: 'Agregar Fotos',
      photosAdded: 'Fotos agregadas:',
      publishNow: 'Publicar Ahora',
      fillInfoToPublish: 'Completa la información para publicar',
      
      // Status & Messages
      loading: 'Cargando...',
      loadingMessages: 'Cargando mensajes...',
      noPostsFilter: 'No se encontraron publicaciones con estos filtros.',
      noPostsYet: 'No hay publicaciones aún. ¡Sé el primero!',
      noUsersFound: 'No se encontraron usuarios',
      noPublicationsFound: 'No se encontraron publicaciones',
      noMessagesYet: 'No hay mensajes aún. ¡Comienza la conversación!',
      noCampaigns: 'No hay campañas registradas',
      
      // Common
      accessSite: 'Acceder al sitio',
      urgent: 'URGENTE',
      tip: 'Consejo',
      visitFor: 'Visita',
      forMoreResources: 'para más recursos e información',
      searchByName: 'Buscar por nombre o email...',
      searchPosts: 'Buscar publicaciones...',
      registrationDate: 'Fecha de registro',
      helpRequests: 'Solicitudes de ayuda',
      helpOffers: 'Ofertas de ayuda',
      
      // Admin Dashboard
      dashboard: 'Panel Administrativo',
      statistics: 'Estadísticas',
      users: 'Usuarios',
      posts: 'Publicaciones',
      campaigns: 'Campañas',
      totalUsers: 'Total de Usuarios',
      totalPosts: 'Total de Publicaciones',
      
      // Chat
      mediaShared: 'Multimedia compartido',
      locationSent: '¡Ubicación enviada!',
      
      // Category descriptions
      helpWithWork: 'Ayuda con trabajo',
      helpWithHousing: 'Ayuda con vivienda',
      helpWithTransport: 'Ayuda con transporte',
      helpWithFood: 'Ayuda alimentaria',
      helpWithLegal: 'Asistencia legal',
      helpWithHealth: 'Ayuda con salud',
      helpWithEducation: 'Ayuda con educación',
      helpWithSocial: 'Apoyo social',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
