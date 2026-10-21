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
};

export default assistantService;
