import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import BottomNav from '../components/BottomNav';
import {
  Users, FileText, Link, MessageCircle, UserCheck, UserX,
  Trash2, Search, Filter, BarChart3, PieChart, TrendingUp,
  Shield, AlertTriangle, CheckCircle, XCircle, Edit, Eye,
  RefreshCw, Download, Settings, Home, ChevronRight, Megaphone, Plus, Image as ImageIcon, UserPlus
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'food', label: 'Alimentação', icon: '🍽️', color: 'bg-green-100 text-green-700' },
  { value: 'legal', label: 'Jurídico', icon: '⚖️', color: 'bg-blue-100 text-blue-700' },
  { value: 'health', label: 'Saúde', icon: '🏥', color: 'bg-red-100 text-red-700' },
  { value: 'housing', label: 'Moradia', icon: '🏠', color: 'bg-orange-100 text-orange-700' },
  { value: 'work', label: 'Emprego', icon: '💼', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'education', label: 'Educação', icon: '📚', color: 'bg-orange-100 text-orange-700' },
  { value: 'social', label: 'Social', icon: '🤝', color: 'bg-orange-100 text-orange-700' },
  { value: 'clothes', label: 'Roupas', icon: '👕', color: 'bg-orange-100 text-orange-700' },
  { value: 'furniture', label: 'Móveis', icon: '🪑', color: 'bg-teal-100 text-teal-700' },
  { value: 'transport', label: 'Transporte', icon: '🚗', color: 'bg-cyan-100 text-cyan-700' }
];

