import React from 'react';
import { Code2, Plus } from 'lucide-react';
import { Button } from './ui/button';

const Navbar = ({ onNewProject, onSave, isSaving }) => {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Code2 className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Site Builder</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onNewProject}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Salvando...' : 'Salvar Projeto'}
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;