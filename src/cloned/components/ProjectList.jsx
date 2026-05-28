import React from 'react';
import { Folder, Trash2, Clock } from 'lucide-react';
import { Button } from './ui/button';

const ProjectList = ({ projects, onSelectProject, onDeleteProject }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Folder className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg">Nenhum projeto salvo ainda</p>
        <p className="text-sm mt-2">Comece criando seu primeiro site!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {projects.map((project) => (
        <div
          key={project.id}
          className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow cursor-pointer group"
          onClick={() => onSelectProject(project)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 truncate">
                {project.name}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProject(project.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Clock className="w-4 h-4" />
            {formatDate(project.updatedAt)}
          </div>
          <div className="text-xs text-gray-400">
            HTML: {project.html.length} chars • CSS: {project.css.length} chars • JS: {project.js.length} chars
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectList;