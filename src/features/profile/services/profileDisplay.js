export function unwrapProfileData(payload) {
  return payload?.data?.data || payload?.data || payload || {};
}

export function getValue(source, fields, fallback = 'No registrado') {
  const field = fields.find((key) => source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '');

  return field ? source[field] : fallback;
}

export function getNestedValue(sources, fields, fallback = 'No registrado') {
  for (const source of sources) {
    const value = getValue(source, fields, null);

    if (value !== null) {
      return value;
    }
  }

  return fallback;
}

export function formatValue(value, fallback = 'No registrado') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item, '')).filter(Boolean).join(', ') || fallback;
  }

  if (typeof value === 'object') {
    return value.nombre || value.name || value.label || value.descripcion || fallback;
  }

  return fallback;
}

function formatBeneficiary(beneficiary) {
  if (!beneficiary || typeof beneficiary !== 'object') {
    return formatValue(beneficiary, '');
  }

  const name = getValue(beneficiary, ['nombre', 'name', 'nombre_completo', 'beneficiario'], '');
  const phone = getValue(beneficiary, ['telefono', 'phone', 'beneficiario_telefono'], '');
  const percentage = getValue(beneficiary, ['porcentaje', 'percentage'], '');
  const details = [percentage ? `${percentage}%` : '', phone].filter(Boolean).join(' - ');

  return [name, details ? `(${details})` : ''].filter(Boolean).join(' ');
}

function buildBeneficiaries(profile, userData, personalData) {
  const nested = profile?.beneficiarios || personalData?.beneficiarios || userData?.beneficiarios;

  if (Array.isArray(nested) && nested.length > 0) {
    return nested.map(formatBeneficiary).filter(Boolean).join(', ');
  }

  if (nested && !Array.isArray(nested)) {
    return nested;
  }

  return [
    {
      nombre: userData?.beneficiario,
      telefono: userData?.beneficiario_telefono,
      porcentaje: userData?.porcentaje_1,
    },
    {
      nombre: userData?.beneficiario_02,
      telefono: userData?.beneficiario_telefono_02,
      porcentaje: userData?.porcentaje_2,
    },
  ].map(formatBeneficiary).filter(Boolean).join(', ');
}

export function buildProfileViewData(profile, authUser) {
  const userData = profile?.user_data || profile?.datos_usuario || profile?.mis_datos || {};
  const personalData = {
    ...(profile?.cliente || profile?.usuario || profile?.user || {}),
    ...userData,
  };
  const addressData = profile?.direccion || profile?.domicilio || userData?.direccion_data || userData?.domicilio || userData;
  const bankData = profile?.banco || profile?.datos_bancarios || userData?.banco_data || userData?.datos_bancarios || userData;
  const beneficiariesText = buildBeneficiaries(profile, userData, personalData);

  return {
    addressData,
    bankData,
    beneficiariesText,
    personalData,
    userData,
    user: authUser || {},
  };
}
