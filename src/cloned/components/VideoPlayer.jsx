import React, { useRef, useState } from 'react';
import { Film, X } from 'lucide-react';

/**
 * Robust video player for base64 data URLs.
 * - Forces metadata preload
 * - Plays inline on iOS
 * - Detects MIME from data URL and uses explicit <source> for better codec negotiation
 * - Shows fallback message if format not supported
 */
export default function VideoPlayer({ src, className = '', testid }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);

  // Extract mime type from data URL (e.g., data:video/mp4;base64,...)
  let mimeType = 'video/mp4';
  if (typeof src === 'string' && src.startsWith('data:')) {
    const match = src.match(/^data:([^;]+);/);
    if (match) mimeType = match[1];
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 rounded-md p-6 ${className}`} data-testid={`${testid}-error`}>
        <Film className="w-10 h-10 text-gray-400 mb-2" />
        <p className="text-xs text-gray-600 text-center">
          Vídeo em formato não suportado pelo navegador.
          <br />
          <span className="text-gray-400">(Tente reenviar como MP4)</span>
        </p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      data-testid={testid}
      className={`w-full max-h-[400px] rounded-md border border-gray-200 bg-black ${className}`}
      controls
      playsInline
      preload="metadata"
      onError={() => setError(true)}
    >
      <source src={src} type={mimeType} />
      {/* Fallback to mp4 if mime is missing */}
      {mimeType !== 'video/mp4' && <source src={src} type="video/mp4" />}
      Seu navegador não suporta a tag video.
    </video>
  );
}
