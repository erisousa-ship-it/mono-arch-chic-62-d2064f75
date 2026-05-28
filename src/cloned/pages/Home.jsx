import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Sparkles, Zap, Eye, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import axios from 'axios';
import { toast } from '../hooks/use-toast';

const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, descreva o site que você quer criar.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await axios.post(`${API}/generate`, {
        description: description,
        sessionId: Date.now().toString(),
      }, {
        timeout: 60000, // 60 seconds timeout
      });

      const { name, html, css, js } = response.data;

      // Save the generated project
      const saveResponse = await axios.post(`${API}/projects`, {
        name,
        description,
        html,
        css,
        js,
      });

      toast({
        title: 'Site gerado com sucesso!',
        description: `"${name}" foi criado e salvo.`,
      });

      // Navigate to editor with the new project
      navigate(`/editor/${saveResponse.data.id}`);
    } catch (error) {
      console.error('Erro ao gerar site:', error);
      toast({
        title: 'Erro ao gerar site',
        description: error.response?.data?.detail || 'Ocorreu um erro ao gerar o site. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/editor/${projectId}`);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-orange-500 p-2.5 rounded-xl">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Site Builder AI
              </h1>
              <p className="text-sm text-orange-300">Crie sites com inteligência artificial</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            100% Gratuito com IA
          </div>
          <h2 className="text-6xl font-bold text-white mb-6">
            Descreva seu site,
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-orange-400 bg-clip-text text-transparent">
              a IA cria para você
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Basta escrever o que você quer e nossa IA gera automaticamente
            o código HTML, CSS e JavaScript completo.
          </p>
        </div>

        {/* Generator Card */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 mb-12 shadow-2xl">
          <div className="mb-4">
            <label className="text-white font-semibold text-lg mb-2 block">
              Descreva o site que você quer criar
            </label>
            <p className="text-gray-400 text-sm mb-4">
              Exemplo: "landing page de cafeteria" ou "portfólio minimalista"
              <br />
              <span className="text-yellow-400 text-xs">⚡ Nota: A geração pode levar 15-30 segundos devido à API da OpenAI</span>
            </p>
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Digite sua descrição aqui..."
            className="min-h-[150px] bg-white/10 border-white/20 text-white placeholder:text-gray-500 text-lg mb-4 resize-none focus:ring-2 focus:ring-orange-500"
            disabled={isGenerating}
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-600 hover:from-orange-700 hover:to-orange-700 text-white text-lg py-6 font-semibold"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Gerando... (10-15s)
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Gerar Site com IA
              </>
            )}
          </Button>
        </Card>

        {/* Projects Section */}
        {projects.length > 0 && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-white mb-6">Seus Projetos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 hover:bg-white/10 transition-all cursor-pointer group"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold group-hover:text-orange-400 transition-colors">
                          {project.name}
                        </h4>
                        <p className="text-gray-400 text-xs">
                          {formatDate(project.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>HTML</span>
                    <span>•</span>
                    <span>CSS</span>
                    <span>•</span>
                    <span>JS</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-orange-400" />
            </div>
            <h4 className="text-white font-semibold text-lg mb-2">
              IA Poderosa
            </h4>
            <p className="text-gray-400">
              GPT-5.1 da OpenAI gera código profissional e moderno
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Code2 className="w-8 h-8 text-orange-400" />
            </div>
            <h4 className="text-white font-semibold text-lg mb-2">
              Edite o Código
            </h4>
            <p className="text-gray-400">
              Customize o HTML, CSS e JavaScript como quiser
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-blue-400" />
            </div>
            <h4 className="text-white font-semibold text-lg mb-2">
              Exporte Fácil
            </h4>
            <p className="text-gray-400">
              Baixe seu site pronto para usar em qualquer lugar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;