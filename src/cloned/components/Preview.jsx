import React, { useEffect, useRef, useState } from 'react';
import { Eye, Download } from 'lucide-react';
import { Button } from './ui/button';

const Preview = ({ html, css, js, projectName }) => {
  const iframeRef = useRef(null);
  const [srcDoc, setSrcDoc] = useState('');

  useEffect(() => {
    // Gerar o conteúdo completo do iframe
    const content = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${css || ''}</style>
  </head>
  <body>
    ${html || ''}
    <script>
      try {
        ${js || ''}
      } catch (error) {
        console.error('JavaScript Error:', error);
      }
    </script>
  </body>
</html>`;

    setSrcDoc(content);
  }, [html, css, js]);

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
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2 text-gray-300 font-medium">
          <Eye className="w-5 h-5" />
          Preview
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          ref={iframeRef}
          title="preview"
          srcDoc={srcDoc}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-modals allow-same-origin"
        />
      </div>
    </div>
  );
};

export default Preview;