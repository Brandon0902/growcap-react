import axiosClient from '../api/axiosClient.js';
import { ENDPOINTS } from '../api/endpoints.js';

/**
 * Servicio para comunicación con el Asistente Virtual GrowCap impulsado por IA.
 */
export const assistantService = {
  /**
   * Envía un mensaje del usuario junto con el historial de conversación.
   * @param {Object} params
   * @param {string} params.message Mensaje del usuario
   * @param {Array<{role: string, text: string}>} [params.history=[]] Historial
   * @returns {Promise<{reply: string, suggestions: string[]}>}
   */
  async sendMessage({ message, history = [] }) {
    const response = await axiosClient.post(ENDPOINTS.assistant.chat, {
      message,
      history,
    });
    return response.data?.data || response.data;
  },

  /**
   * Verifica el estado y disponibilidad del motor del asistente.
   */
  async checkHealth() {
    try {
      const response = await axiosClient.get(ENDPOINTS.assistant.health);
      return response.data;
    } catch {
      return { ok: false, isConfigured: false };
    }
  },

  /**
   * Obtiene un consejo financiero motivador generado por IA para el saludo del Dashboard.
   * Emplea caché de sesión para agilizar la navegación instantánea.
   * @param {boolean} [forceRefresh=false]
   * @returns {Promise<string>}
   */
  async getFinancialTip(forceRefresh = false) {
    const CACHE_KEY = 'growcap_financial_tip';
    const CACHE_TIME_KEY = 'growcap_financial_tip_time';
    const TTL_MS = 20 * 60 * 1000; // 20 minutos

    if (!forceRefresh) {
      try {
        const cachedTip = sessionStorage.getItem(CACHE_KEY);
        const cachedTime = Number(sessionStorage.getItem(CACHE_TIME_KEY) || 0);
        if (cachedTip && Date.now() - cachedTime < TTL_MS) {
          return cachedTip;
        }
      } catch {
        // Ignorar fallo de storage
      }
    }

    try {
      const response = await axiosClient.get(ENDPOINTS.assistant.financialTip);
      const tip = response.data?.data?.tip;
      if (tip) {
        try {
          sessionStorage.setItem(CACHE_KEY, tip);
          sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
        } catch {
          // Ignorar fallo de storage
        }
        return tip;
      }
    } catch (err) {
      console.warn('No se pudo cargar el consejo financiero IA:', err?.message);
    }

    return 'Monitorea el crecimiento de tu capital y haz crecer tu patrimonio día a día.';
  },

  /**
   * Obtiene la lista completa de consejos financieros personalizados y formativos para el carrusel.
   * @param {boolean} [forceRefresh=false]
   * @returns {Promise<string[]>}
   */
  async getFinancialTips(forceRefresh = false) {
    const CACHE_KEY = 'growcap_financial_tips_list';
    const CACHE_TIME_KEY = 'growcap_financial_tips_time';
    const TTL_MS = 20 * 60 * 1000;

    const DEFAULT_FALLBACK_TIPS = [
      'Pon tu dinero a trabajar en planes de ahorro con rendimientos diarios garantizados.',
      'Ahorra en piloto automático: programa tus aportaciones antes de gastos no planeados.',
      'Un abono extraordinario a capital reduce intereses y te acerca más rápido a tus metas.',
      'Aprovecha tu liquidez en caja para generar rendimientos seguros por encima de la inflación.'
    ];

    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        const cachedTime = Number(sessionStorage.getItem(CACHE_TIME_KEY) || 0);
        if (cached && Date.now() - cachedTime < TTL_MS) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
        }
      } catch {
        // Ignorar fallo de storage
      }
    }

    try {
      const response = await axiosClient.get(ENDPOINTS.assistant.financialTip);
      const data = response.data?.data;
      const rawTips = data?.tips || (data?.tip ? [data.tip] : []);
      let tips = Array.isArray(rawTips) ? [...rawTips] : [];

      if (tips.length < DEFAULT_FALLBACK_TIPS.length) {
        DEFAULT_FALLBACK_TIPS.forEach((ft) => {
          if (!tips.includes(ft)) tips.push(ft);
        });
      }

      if (tips.length > 0) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(tips));
          sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
        } catch {
          // Ignorar fallo
        }
        return tips;
      }
    } catch (err) {
      console.warn('No se pudieron cargar los consejos financieros IA:', err?.message);
    }

    return DEFAULT_FALLBACK_TIPS;
  },
};

export default assistantService;
