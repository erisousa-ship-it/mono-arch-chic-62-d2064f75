import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import CodeEditor from '../components/CodeEditor';
import Preview from '../components/Preview';
import axios from 'axios';
import { toast } from '../hooks/use-toast';

const BACKEND_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

const Editor = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [projectName, setProjectName] = useState('Carregando...');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}`);
      const project = response.data;
      console.log('Projeto carregado:', project);
      console.log('HTML length:', project.html?.length);
      console.log('CSS length:', project.css?.length);
      console.log('JS length:', project.js?.length);
      setProjectName(project.name);
      setHtml(project.html);
      setCss(project.css);
      setJs(project.js);
    } catch (error) {
      console.error('Erro ao carregar projeto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o projeto.',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await axios.put(`${API}/projects/${projectId}`, {
        name: projectName,
        html,
        css,
        js,
      });

      toast({
        title: 'Projeto salvo!',
        description: `"${projectName}" foi salvo com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar o projeto.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName || 'Meu Site'}</title>
  <style>
${css}
  </style>
</head>
<body>
${html}
  <script>
${js}
  </script>
</body>
</html>`;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'site'}.html`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Site exportado!',
      description: 'O arquivo HTML foi baixado com sucesso.',
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-white hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-xl font-semibold text-white bg-transparent border-none outline-none focus:ring-0 px-2"
            placeholder="Nome do Projeto"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
          >
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </header>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-slate-700">
          <CodeEditor
            html={html}
            css={css}
            js={js}
            onHtmlChange={setHtml}
            onCssChange={setCss}
            onJsChange={setJs}
          />
        </div>
        <div className="w-1/2">
          <Preview
            html={html}
            css={css}
            js={js}
            projectName={projectName}
          />
        </div>
      </div>
    </div>
  );
};

export default Editor;