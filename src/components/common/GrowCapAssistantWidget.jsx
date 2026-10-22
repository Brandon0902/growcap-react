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
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const currentPosRef = useRef(null);

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

  // Cálculo de límites de pantalla y posición por defecto adaptada a móvil y desktop
  const getBounds = (elWidth = 145, elHeight = 46) => {
    if (typeof window === 'undefined') {
      return { minX: 12, maxX: 300, minY: 64, maxY: 600, isMobile: false, defaultPos: { x: 200, y: 500 } };
    }
    const isMobile = window.innerWidth <= 768;
    const pad = isMobile ? 14 : 24;
    const minX = isMobile ? 14 : 16;
    const maxX = Math.max(minX, window.innerWidth - elWidth - minX);
    const minY = isMobile ? 64 : 16;
    // En móvil se deja margen de seguridad sobre la barra inferior (mobile-nav ~76px)
    const maxY = Math.max(minY, window.innerHeight - elHeight - (isMobile ? 86 : 24));

    const defaultPos = {
      x: window.innerWidth - elWidth - pad,
      y: isMobile ? window.innerHeight - elHeight - 88 : window.innerHeight - elHeight - pad,
    };

    return { minX, maxX, minY, maxY, isMobile, defaultPos };
  };

  useEffect(() => {
    const ensureValidPosition = () => {
      const w = fabRef.current?.offsetWidth || 145;
      const h = fabRef.current?.offsetHeight || 46;
      const { minX, maxX, minY, maxY, isMobile, defaultPos } = getBounds(w, h);

      setPosition((prev) => {
        if (!prev) return defaultPos;
        let x = Math.min(Math.max(minX, prev.x), maxX);
        let y = Math.min(Math.max(minY, prev.y), maxY);

        // En móvil mantener siempre anclado magnéticamente a uno de los laterales
        if (isMobile) {
          x = (x + w / 2 < window.innerWidth / 2) ? minX : maxX;
        }

        return { x: Math.round(x), y: Math.round(y) };
      });
    };

    ensureValidPosition();
    window.addEventListener('resize', ensureValidPosition);
    return () => window.removeEventListener('resize', ensureValidPosition);
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const w = fabRef.current?.offsetWidth || 145;
    const h = fabRef.current?.offsetHeight || 46;
    const containerRect = containerRef.current?.getBoundingClientRect();

    const initX = containerRect ? containerRect.left : (position?.x ?? 0);
    const initY = containerRect ? containerRect.top : (position?.y ?? 0);

    dragRef.current = {
      active: true,
      hasMoved: false,
      startX: e.clientX,
      startY: e.clientY,
      initX,
      initY,
      width: w,
      height: h,
    };
    currentPosRef.current = { x: initX, y: initY };

    if (containerRef.current) {
      containerRef.current.style.transition = 'none';
      containerRef.current.style.willChange = 'transform';
    }

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

    if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 6) {
      dragRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragRef.current.hasMoved) {
      const { minX, maxX, minY, maxY } = getBounds(dragRef.current.width, dragRef.current.height);
      const nextX = Math.min(Math.max(minX, dragRef.current.initX + dx), maxX);
      const nextY = Math.min(Math.max(minY, dragRef.current.initY + dy), maxY);

      currentPosRef.current = { x: nextX, y: nextY };

      // Renderizado directo GPU a 120Hz sin provocar re-renders de React
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
        }
      });
    }
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current.active) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const moved = dragRef.current.hasMoved;
    dragRef.current.active = false;
    setIsDragging(false);

    if (moved) {
      const w = dragRef.current.width || 145;
      const h = dragRef.current.height || 46;
      const { minX, maxX, minY, maxY, isMobile } = getBounds(w, h);

      let finalX = currentPosRef.current?.x ?? dragRef.current.initX;
      let finalY = currentPosRef.current?.y ?? dragRef.current.initY;

      // Anclaje magnético (Magnetic Edge Docking): en móvil se adhiere suavemente a la orilla
      if (isMobile) {
        const centerX = finalX + w / 2;
        finalX = centerX < window.innerWidth / 2 ? minX : maxX;
      } else {
        if (finalX < minX + 24) finalX = minX;
        else if (finalX > maxX - 24) finalX = maxX;
      }
      finalY = Math.min(Math.max(minY, finalY), maxY);

      // Deslizamiento elástico físico y natural
      if (containerRef.current) {
        containerRef.current.style.transition = 'transform 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.15)';
        containerRef.current.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;
      }

      const finalPos = { x: Math.round(finalX), y: Math.round(finalY) };
      setPosition(finalPos);
      try {
        localStorage.setItem('growcap_assistant_fab_pos', JSON.stringify(finalPos));
      } catch {
        // ignore
      }
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
          ref={containerRef}
          className={`growcap-assistant-fab-container ${isDragging ? 'is-dragging-container' : ''}`}
          style={{
            transform: position
              ? `translate3d(${position.x}px, ${position.y}px, 0)`
              : 'translate3d(0, 0, 0)',
            opacity: position ? 1 : 0,
            pointerEvents: position ? 'auto' : 'none',
          }}
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
