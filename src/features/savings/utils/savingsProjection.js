/**
 * Motor de Proyección Financiera de Maduración para Ahorros GrowCap
 */

export function calculateSavingsProjection(ahorro, customCuota = null, customHorizonteMeses = null, defaultFreq = 'Quincenal') {
  const montoActual = Math.max(0, Number(ahorro?.monto_ahorro ?? 0));
  const cuota = customCuota !== null
    ? Math.max(0, Number(customCuota))
    : Math.max(0, Number(ahorro?.cuota ?? ahorro?.monto_min ?? ahorro?.monto_minimo ?? 100));

  const freq = String(ahorro?.frecuencia_pago ?? defaultFreq ?? 'Quincenal').trim().toLowerCase();
  let tasaAnual = Number(ahorro?.rendimiento ?? ahorro?.tasa_vigente ?? ahorro?.porcentaje ?? ahorro?.plan?.rendimiento ?? 10) / 100;

  let periodosPorAnio = 24;
  let diasPorPeriodo = 15.2;
  let freqLabel = 'Quincenal';

  if (freq.includes('sem')) {
    periodosPorAnio = 52;
    diasPorPeriodo = 7;
    freqLabel = 'Semanal';
  } else if (freq.includes('catorc')) {
    periodosPorAnio = 26;
    diasPorPeriodo = 14;
    freqLabel = 'Catorcenal';
  } else if (freq.includes('mens')) {
    periodosPorAnio = 12;
    diasPorPeriodo = 30.4375;
    freqLabel = 'Mensual';
  }

  const now = new Date();
  const fechaInicio = ahorro?.fecha_inicio
    ? new Date(String(ahorro.fecha_inicio).replace(' ', 'T'))
    : new Date();

  let fechaFin = null;
  let isPermanente = false;

  const mesCorte = ahorro?.mes_corte ?? ahorro?.plan?.mes_corte;
  const diaCorte = ahorro?.dia_corte ?? ahorro?.plan?.dia_corte;

  if (ahorro?.fecha_fin) {
    fechaFin = new Date(String(ahorro.fecha_fin).replace(' ', 'T'));
  } else if (mesCorte && diaCorte) {
    const targetMonth = Number(mesCorte) - 1;
    const targetDay = Number(diaCorte || 1);
    let targetYear = now.getFullYear();
    let targetDate = new Date(targetYear, targetMonth, targetDay, 0, 0, 0);
    if (targetDate <= now) {
      targetYear += 1;
      targetDate = new Date(targetYear, targetMonth, targetDay, 0, 0, 0);
    }
    fechaFin = targetDate;
  } else if (ahorro?.is_temporada && ahorro?.meses_minimos) {
    const nextDate = new Date(now);
    nextDate.setMonth(nextDate.getMonth() + Number(ahorro.meses_minimos));
    fechaFin = nextDate;
  }

  const mesesHorizonte = Math.max(1, Number(customHorizonteMeses ?? 12));

  if (!fechaFin || isNaN(fechaFin.getTime()) || fechaFin <= fechaInicio) {
    isPermanente = true;
    const diasFuturos = Math.round(mesesHorizonte * 30.4375);
    fechaFin = new Date(now.getTime() + diasFuturos * 86400000);
  }

  const isEscalonado = ahorro?.es_escalonado || ahorro?.plan?.es_escalonado || ahorro?.permite_fecha_personalizada || ahorro?.plan?.permite_fecha_personalizada;
  
  if (isEscalonado) {
    const totalMonths = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
    if (totalMonths >= 24) tasaAnual = 12.5 / 100;
    else if (totalMonths >= 12) tasaAnual = 11.5 / 100;
    else if (totalMonths >= 6) tasaAnual = 9.5 / 100;
    else tasaAnual = 7.5 / 100;
  }

  const totalDias = Math.max(1, Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)));
  const diasTranscurridos = Math.max(0, Math.round((now.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)));
  const diasRestantes = Math.max(0, Math.round((fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const progressPct = isPermanente
    ? Math.min(100, Math.max(5, Math.round((diasTranscurridos / (diasTranscurridos + diasRestantes)) * 100)))
    : Math.min(100, Math.max(0, Math.round((diasTranscurridos / totalDias) * 100)));

  const periodosRestantes = Math.max(0, Math.round(diasRestantes / diasPorPeriodo));
  const aportacionesFuturas = periodosRestantes * cuota;
  const capitalFinal = montoActual + aportacionesFuturas;

  const tasaPorPeriodo = tasaAnual / periodosPorAnio;
  let saldoSimulado = montoActual;
  let rendimientoTotalEstimado = 0;

  const timeline = [];
  timeline.push({
    periodo: 0,
    etiqueta: 'Hoy',
    capital: montoActual,
    rendimiento: 0,
    total: montoActual,
  });

  const stepInterval = Math.max(1, Math.floor(periodosRestantes / 5));

  for (let p = 1; p <= periodosRestantes; p++) {
    saldoSimulado += cuota;
    const interes = saldoSimulado * tasaPorPeriodo;
    rendimientoTotalEstimado += interes;
    saldoSimulado += interes;

    if (p % stepInterval === 0 || p === periodosRestantes) {
      timeline.push({
        periodo: p,
        etiqueta: `${freqLabel} ${p}`,
        capital: montoActual + (p * cuota),
        rendimiento: Math.round(rendimientoTotalEstimado * 100) / 100,
        total: Math.round(saldoSimulado * 100) / 100,
      });
    }
  }

  const montoProyectado = Math.round(saldoSimulado * 100) / 100;
  const rendimientosProyectados = Math.round(rendimientoTotalEstimado * 100) / 100;

  return {
    montoActual,
    cuota,
    tasaAnualPct: Math.round(tasaAnual * 1000) / 10,
    frecuenciaLabel: freqLabel,
    fechaInicio,
    fechaFin,
    isPermanente,
    mesesHorizonte,
    totalDias,
    diasTranscurridos,
    diasRestantes,
    progressPct: ahorro?.en_ventana_retiro ? 100 : progressPct,
    periodosRestantes,
    aportacionesFuturas,
    capitalFinal,
    rendimientosProyectados,
    montoProyectado,
    timeline,
  };
}
