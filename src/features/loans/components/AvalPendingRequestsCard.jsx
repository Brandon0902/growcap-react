import { AlertTriangle, ChevronRight, Clock, ShieldCheck, User } from 'lucide-react';
import Button from '../../../components/common/Button.jsx';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AvalPendingRequestsCard({ requests = [], onReview }) {
  if (!requests || requests.length === 0) {
    return null;
  }

  return (
    <section
      className="section-block"
      style={{
        marginBottom: '20px',
        padding: '20px 24px',
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
      }}
      aria-labelledby="aval-pending-heading"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#f1f5f9',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e2e8f0',
            }}
          >
            <ShieldCheck size={20} style={{ color: '#4338ca' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 id="aval-pending-heading" style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Solicitudes que Requieren tu Respaldo como Aval
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#e0e7ff',
                  color: '#3730a3',
                }}
              >
                {requests.length} {requests.length === 1 ? 'pendiente' : 'pendientes'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Un compañero ha registrado tu código de aval para su solicitud de crédito. Como protocolo de seguridad, debes revisar las condiciones y confirmar tu consentimiento.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {requests.map((req) => {
          const solicitanteNombre = req.solicitante_nombre || req.solicitante?.nombre || 'Compañero de trabajo';
          const solicitantePuesto = req.solicitante_num_empleado
            ? `No. Emp: ${req.solicitante_num_empleado}`
            : (req.solicitante?.puesto || req.solicitante?.departamento || '');
          const monto = Number(req.cantidad ?? req.monto_solicitado ?? 0);
          const cuota = Number(req.cuota_fija ?? 0);
          const frecuencia = req.recurrencia_pago || req.frecuencia_pago || 'Semanal';
          const planNombre = req.plan_nombre || 'Préstamo Personal';

          return (
            <div
              key={req.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '14px 18px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                      {solicitanteNombre}
                    </span>
                    {solicitantePuesto && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        • {solicitantePuesto}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '0.76rem', color: '#475569' }}>
                    <span>Plan: <strong>{planNombre}</strong></span>
                    <span>•</span>
                    <span>Monto: <strong style={{ color: '#0f172a' }}>{formatMoney(monto)} MXN</strong></span>
                    <span>•</span>
                    <span>Cuota: <strong>{formatMoney(cuota)} ({frecuencia})</strong></span>
                  </div>
                  <div style={{ marginTop: '2px', fontSize: '0.7rem', color: '#94a3b8' }}>
                    Solicitado el {formatDate(req.fecha)} (Folio #{req.id})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  type="button"
                  className="button-primary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '7px 14px',
                    minHeight: '34px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#334155',
                    borderColor: '#1e293b',
                  }}
                  onClick={() => onReview(req)}
                >
                  <span>Revisar y responder</span>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
