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

export function getBeneficiariesList(profile, userData) {
  const ud = userData || profile?.user_data || profile?.datos_usuario || {};
  const list = [];

  const b1Name = ud?.beneficiario || '';
  const b1Phone = ud?.beneficiario_telefono || '';
  const b1Pct = ud?.porcentaje_1 !== undefined && ud?.porcentaje_1 !== null ? Number(ud.porcentaje_1) : null;

  if (b1Name || b1Pct !== null) {
    list.push({
      slot: 1,
      nombre: b1Name,
      telefono: b1Phone,
      porcentaje: b1Pct ?? 0,
    });
  }

  const b2Name = ud?.beneficiario_02 || '';
  const b2Phone = ud?.beneficiario_telefono_02 || '';
  const b2Pct = ud?.porcentaje_2 !== undefined && ud?.porcentaje_2 !== null ? Number(ud.porcentaje_2) : null;

  if (b2Name || b2Pct !== null) {
    list.push({
      slot: 2,
      nombre: b2Name,
      telefono: b2Phone,
      porcentaje: b2Pct ?? 0,
    });
  }

  return list;
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
  const beneficiariesList = getBeneficiariesList(profile, userData);

  return {
    addressData,
    bankData,
    beneficiariesText,
    beneficiariesList,
    laboralesData: profile?.laborales || null,
    personalData,
    userData,
    user: authUser || {},
  };
}