export default function AdminDashboard() {
  const { token, user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('');
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [newAd, setNewAd] = useState({
    type: 'motivation',
    title: '',
    content: '',
    image_url: '',
    link_url: '',
    link_text: '',
    is_active: true,
    priority: 5
  });
  
  // Estado para adicionar novo administrador
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: 'admin@pertodemimservicos.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin',
    languages: ['pt', 'en', 'fr']
  });
  const [addingAdmin, setAddingAdmin] = useState(false);
  
  // Estado para Housing Management
  const [housingListings, setHousingListings] = useState([]);
  const [housingFilter, setHousingFilter] = useState('all');
  const [showHousingDetailDialog, setShowHousingDetailDialog] = useState(false);
  const [selectedHousing, setSelectedHousing] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchPosts();
    fetchAdvertisements();
    fetchHousingListings();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/admin/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchAdvertisements = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/admin/advertisements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdvertisements(data);
      }
    } catch (error) {
      console.error('Error fetching advertisements:', error);
    }
  };

  const fetchHousingListings = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/housing`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHousingListings(data);
      }
    } catch (error) {
      console.error('Error fetching housing listings:', error);
    }
  };

  const updateHousingStatus = async (listingId, newStatus) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/housing/${listingId}/status?new_status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success(`Status atualizado para ${newStatus}`);
        fetchHousingListings();
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteHousingListing = async (listingId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/housing/${listingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Anúncio removido com sucesso');
        fetchHousingListings();
        setShowHousingDetailDialog(false);
      }
    } catch (error) {
      toast.error('Erro ao remover anúncio');
    }
  };

  // Função para adicionar novo administrador
  const handleAddAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.name) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (newAdmin.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setAddingAdmin(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAdmin)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Administrador criado com sucesso!');
        setShowAddAdminDialog(false);
        setNewAdmin({
          email: 'admin@pertodemimservicos.com',
          password: 'admin123',
          name: 'Administrador',
          role: 'admin',
          languages: ['pt', 'en', 'fr']
        });
        fetchUsers();
        fetchStats();
      } else {
        toast.error(data.detail || 'Erro ao criar administrador');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Erro de conexão ao criar administrador');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const endpoint = deleteType === 'user'
        ? `/api/admin/users/${itemToDelete.id}`
        : `/api/admin/posts/${itemToDelete.id}`;

      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}${endpoint}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success(`${deleteType === 'user' ? 'Usuário' : 'Post'} excluído com sucesso!`);
        if (deleteType === 'user') {
          fetchUsers();
        } else {
          fetchPosts();
        }
        fetchStats();
      } else {
        toast.error('Erro ao excluir');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        toast.success('Função atualizada com sucesso!');
        fetchUsers();
      } else {
        toast.error('Erro ao atualizar função');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    }
  };

  const saveAdvertisement = async () => {
    if (!newAd.title || !newAd.content) {
      toast.error('Preencha título e conteúdo');
      return;
    }

    try {
      const url = editingAd
        ? `${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/admin/advertisements/${editingAd.id}`
        : `${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/admin/advertisements`;

      const response = await fetch(url, {
        method: editingAd ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAd)
      });

      if (response.ok) {
        toast.success(editingAd ? 'Anúncio atualizado!' : 'Anúncio criado!');
        fetchAdvertisements();
        setShowAdDialog(false);
        setEditingAd(null);
        setNewAd({
          type: 'motivation',
          title: '',
          content: '',
          image_url: '',
          link_url: '',
          link_text: '',
          is_active: true,
          priority: 5
        });
      } else {
        toast.error('Erro ao salvar anúncio');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    }
  };

  const deleteAdvertisement = async (adId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/admin/advertisements/${adId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Anúncio excluído!');
        fetchAdvertisements();
      } else {
        toast.error('Erro ao excluir');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    }
  };

  const editAdvertisement = (ad) => {
    setEditingAd(ad);
    setNewAd({
      type: ad.type,
      title: ad.title,
      content: ad.content,
      image_url: ad.image_url || '',
      link_url: ad.link_url || '',
      link_text: ad.link_text || '',
      is_active: ad.is_active,
      priority: ad.priority || 5
    });
    setShowAdDialog(true);
  };

  const toggleAdStatus = async (ad) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/admin/advertisements/${ad.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !ad.is_active })
      });

      if (response.ok) {
        toast.success(ad.is_active ? 'Anúncio desativado' : 'Anúncio ativado');
        fetchAdvertisements();
      }
    } catch (error) {
      toast.error('Erro de conexão');
    }
  };

  const confirmDelete = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteDialog(true);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (cat) => {
    return CATEGORIES.find(c => c.value === cat) || { icon: '📝', label: cat, color: 'bg-gray-100 text-gray-700' };
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'volunteer': return 'bg-blue-100 text-blue-700';
      case 'migrant': return 'bg-green-100 text-green-700';
      case 'helper': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'admin': return 'Administrador';
      case 'volunteer': return 'Voluntário';
      case 'migrant': return 'Migrante';
      case 'helper': return 'Ajudante';
      default: return role;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'posts', label: 'Publicações', icon: FileText },
    { id: 'housing', label: 'Hospedagem', icon: Home },
    { id: 'ads', label: 'Divulgações', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="admin-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white py-6 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
            <Home size={16} />
            <ChevronRight size={14} />
            <span>Administração</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold flex items-center gap-3">
            <Shield size={32} />
            Painel Administrativo
          </h1>
          <p className="text-white/80 mt-1">Gerencie usuários, publicações e monitore o sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                  <Users size={20} className="text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_users || 0}</p>
                <p className="text-sm text-gray-500">Total Usuários</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-3">
                  <UserCheck size={20} className="text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_volunteers || 0}</p>
                <p className="text-sm text-gray-500">Voluntários</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
                  <UserX size={20} className="text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_migrants || 0}</p>
                <p className="text-sm text-gray-500">Migrantes</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center mb-3">
                  <FileText size={20} className="text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_posts || 0}</p>
                <p className="text-sm text-gray-500">Publicações</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
                  <MessageCircle size={20} className="text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_messages || 0}</p>
                <p className="text-sm text-gray-500">Mensagens</p>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
                  <Link size={20} className="text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stats?.total_matches || 0}</p>
                <p className="text-sm text-gray-500">Conexões</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Posts by Type */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-primary" />
                  Posts por Tipo
                </h3>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-green-700">{stats?.needs_count || 0}</span>
                    </div>
                    <p className="text-sm text-gray-600">Pedidos de Ajuda</p>
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-blue-700">{stats?.offers_count || 0}</span>
                    </div>
                    <p className="text-sm text-gray-600">Ofertas de Ajuda</p>
                  </div>
                </div>
              </div>

              {/* Posts by Category */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  Posts por Categoria
                </h3>
                <div className="space-y-3">
                  {CATEGORIES.map(cat => {
                    const count = stats?.posts_by_category?.[cat.value] || 0;
                    const maxCount = Math.max(...Object.values(stats?.posts_by_category || { 1: 1 }), 1);
                    const percentage = (count / maxCount) * 100;

                    return (
                      <div key={cat.value} className="flex items-center gap-3">
                        <span className="text-xl w-8">{cat.icon}</span>
                        <span className="text-sm text-gray-600 w-24">{cat.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${cat.color.split(' ')[0]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-8">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                Atividade Recente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Últimos Usuários</h4>
                  <div className="space-y-2">
                    {users.slice(0, 5).map(u => (
                      <div key={u.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{u.name?.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                          <p className="text-xs text-gray-500">{getRoleLabel(u.role)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Últimas Publicações</h4>
                  <div className="space-y-2">
                    {posts.slice(0, 5).map(p => {
                      const catInfo = getCategoryInfo(p.category);
                      return (
                        <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                          <span className="text-xl">{catInfo.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                            <p className="text-xs text-gray-500">{p.user?.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome ou email..."
                    className="pl-10 rounded-xl"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border rounded-xl bg-white"
                >
                  <option value="all">Todas as funções</option>
                  <option value="admin">Administradores</option>
                  <option value="volunteer">Voluntários</option>
                  <option value="migrant">Migrantes</option>
                  <option value="helper">Ajudantes</option>
                </select>
                <Button onClick={() => { fetchUsers(); fetchStats(); }} variant="outline" className="rounded-xl">
                  <RefreshCw size={18} className="mr-2" />
                  Atualizar
                </Button>
                <Button 
                  onClick={() => setShowAddAdminDialog(true)} 
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                  data-testid="add-admin-btn"
                >
                  <UserPlus size={18} className="mr-2" />
                  Adicionar Admin
                </Button>
              </div>
            </div>

            {/* Users List */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-600">Usuário</th>
                      <th className="text-left p-4 font-medium text-gray-600">Email</th>
                      <th className="text-left p-4 font-medium text-gray-600">Função</th>
                      <th className="text-left p-4 font-medium text-gray-600">Data de Cadastro</th>
                      <th className="text-left p-4 font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                              <span className="text-white font-bold">{u.name?.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{u.name}</p>
                              {u.professional_area && (
                                <p className="text-xs text-gray-500">{u.professional_area}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">{u.email}</td>
                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                            className={`px-3 py-1 rounded-full text-sm font-medium border-0 ${getRoleColor(u.role)}`}
                            disabled={u.id === user?.id}
                          >
                            <option value="migrant">Migrante</option>
                            <option value="volunteer">Voluntário</option>
                            <option value="helper">Ajudante</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </td>
                        <td className="p-4 text-gray-600 text-sm">
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => confirmDelete(u, 'user')}
                              variant="outline"
                              size="sm"
                              className="rounded-lg text-red-600 hover:bg-red-50 border-red-200"
                              disabled={u.id === user?.id}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nenhum usuário encontrado
                </div>
              )}
            </div>
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar publicações..."
                    className="pl-10 rounded-xl"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border rounded-xl bg-white"
                >
                  <option value="all">Todas as categorias</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
                <Button onClick={() => { fetchPosts(); fetchStats(); }} variant="outline" className="rounded-xl">
                  <RefreshCw size={18} className="mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map(post => {
                const catInfo = getCategoryInfo(post.category);
                return (
                  <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm border hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${catInfo.color}`}>
                        {catInfo.icon} {catInfo.label}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        post.type === 'need' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {post.type === 'need' ? 'Pedido' : 'Oferta'}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">{post.description}</p>
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white text-xs">{post.user?.name?.charAt(0)}</span>
                        </div>
                        <span className="text-xs text-gray-500">{post.user?.name}</span>
                      </div>
                      <Button
                        onClick={() => confirmDelete(post, 'post')}
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-red-600 hover:bg-red-50 border-red-200"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredPosts.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">
                Nenhuma publicação encontrada
              </div>
            )}
          </div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-textPrimary">Divulgações & Anúncios</h2>
                <p className="text-sm text-textSecondary">Gerencie mensagens motivacionais e campanhas de doação</p>
              </div>
              <Button
                onClick={() => {
                  setEditingAd(null);
                  setNewAd({
                    type: 'motivation',
                    title: '',
                    content: '',
                    image_url: '',
                    link_url: '',
                    link_text: '',
                    is_active: true,
                    priority: 5
                  });
                  setShowAdDialog(true);
                }}
                className="rounded-xl bg-primary hover:bg-primary-hover"
              >
                <Plus size={18} className="mr-2" />
                Nova Divulgação
              </Button>
            </div>

            {/* Ads List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {advertisements.map(ad => (
                <div
                  key={ad.id}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${!ad.is_active ? 'opacity-60' : ''}`}
                >
                  {ad.image_url && (
                    <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        ad.type === 'donation' ? 'bg-orange-100 text-orange-700' :
                        ad.type === 'motivation' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {ad.type === 'donation' ? '💰 Doação' :
                         ad.type === 'motivation' ? '💪 Motivação' :
                         '📢 Patrocinado'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${ad.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {ad.is_active ? '✓ Ativo' : '○ Inativo'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-textPrimary mb-1">{ad.title}</h3>
                    <p className="text-xs text-textSecondary line-clamp-2 mb-3">{ad.content}</p>
                    {ad.link_url && (
                      <p className="text-xs text-primary mb-3 truncate">🔗 {ad.link_url}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => editAdvertisement(ad)}
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-lg"
                      >
                        <Edit size={14} className="mr-1" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => toggleAdStatus(ad)}
                        variant="outline"
                        size="sm"
                        className={`rounded-lg ${ad.is_active ? 'text-orange-600' : 'text-green-600'}`}
                      >
                        {ad.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      </Button>
                      <Button
                        onClick={() => deleteAdvertisement(ad.id)}
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-red-600"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {advertisements.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl">
                <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhuma divulgação cadastrada</p>
                <Button
                  onClick={() => setShowAdDialog(true)}
                  className="mt-4 rounded-xl"
                >
                  Criar primeira divulgação
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Housing Tab */}
        {activeTab === 'housing' && (
          <div className="space-y-6">
            {/* Housing Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Home size={24} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {housingListings.filter(l => l.listing_type === 'offer').length}
                    </p>
                    <p className="text-xs text-gray-500">Ofertas de Hospedagem</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Search size={24} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {housingListings.filter(l => l.listing_type === 'need').length}
                    </p>
                    <p className="text-xs text-gray-500">Pedidos de Hospedagem</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <CheckCircle size={24} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {housingListings.filter(l => l.listing_status === 'matched').length}
                    </p>
                    <p className="text-xs text-gray-500">Conexões Realizadas</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <BarChart3 size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {housingListings.length}
                    </p>
                    <p className="text-xs text-gray-500">Total de Anúncios</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all', label: 'Todos', icon: '📋' },
                { id: 'offer', label: 'Ofertas', icon: '🏡' },
                { id: 'need', label: 'Pedidos', icon: '🔍' },
                { id: 'matched', label: 'Conectados', icon: '✅' },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setHousingFilter(filter.id)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    housingFilter === filter.id
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 border hover:bg-gray-50'
                  }`}
                >
                  <span>{filter.icon}</span>
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Housing Listings Table */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-600">Tipo</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-600">Título</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-600">Cidade</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-600">Usuário</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-600">Disponibilidade</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-600">Status</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {housingListings
                      .filter(listing => {
                        if (housingFilter === 'all') return true;
                        if (housingFilter === 'matched') return listing.listing_status === 'matched';
                        return listing.listing_type === housingFilter;
                      })
                      .map(listing => (
                        <tr key={listing.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              listing.listing_type === 'offer'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {listing.listing_type === 'offer' ? '🏡 Oferta' : '🔍 Pedido'}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-gray-800 line-clamp-1">{listing.title}</p>
                            <p className="text-xs text-gray-500">
                              {listing.accommodation_type === 'room' ? '🛏️ Quarto' :
                               listing.accommodation_type === 'house' ? '🏠 Casa' :
                               listing.accommodation_type === 'sofa' ? '🛋️ Sofá' : '👥 Compartilhado'}
                              {listing.duration === 'exchange' && ' · 🤝 Troca'}
                            </p>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-gray-600">📍 {listing.city}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                                <Users size={14} className="text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{listing.user?.name || 'Usuário'}</p>
                                <p className="text-xs text-gray-500">{listing.user?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {listing.available_from ? (
                              <div className="text-xs">
                                <p className="text-gray-600">
                                  📅 {new Date(listing.available_from).toLocaleDateString('pt-BR')}
                                </p>
                                {listing.available_until && (
                                  <p className="text-gray-500">
                                    → {new Date(listing.available_until).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Não definido</span>
                            )}
                          </td>
                          <td className="p-4">
                            <select
                              value={listing.listing_status || 'active'}
                              onChange={(e) => updateHousingStatus(listing.id, e.target.value)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${
                                listing.listing_status === 'matched' ? 'bg-orange-100 text-orange-700' :
                                listing.listing_status === 'closed' ? 'bg-gray-100 text-gray-600' :
                                'bg-green-100 text-green-700'
                              }`}
                            >
                              <option value="active">✓ Ativo</option>
                              <option value="matched">🤝 Conectado</option>
                              <option value="closed">✕ Fechado</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedHousing(listing);
                                  setShowHousingDetailDialog(true);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg text-blue-600"
                                title="Ver detalhes"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => deleteHousingListing(listing.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg text-red-600"
                                title="Remover"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              
              {housingListings.length === 0 && (
                <div className="text-center py-12">
                  <Home size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Nenhum anúncio de hospedagem cadastrado</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Housing Detail Dialog */}
      <Dialog open={showHousingDetailDialog} onOpenChange={setShowHousingDetailDialog}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedHousing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Home size={24} className={selectedHousing.listing_type === 'offer' ? 'text-green-600' : 'text-orange-600'} />
                  {selectedHousing.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedHousing.listing_type === 'offer' ? '🏡 Oferta de Hospedagem' : '🔍 Pedido de Hospedagem'} em {selectedHousing.city}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {/* Info Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl mb-1">
                      {selectedHousing.accommodation_type === 'room' ? '🛏️' :
                       selectedHousing.accommodation_type === 'house' ? '🏠' :
                       selectedHousing.accommodation_type === 'sofa' ? '🛋️' : '👥'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedHousing.accommodation_type === 'room' ? 'Quarto Privado' :
                       selectedHousing.accommodation_type === 'house' ? 'Casa Inteira' :
                       selectedHousing.accommodation_type === 'sofa' ? 'Sofá' : 'Quarto Compartilhado'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl mb-1">👥</p>
                    <p className="text-xs text-gray-600">{selectedHousing.max_guests} hóspede(s)</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl mb-1">
                      {selectedHousing.duration === 'emergency' ? '🆘' :
                       selectedHousing.duration === 'temporary' ? '📅' :
                       selectedHousing.duration === 'long_term' ? '🏡' : '🤝'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedHousing.duration === 'emergency' ? 'Emergência' :
                       selectedHousing.duration === 'temporary' ? 'Temporário' :
                       selectedHousing.duration === 'long_term' ? 'Longo Prazo' : 'Troca de Serviços'}
                    </p>
                  </div>
                </div>

                {/* Availability */}
                {(selectedHousing.available_from || selectedHousing.available_until) && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      📅 Disponibilidade
                    </h4>
                    <div className="flex gap-4">
                      {selectedHousing.available_from && (
                        <div>
                          <p className="text-xs text-gray-500">De</p>
                          <p className="font-medium text-blue-700">
                            {new Date(selectedHousing.available_from).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                      {selectedHousing.available_until && (
                        <div>
                          <p className="text-xs text-gray-500">Até</p>
                          <p className="font-medium text-blue-700">
                            {new Date(selectedHousing.available_until).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Descrição</h4>
                  <p className="text-gray-600 text-sm">{selectedHousing.description || 'Sem descrição'}</p>
                </div>

                {/* Exchange Services */}
                {selectedHousing.exchange_services && (
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      🤝 Serviços em Troca
                    </h4>
                    <p className="text-gray-600 text-sm">{selectedHousing.exchange_services}</p>
                  </div>
                )}

                {/* Amenities */}
                {selectedHousing.amenities && selectedHousing.amenities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Comodidades</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedHousing.amenities.map(amenity => (
                        <span key={amenity} className="px-3 py-1 bg-gray-100 rounded-full text-xs">
                          {amenity === 'wifi' ? '📶 WiFi' :
                           amenity === 'kitchen' ? '🍳 Cozinha' :
                           amenity === 'washing' ? '🧺 Lavadora' :
                           amenity === 'heating' ? '🔥 Aquecimento' :
                           amenity === 'parking' ? '🅿️ Estacionamento' : '♿ Acessível'}
                        </span>
                      ))}
                      {selectedHousing.pets_allowed && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">🐾 Aceita Pets</span>
                      )}
                    </div>
                  </div>
                )}

                {/* User Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-3">Informações do Usuário</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Users size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedHousing.user?.name || 'Usuário'}</p>
                      <p className="text-sm text-gray-500">{selectedHousing.user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => deleteHousingListing(selectedHousing.id)}
                    variant="outline"
                    className="flex-1 rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Remover Anúncio
                  </Button>
                  <Button
                    onClick={() => setShowHousingDetailDialog(false)}
                    className="flex-1 rounded-xl"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={24} className="text-red-600" />
              Adicionar Administrador
            </DialogTitle>
            <DialogDescription>
              Crie um novo usuário com privilégios de administrador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome *</label>
              <Input
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                placeholder="Nome do administrador"
                className="rounded-xl"
                data-testid="admin-name-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email *</label>
              <Input
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                placeholder="email@exemplo.com"
                className="rounded-xl"
                data-testid="admin-email-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Senha * (mínimo 6 caracteres)</label>
              <Input
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                placeholder="Senha do administrador"
                className="rounded-xl"
                data-testid="admin-password-input"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Atenção:</strong> Administradores têm acesso total ao sistema. 
                Use credenciais seguras em ambiente de produção.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-sm text-blue-800">
                <strong>📝 Credenciais padrão:</strong><br/>
                Email: admin@pertodemimservicos.com<br/>
                Senha: admin123
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowAddAdminDialog(false)} 
              className="rounded-xl"
              disabled={addingAdmin}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddAdmin} 
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              disabled={addingAdmin}
              data-testid="confirm-add-admin-btn"
            >
              {addingAdmin ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus size={16} className="mr-2" />
                  Criar Administrador
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ad Create/Edit Dialog */}
      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone size={24} className="text-primary" />
              {editingAd ? 'Editar Divulgação' : 'Nova Divulgação'}
            </DialogTitle>
            <DialogDescription>
              Crie mensagens motivacionais ou campanhas de doação para exibir no feed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <select
                value={newAd.type}
                onChange={(e) => setNewAd({...newAd, type: e.target.value})}
                className="w-full p-2 border rounded-xl"
              >
                <option value="motivation">💪 Mensagem Motivacional</option>
                <option value="donation">💰 Campanha de Doação</option>
                <option value="sponsor">📢 Patrocinado</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Título</label>
              <Input
                value={newAd.title}
                onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                placeholder="Ex: 💪 Você é mais forte do que imagina!"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Conteúdo</label>
              <textarea
                value={newAd.content}
                onChange={(e) => setNewAd({...newAd, content: e.target.value})}
                placeholder="Mensagem de motivação ou descrição da campanha..."
                className="w-full p-3 border rounded-xl min-h-[100px] resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL da Imagem (opcional)</label>
              <Input
                value={newAd.image_url}
                onChange={(e) => setNewAd({...newAd, image_url: e.target.value})}
                placeholder="https://..."
                className="rounded-xl"
              />
            </div>
            {(newAd.type === 'donation' || newAd.type === 'sponsor') && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Link de Destino</label>
                  <Input
                    value={newAd.link_url}
                    onChange={(e) => setNewAd({...newAd, link_url: e.target.value})}
                    placeholder="https://..."
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Texto do Botão</label>
                  <Input
                    value={newAd.link_text}
                    onChange={(e) => setNewAd({...newAd, link_text: e.target.value})}
                    placeholder="Ex: Doar Agora"
                    className="rounded-xl"
                  />
                </div>
              </>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newAd.is_active}
                  onChange={(e) => setNewAd({...newAd, is_active: e.target.checked})}
                  className="w-4 h-4"
                />
                <label className="text-sm">Ativo</label>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Prioridade (1-20)</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={newAd.priority}
                  onChange={(e) => setNewAd({...newAd, priority: parseInt(e.target.value) || 5})}
                  className="rounded-xl w-24"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="outline" onClick={() => setShowAdDialog(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={saveAdvertisement} className="rounded-xl bg-primary hover:bg-primary-hover">
              {editingAd ? 'Salvar Alterações' : 'Criar Divulgação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={24} />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              {deleteType === 'user'
                ? `Tem certeza que deseja excluir o usuário "${itemToDelete?.name}"? Esta ação também excluirá todos os posts e mensagens deste usuário.`
                : `Tem certeza que deseja excluir a publicação "${itemToDelete?.title}"?`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
              <Trash2 size={16} className="mr-2" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
