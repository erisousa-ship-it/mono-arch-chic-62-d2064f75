import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../ClonedAuthContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import BottomNav from '../components/BottomNav';
import { Send, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function AIChat() {
  const { token } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || ""}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: input,
          language: i18n.language 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
      } else {
        toast.error('Erro ao enviar mensagem');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background" data-testid="ai-chat-page">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 glassmorphism">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-textPrimary">Assistente PertoDeMimServicos</h1>
              <p className="text-sm text-textMuted">Pergunte sobre serviços em Paris</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4" data-testid="empty-chat-message">
              <div className="flex justify-center">
                <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full">
                  <Bot size={48} className="text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-heading font-bold text-textPrimary">
                Olá! Como posso ajudar?
              </h3>
              <p className="text-textSecondary max-w-md mx-auto">
                Pergunte sobre alimentação, moradia, trabalho, saúde, serviços jurídicos e mais em Paris.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div 
              key={idx}
              data-testid={`chat-message-${msg.role}`}
              className={`flex gap-3 animate-fade-in ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={18} className="text-white" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 ${
                msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
              }`}>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={18} className="text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white p-4 pb-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Textarea
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('askQuestion')}
            rows={1}
            className="rounded-2xl resize-none"
          />
          <Button
            data-testid="send-button"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-full w-12 h-12 p-0 bg-primary hover:bg-primary-hover flex-shrink-0"
          >
            <Send size={20} />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
