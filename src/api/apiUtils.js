export function extractCollection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  const collectionKeys = ['planes', 'prestamos', 'inversiones', 'ahorros', 'items', 'results'];
  const key = collectionKeys.find((name) => Array.isArray(payload?.[name]) || Array.isArray(payload?.data?.[name]));

  if (key) {
    return payload?.[key] || payload?.data?.[key];
  }

  return [];
}

export function extractMeta(payload) {
  return payload?.meta || payload?.data?.meta || null;
}

export function normalizeApiError(error, fallbackMessage = 'No fue posible completar la operacion.') {
  const response = error?.response;
  const data = response?.data;
  const errors = data?.errors || {};
  const firstError = Object.values(errors).flat().find(Boolean);

  if (response?.status === 401) {
    return {
      fieldErrors: {},
      message: data?.message || 'Tu sesion expiro o no esta autorizada. Inicia sesion nuevamente.',
      status: 401,
    };
  }

  if (response?.status === 403) {
    return {
      fieldErrors: {},
      message: data?.message || 'No tienes permisos para realizar esta accion.',
      status: 403,
    };
  }

  if (response?.status === 422) {
    return {
      fieldErrors: errors,
      message: firstError || data?.message || 'Revisa los datos capturados.',
      status: 422,
    };
  }

  if (response?.status >= 500) {
    return {
      fieldErrors: {},
      message: data?.message || 'El servidor no pudo procesar la solicitud. Intenta mas tarde.',
      status: response.status,
    };
  }

  return {
    fieldErrors: errors,
    message: firstError || data?.message || data?.error || error?.message || fallbackMessage,
    status: response?.status,
  };
}

export function firstFieldError(fieldErrors, field) {
  const error = fieldErrors?.[field];
  return Array.isArray(error) ? error[0] : error;
}

export function toFormData(payload) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    formData.append(key, value);
  });

  return formData;
}

export function extractCheckoutUrl(response) {
  return (
    response?.checkout_url
    || response?.url
    || response?.data?.checkout_url
    || response?.data?.url
    || response?.data?.data?.checkout_url
    || response?.data?.data?.url
  );
}

export function extractResourceId(response, fields = ['id', 'id_inversion', 'inversion_id', 'id_ahorro', 'ahorro_id']) {
  const sources = [
    response,
    response?.data,
    response?.data?.data,
    response?.raw,
    response?.raw?.data,
  ];

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    const field = fields.find((key) => source[key] !== undefined && source[key] !== null && source[key] !== '');

    if (field) {
      return source[field];
    }
  }

  return null;
}
