import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(dateStr);
  const dateFormatted = d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateFormatted}, ${timeFormatted}`;
}

function getStatusBadge(item) {
  const statusNum = Number(item?.status ?? item?.id_status ?? 0);
  const statusStr = String(item?.status_label || item?.estado || '').toLowerCase();

  if (statusNum === 1 || statusNum === 6 || statusStr.includes('liquid')) {
    return {
      label: 'Liquidado',
      bg: '#dcfce7',
      color: '#166534',
      border: '#86efac',
      icon: CheckCircle2,
    };
  }
  if (statusNum === 4 || statusStr.includes('cancel')) {
    return {
      label: 'Cancelado',
      bg: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
      icon: XCircle,
    };
  }
  if (statusNum === 3 || statusStr.includes('rechaz')) {
    return {
      label: 'Rechazado',
      bg: '#fee2e2',
      color: '#991b1b',
      border: '#fca5a5',
      icon: XCircle,
    };
  }
  if (statusNum === 5 || statusStr.includes('activ')) {
    const moraAcumulada = Number(item?.mora_acumulada ?? 0);
    const numAtrasos = Number(item?.num_atrasos ?? 0);
    if (moraAcumulada > 0 || numAtrasos > 0 || statusStr.includes('atras')) {
      return {
        label: 'Con atraso',
        bg: '#fee2e2',
        color: '#991b1b',
        border: '#fca5a5',
        icon: FileText,
      };
    }
    return {
      label: 'Activo',
      bg: '#d1fae5',
      color: '#065f46',
      border: '#6ee7b7',
      icon: CheckCircle2,
    };
  }
  const moraAcumulada = Number(item?.mora_acumulada ?? 0);
  if (moraAcumulada > 0 || statusStr.includes('atras')) {
    return {
      label: 'Con atraso',
      bg: '#fee2e2',
      color: '#991b1b',
      border: '#fca5a5',
      icon: FileText,
    };
  }
  return {
    label: item?.status_label || 'En Revisión',
    bg: '#fef3c7',
    color: '#92400e',
    border: '#fde68a',
    icon: FileText,
  };
}

export default function LoanKardexTable({ items = [] }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'LIQUIDADO' | 'CANCELADO' | 'RECHAZADO'
  const [sortField, setSortField] = useState('fecha');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  const counts = useMemo(() => {
    let liquidado = 0;
    let cancelado = 0;
    let rechazado = 0;
    for (const it of items) {
      const s = Number(it.status ?? it.id_status ?? 0);
      if (s === 1 || s === 6) liquidado += 1;
      else if (s === 4) cancelado += 1;
      else if (s === 3) rechazado += 1;
    }
    return {
      all: items.length,
      liquidado,
      cancelado,
      rechazado,
    };
  }, [items]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const processedItems = useMemo(() => {
    let list = [...items];

    // Filter by status pill
    if (filterStatus === 'LIQUIDADO') {
      list = list.filter((it) => [1, 6].includes(Number(it.status ?? it.id_status ?? 0)));
    } else if (filterStatus === 'CANCELADO') {
      list = list.filter((it) => Number(it.status ?? it.id_status ?? 0) === 4);
    } else if (filterStatus === 'RECHAZADO') {
      list = list.filter((it) => Number(it.status ?? it.id_status ?? 0) === 3);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((it) => {
        const text = [
          it.id,
          it.plan?.nombre,
          it.plan?.periodo,
          it.aval_nombre,
          it.garantia_tipo,
          it.nota,
          it.status_label,
          it.cantidad,
          it.total_adeudo,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      let valA;
      let valB;

      if (sortField === 'fecha') {
        const dateA = a.fecha_solicitud || a.fecha_inicio || a.fecha || a.created_at || '';
        const dateB = b.fecha_solicitud || b.fecha_inicio || b.fecha || b.created_at || '';
        valA = new Date(String(dateA).replace(' ', 'T')).getTime() || 0;
        valB = new Date(String(dateB).replace(' ', 'T')).getTime() || 0;
      } else if (sortField === 'id') {
        valA = Number(a.id ?? 0);
        valB = Number(b.id ?? 0);
      } else if (sortField === 'plan') {
        valA = String(a.plan?.nombre || a.plan?.periodo || '').toLowerCase();
        valB = String(b.plan?.nombre || b.plan?.periodo || '').toLowerCase();
      } else if (sortField === 'monto') {
        valA = Number(a.monto_solicitado ?? a.cantidad ?? 0);
        valB = Number(b.monto_solicitado ?? b.cantidad ?? 0);
      } else if (sortField === 'total') {
        valA = Number(a.total_adeudo ?? 0);
        valB = Number(b.total_adeudo ?? 0);
      } else if (sortField === 'status') {
        valA = Number(a.status ?? 0);
        valB = Number(b.status ?? 0);
      } else {
        valA = a[sortField] ?? '';
        valB = b[sortField] ?? '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [items, filterStatus, search, sortField, sortDirection]);

  const summary = useMemo(() => {
    let totalSolicitado = 0;
    let totalLiquidado = 0;
    for (const it of processedItems) {
      const amount = Number(it.monto_solicitado ?? it.cantidad ?? 0);
      totalSolicitado += amount;
      if ([1, 6].includes(Number(it.status ?? 0))) {
        totalLiquidado += Number(it.monto_pagado ?? it.total_adeudo ?? amount);
      }
    }
    return { totalSolicitado, totalLiquidado };
  }, [processedItems]);

  const filterPills = [
    { id: 'ALL', label: 'Todos', count: counts.all },
    { id: 'LIQUIDADO', label: 'Liquidados', count: counts.liquidado },
    { id: 'CANCELADO', label: 'Cancelados', count: counts.cancelado },
    ...(counts.rechazado > 0
      ? [{ id: 'RECHAZADO', label: 'Rechazados', count: counts.rechazado }]
      : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* Sub-header with filter pills and fast search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          background: '#f8fafc',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {filterPills.map((pill) => {
            const isSelected = filterStatus === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterStatus(pill.id)}
                style={{
                  fontSize: '0.74rem',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid var(--color-primary, #6b21a8)' : '1px solid #cbd5e1',
                  background: isSelected ? 'var(--color-primary, #6b21a8)' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{pill.label}</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '0px 5px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#64748b',
                    fontWeight: 600,
                  }}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', minWidth: '220px', flex: '0 1 280px' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por folio, aval, plan..."
            style={{
              width: '100%',
              fontSize: '0.78rem',
              padding: '6px 10px 6px 30px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Compact Kardex Table */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          overflowX: 'auto',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <table style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {/* Fecha */}
              <th
                onClick={() => handleSort('fecha')}
                style={{
                  padding: '9px 12px',
                  fontWeight: 600,
                  color: sortField === 'fecha' ? 'var(--color-primary, #6b21a8)' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  width: '120px',
                }}
                title="Ordenar por fecha de solicitud"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Fecha</span>
                  {sortField === 'fecha' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                  ) : (
                    <ArrowUpDown size={10} color="#94a3b8" />
                  )}
                </div>
              </th>

              {/* Folio */}
              <th
                onClick={() => handleSort('id')}
                style={{
                  padding: '9px 12px',
                  fontWeight: 600,
                  color: sortField === 'id' ? 'var(--color-primary, #6b21a8)' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  width: '75px',
                }}
                title="Ordenar por folio"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Folio</span>
                  {sortField === 'id' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                  ) : (
                    <ArrowUpDown size={10} color="#94a3b8" />
                  )}
                </div>
              </th>

              {/* Plan */}
              <th
                onClick={() => handleSort('plan')}
                style={{
                  padding: '9px 12px',
                  fontWeight: 600,
                  color: sortField === 'plan' ? 'var(--color-primary, #6b21a8)' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  width: '135px',
                }}
                title="Ordenar por plan"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Plan / Periodo</span>
                  {sortField === 'plan' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                  ) : (
                    <ArrowUpDown size={10} color="#94a3b8" />
                  )}
                </div>
              </th>

              {/* Monto Solicitado */}
              <th
                onClick={() => handleSort('monto')}
                style={{
                  padding: '9px 12px',
                  fontWeight: 600,
                  color: sortField === 'monto' ? 'var(--color-primary, #6b21a8)' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  width: '120px',
                }}
                title="Ordenar por monto solicitado"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                  <span>Monto Solicitado</span>
                  {sortField === 'monto' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                  ) : (
                    <ArrowUpDown size={10} color="#94a3b8" />
                  )}
                </div>
              </th>

              {/* Total Adeudo */}
              <th
                onClick={() => handleSort('total')}
                style={{
                  padding: '9px 12px',
                  fontWeight: 600,
                  color: sortField === 'total' ? 'var(--color-primary, #6b21a8)' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  width: '115px',
                }}
                title="Ordenar por total adeudado"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                  <span>Total a Pagar</span>
                  {sortField === 'total' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                  ) : (
                    <ArrowUpDown size={10} color="#94a3b8" />
                  )}
                </div>
              </th>

              {/* Aval / Garantía */}
              <th style={{ padding: '9px 12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', width: '175px' }}>
                Respaldo / Aval
              </th>

              {/* Estado */}
              <th
                onClick={() => handleSort('status')}
                style={{
                  padding: '9px 12px',
                  fontWeight: 600,
                  color: sortField === 'status' ? 'var(--color-primary, #6b21a8)' : '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  width: '110px',
                }}
                title="Ordenar por estado"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Estado</span>
                  {sortField === 'status' ? (
                    sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                  ) : (
                    <ArrowUpDown size={10} color="#94a3b8" />
                  )}
                </div>
              </th>

              {/* Detalle / Observación */}
              <th style={{ padding: '9px 12px', fontWeight: 600, color: '#475569', minWidth: '220px' }}>
                Detalle / Motivo
              </th>
            </tr>
          </thead>
          <tbody>
            {processedItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '36px 14px', textAlign: 'center', color: '#94a3b8' }}>
                  No se encontraron registros en el historial de préstamos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              processedItems.map((item, idx) => {
                const badge = getStatusBadge(item);
                const BadgeIcon = badge.icon;
                const isOdd = idx % 2 === 1;
                const originalAmount = Number(item.monto_solicitado ?? item.cantidad ?? 0);
                const totalAdeudo = Number(item.total_adeudo ?? (originalAmount * 1.1));
                const planName = item.plan?.nombre || (item.plan?.periodo ? `Plan ${item.plan.periodo}` : `Plan #${item.id_activo || item.id}`);
                const cuotaFija = Number(item.cuota_fija ?? 0);
                const frecuencia = item.frecuencia_pago || 'Semanal';

                // Extract clean cancellation reason or resolution note
                let detalleText = 'Registro en historial';
                const statusNum = Number(item.status ?? 0);
                if (statusNum === 1 || statusNum === 6) {
                  detalleText = `Liquidado en su totalidad (${formatMoney(item.monto_pagado ?? totalAdeudo)} pagados)`;
                } else if (statusNum === 4) {
                  if (item.nota) {
                    const match = item.nota.match(/\[Cancelación[^\]]*\]:\s*(.*)/i);
                    detalleText = match ? match[1] : item.nota;
                  } else {
                    detalleText = 'Cancelado antes de dispersión';
                  }
                } else if (statusNum === 3) {
                  detalleText = item.nota || 'Rechazado por el comité de crédito';
                } else if (statusNum === 2) {
                  detalleText = 'En evaluación por el comité de crédito';
                }
                
                const moraAcumulada = Number(item?.mora_acumulada ?? 0);
                if (moraAcumulada > 0) {
                  detalleText = `Atraso de ${formatMoney(moraAcumulada)} (${item?.num_atrasos} periodos vencidos)`;
                }

                return (
                  <tr
                    key={item.id || idx}
                    style={{
                      background: isOdd ? '#fbfcfe' : '#ffffff',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isOdd ? '#fbfcfe' : '#ffffff'; }}
                  >
                    {/* Fecha */}
                    <td
                      style={{
                        padding: '8px 12px',
                        color: '#334155',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                      title={formatDateTime(item.fecha_solicitud || item.fecha)}
                    >
                      {formatDate(item.fecha_solicitud || item.fecha)}
                    </td>

                    {/* Folio */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          color: 'var(--color-primary, #6b21a8)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        #{item.id}
                      </span>
                    </td>

                    {/* Plan */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: '#0f172a', fontWeight: 600, display: 'block' }}>
                        {planName}
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {item.semanas ? `${item.semanas} semanas` : ''}
                        {cuotaFija > 0 ? ` • ${formatMoney(cuotaFija)}/${frecuencia.toLowerCase().slice(0, 3)}` : ''}
                      </span>
                    </td>

                    {/* Monto Solicitado */}
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatMoney(originalAmount)}
                    </td>

                    {/* Total Adeudo */}
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: '#475569',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatMoney(totalAdeudo)}
                    </td>

                    {/* Aval / Respaldo */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {item.aval_nombre ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <ShieldCheck size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.74rem', color: '#1e293b', fontWeight: 500 }} title={item.aval_nombre}>
                            {item.aval_nombre.length > 22
                              ? `${item.aval_nombre.slice(0, 20)}...`
                              : item.aval_nombre}
                          </span>
                        </div>
                      ) : item.garantia_tipo === 'AHORRO' ? (
                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 500 }}>
                          Garantía con Ahorro
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          Sin aval solidario
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '0.67rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <BadgeIcon size={11} />
                        {badge.label}
                      </span>
                    </td>

                    {/* Detalle / Motivo */}
                    <td
                      style={{
                        padding: '8px 12px',
                        fontSize: '0.72rem',
                        color: '#64748b',
                        maxWidth: '280px',
                      }}
                      title={detalleText}
                    >
                      <span
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {detalleText}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '0.74rem',
          color: '#64748b',
        }}
      >
        <div>
          Mostrando <strong>{processedItems.length}</strong> de <strong>{items.length}</strong> registros en el historial.
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            Total Solicitado en historial:{' '}
            <strong style={{ color: '#0f172a' }}>{formatMoney(summary.totalSolicitado)}</strong>
          </div>
          {summary.totalLiquidado > 0 && (
            <div>
              Total Liquidado:{' '}
              <strong style={{ color: '#16a34a' }}>{formatMoney(summary.totalLiquidado)}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
