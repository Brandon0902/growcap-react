import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  RotateCcw, 
  Sparkles, 
  ChevronRight,
  GripVertical
} from 'lucide-react';
import { assistantService } from '../../services/assistantService.js';
import useAuth from '../../features/auth/hooks/useAuth.js';
import { getUserFirstName } from '../../utils/userFormatting.js';
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
  const fabRef = useRef(null);

  // Globito de bienvenida interactivo al entrar
  const { user } = useAuth();
  const [showGreetingBubble, setShowGreetingBubble] = useState(false);
  const [bubbleExiting, setBubbleExiting] = useState(false);

  useEffect(() => {
    // Limpiar cualquier flag heredado para asegurar que siempre se presente al entrar a la app
    try {
      sessionStorage.removeItem('growcap_assistant_bubble_shown');
    } catch {
      // ignore
    }

    let exitTimer = null;
    let hideTimer = null;

    // Aparece con una vibración sutil a los 2 segundos de entrar a la app
    const showTimer = setTimeout(() => {
      setShowGreetingBubble(true);

      // Permanece visible 6.5 segundos para que no estorbe y desaparece suavemente
      exitTimer = setTimeout(() => {
        setBubbleExiting(true);
        hideTimer = setTimeout(() => {
          setShowGreetingBubble(false);
          setBubbleExiting(false);
        }, 400);
      }, 6500);
    }, 2000);

    return () => {
      clearTimeout(showTimer);
      if (exitTimer) clearTimeout(exitTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const dismissBubble = () => {
    setShowGreetingBubble(false);
    setBubbleExiting(false);
  };

  // Posición flotante arrastrable (persistente en localStorage)
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('growcap_assistant_fab_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // Ignorar fallo de storage
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    active: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    width: 145,
    height: 46,
  });

  const clampPosition = (x, y, elWidth = 145, elHeight = 46) => {
    const pad = 12;
    const maxX = Math.max(pad, window.innerWidth - elWidth - pad);
    const maxY = Math.max(pad, window.innerHeight - elHeight - pad);
    return {
      x: Math.min(Math.max(pad, x), maxX),
      y: Math.min(Math.max(pad, y), maxY),
    };
  };

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const rect = fabRef.current?.getBoundingClientRect();
        const w = rect?.width || 145;
        const h = rect?.height || 46;
        return clampPosition(prev.x, prev.y, w, h);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = fabRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      active: true,
      hasMoved: false,
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top,
      width: rect.width,
      height: rect.height,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.active) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 5) {
      dragRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragRef.current.hasMoved) {
      const nextX = dragRef.current.initX + dx;
      const nextY = dragRef.current.initY + dy;
      const clamped = clampPosition(nextX, nextY, dragRef.current.width, dragRef.current.height);
      setPosition(clamped);
    }
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current.active) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const moved = dragRef.current.hasMoved;
    dragRef.current.active = false;
    setIsDragging(false);

    if (moved) {
      setPosition((curr) => {
        if (curr) {
          try {
            localStorage.setItem('growcap_assistant_fab_pos', JSON.stringify(curr));
          } catch {
            // ignore
          }
        }
        return curr;
      });
    } else {
      setIsOpen(true);
    }
  };

  // Posición dinámica e inteligente de la ventana de chat respecto al botón
  const getWindowStyle = () => {
    if (!position || typeof window === 'undefined' || window.innerWidth <= 768) {
      return undefined;
    }

    const isLeft = position.x < window.innerWidth / 2;
    const isTop = position.y < window.innerHeight / 2;

    const style = {};
    if (isLeft) {
      style.left = `${Math.max(16, Math.min(position.x, window.innerWidth - 440))}px`;
      style.right = 'auto';
    } else {
      style.right = `${Math.max(16, window.innerWidth - position.x - 160)}px`;
      style.left = 'auto';
    }

    if (isTop) {
      style.top = `${Math.max(16, Math.min(position.y + 54, window.innerHeight - 620))}px`;
      style.bottom = 'auto';
    } else {
      style.bottom = `${Math.max(20, window.innerHeight - position.y + 12)}px`;
      style.top = 'auto';
    }

    return style;
  };

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

  const firstName = getUserFirstName(user);
  const greetingHeading = firstName ? `¡Hola ${firstName}!` : '¡Hola!';
  const isTopPosition = position ? position.y < (typeof window !== 'undefined' ? window.innerHeight / 2 : 500) : false;
  const isLeftPosition = position ? position.x < (typeof window !== 'undefined' ? window.innerWidth / 2 : 500) : false;

  return (
    <>
      {/* Botón Flotante (FAB) Arrastrable con Globito de Bienvenida */}
      {!isOpen && (
        <div
          className="growcap-assistant-fab-container"
          style={
            position
              ? {
                  position: 'fixed',
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  bottom: 'auto',
                  right: 'auto',
                }
              : undefined
          }
        >
          {/* Globito de bienvenida con vibración sutil */}
          {showGreetingBubble && !isDragging && (
            <div
              className={`assistant-speech-bubble ${bubbleExiting ? 'is-exiting' : ''} ${isTopPosition ? 'bubble-bottom' : 'bubble-top'} ${isLeftPosition ? 'bubble-align-left' : 'bubble-align-right'}`}
              onClick={() => {
                dismissBubble();
                setIsOpen(true);
              }}
              role="status"
              aria-live="polite"
              title="Haz clic para abrir el asistente virtual"
            >
              <div className="assistant-bubble-content">
                <div className="assistant-bubble-bot-badge" aria-hidden="true">
                  <Bot size={15} />
                </div>
                <div className="assistant-bubble-body">
                  <span className="assistant-bubble-text">
                    <strong className="assistant-bubble-name">{greetingHeading}</strong> Soy tu asistente virtual y estoy para ayudarte.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissBubble();
                  }}
                  className="assistant-bubble-close"
                  aria-label="Cerrar saludo"
                  title="Cerrar saludo"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="assistant-bubble-arrow" />
            </div>
          )}

          <button
            ref={fabRef}
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`growcap-assistant-fab ${isDragging ? 'is-dragging' : ''}`}
            style={{ touchAction: 'none' }}
            aria-label="Abrir Asistente Virtual GrowCap"
            title="Arrastra para mover por la pantalla o haz clic para abrir"
          >
            <GripVertical size={13} className="assistant-fab-grip" aria-hidden="true" />
            <div className="assistant-fab-icon-wrap">
              <Bot size={20} className="assistant-fab-icon" />
              <span className="assistant-fab-pulse" />
            </div>
            <span className="assistant-fab-label">Asistente</span>
          </button>
        </div>
      )}

      {/* Ventana de Chat Flotante */}
      {isOpen && (
        <div 
          className="growcap-assistant-window"
          style={getWindowStyle()}
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

                  {/* Sugerencias interactivas consecutivas debajo de la última respuesta del modelo */}
                  {!isUser && index === messages.length - 1 && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="assistant-suggestions-wrap">
                      <span className="assistant-suggestions-title">Preguntas sugeridas siguientes:</span>
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
