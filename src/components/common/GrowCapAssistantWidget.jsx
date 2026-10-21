import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  RotateCcw, 
  Sparkles, 
  ChevronRight 
} from 'lucide-react';
import { assistantService } from '../../services/assistantService.js';
import './GrowCapAssistantWidget.css';

const INITIAL_SUGGESTIONS = [
  '¿Cuáles son los requisitos para un préstamo?',
  '¿Cómo funciona el aval solidario y la Auto-Garantía?',
  '¿Cómo solicito un retiro de mi Saldo Disponible?',
  '¿Cómo y cuándo se descuentan las cuotas por nómina?'
];

const INITIAL_MESSAGE = {
  role: 'model',
  text: '¡Hola! 👋 Soy el Asistente Virtual Oficial de GrowCap.\n\nPuedo resolver tus dudas sobre préstamos, avales, retiros, fechas de nómina, finiquitos, ahorros e inversiones. ¿En qué te puedo apoyar hoy?',
  suggestions: INITIAL_SUGGESTIONS
};

/**
 * Renderiza texto con negritas y viñetas de forma ligera.
 */
function FormattedMessageText({ text, isUser = false }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="assistant-formatted-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: '4px' }} />;

        // Viñetas (* o -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="assistant-bullet-row">
              <span className="assistant-bullet-dot">•</span>
              <div>{renderBoldSpans(trimmed.slice(2), isUser)}</div>
            </div>
          );
        }

        return <p key={idx}>{renderBoldSpans(line, isUser)}</p>;
      })}
    </div>
  );
}

function renderBoldSpans(str, isUser = false) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: isUser ? '#FFFFFF' : '#0F172A' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function GrowCapAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('growcap_assistant_chat');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorar fallo de storage
    }
    return [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Escuchar evento personalizado para abrir desde el Sidebar
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('growcap:open-assistant', handleOpen);
    return () => window.removeEventListener('growcap:open-assistant', handleOpen);
  }, []);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Guardar en sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('growcap_assistant_chat', JSON.stringify(messages));
    } catch {
      // Ignorar fallo de storage
    }
  }, [messages]);

  // Auto-scroll al final del chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage = { role: 'user', text: query };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history = updatedMessages
        .filter((m) => m !== INITIAL_MESSAGE)
        .map((m) => ({
          role: m.role === 'model' ? 'model' : 'user',
          text: m.text,
        }));

      const result = await assistantService.sendMessage({
        message: query,
        history: history.slice(0, -1),
      });

      const botMessage = {
        role: 'model',
        text: result?.reply || 'No pude obtener una respuesta en este momento.',
        suggestions: result?.suggestions || [],
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Error al consultar asistente:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'No pudimos conectar con el servidor en este momento. Por favor verifica tu conexión o intenta más tarde.',
          suggestions: INITIAL_SUGGESTIONS,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    sessionStorage.removeItem('growcap_assistant_chat');
  };

  return (
    <>
      {/* Botón Flotante (FAB) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="growcap-assistant-fab"
          aria-label="Abrir Asistente Virtual GrowCap"
        >
          <div className="assistant-fab-icon-wrap">
            <Bot size={22} className="assistant-fab-icon" />
            <span className="assistant-fab-pulse" />
          </div>
          <span className="assistant-fab-label">Asistente GrowCap</span>
        </button>
      )}

      {/* Ventana de Chat Flotante */}
      {isOpen && (
        <div 
          className="growcap-assistant-window"
          role="dialog"
          aria-label="Ventana de chat con Asistente GrowCap"
        >
          {/* Header */}
          <div className="assistant-header">
            <div className="assistant-header-profile">
              <div className="assistant-avatar">
                <Bot size={20} />
              </div>
              <div className="assistant-header-info">
                <h3>Asistente GrowCap</h3>
                <div className="assistant-status">
                  <span className="assistant-status-dot" />
                  <span>IA Oficial · En línea</span>
                </div>
              </div>
            </div>

            <div className="assistant-header-actions">
              <button
                type="button"
                onClick={handleReset}
                title="Reiniciar conversación"
                className="assistant-action-btn"
                aria-label="Reiniciar conversación"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Cerrar chat"
                className="assistant-action-btn"
                aria-label="Cerrar chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="assistant-messages">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div key={index} className={`assistant-message-row ${isUser ? 'user' : 'model'}`}>
                  <div className={`assistant-bubble ${isUser ? 'user' : 'model'}`}>
                    <FormattedMessageText text={msg.text} isUser={isUser} />
                  </div>

                  {/* Sugerencias interactivas debajo de la respuesta del modelo */}
                  {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="assistant-suggestions-wrap">
                      <span className="assistant-suggestions-title">Preguntas sugeridas:</span>
                      <div className="assistant-suggestions-list">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSend(sug)}
                            disabled={isLoading}
                            className="assistant-suggestion-chip"
                          >
                            <span>{sug}</span>
                            <ChevronRight size={12} style={{ opacity: 0.6 }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Indicador de escritura */}
            {isLoading && (
              <div className="assistant-typing-indicator">
                <Sparkles size={14} style={{ color: '#7E22CE' }} />
                <span>GrowCap IA está escribiendo</span>
                <div className="assistant-typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de Entrada */}
          <div className="assistant-input-box">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="assistant-form"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu duda sobre préstamos, retiros..."
                disabled={isLoading}
                className="assistant-input"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="assistant-send-btn"
                aria-label="Enviar mensaje"
              >
                <Send size={16} />
              </button>
            </form>
            <p className="assistant-footer-caption">
              Respuestas oficiales de GrowCap generadas con Inteligencia Artificial.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
