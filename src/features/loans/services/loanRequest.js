import { toFormData } from '../../../api/apiUtils.js';

function containsFile(payload) {
  return Object.values(payload).some((value) => value instanceof Blob);
}

export function buildLoanRequest(payload) {
  const normalized = {
    ...payload,
    id_activo: Number(payload.id_activo),
    cantidad: Number(payload.cantidad),
  };

  if (typeof normalized.codigo_aval === 'string') {
    normalized.codigo_aval = normalized.codigo_aval.trim();
  }

  if (!containsFile(normalized)) {
    return { data: normalized, config: {} };
  }

  return {
    data: toFormData(normalized),
    config: { headers: { 'Content-Type': 'multipart/form-data' } },
  };
}
