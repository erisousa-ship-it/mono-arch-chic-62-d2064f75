import React from 'react';
import { FileCode, Palette, Braces } from 'lucide-react';

const CodeEditor = ({ html, css, js, onHtmlChange, onCssChange, onJsChange }) => {
  const [activeTab, setActiveTab] = React.useState('html');

  const tabs = [
    { id: 'html', label: 'HTML', icon: FileCode, value: html, onChange: onHtmlChange },
    { id: 'css', label: 'CSS', icon: Palette, value: css, onChange: onCssChange },
    { id: 'js', label: 'JavaScript', icon: Braces, value: js, onChange: onJsChange },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex border-b border-slate-700 bg-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-orange-400 border-b-2 border-orange-500 bg-slate-700'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 p-4">
        <textarea
          value={activeTabData.value}
          onChange={(e) => activeTabData.onChange(e.target.value)}
          className="w-full h-full p-4 font-mono text-sm bg-slate-800 border border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-100"
          placeholder={`Digite seu código ${activeTabData.label} aqui...`}
          spellCheck="false"
        />
      </div>
    </div>
  );
};

export default CodeEditor;