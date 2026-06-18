import { AlertCircle, ChartNoAxesColumnIncreasing, Eye, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import FinancialRequestList from '../../../components/common/FinancialRequestList.jsx';
import PageHero from '../../../components/common/PageHero.jsx';
import UserRecordsModal from '../../../components/common/UserRecordsModal.jsx';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';
import InvestmentPlanCard from '../components/InvestmentPlanCard.jsx';
import InvestmentRequestForm from '../components/InvestmentRequestForm.jsx';
import { getInvestmentPlans, getInvestments } from '../services/investmentService.js';

function InvestmentsPage() {
  const pageRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [investments, setInvestments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);

  useGrowcapPageMotion(pageRef);

  const loadInvestmentsData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [plansResponse, investmentsResponse] = await Promise.all([
        getInvestmentPlans(),
        getInvestments({ orden: 'fecha_desc' }),
      ]);

      setPlans(plansResponse.data);
      setInvestments(investmentsResponse.data);
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, 'No fue posible cargar inversiones y planes.');
      setError(normalized.message);
      setPlans([]);
      setInvestments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvestmentsData();
  }, [loadInvestmentsData]);

  useEffect(() => {
    const checkoutStatus = searchParams.get('status') || searchParams.get('payment') || searchParams.get('stripe');
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled') || searchParams.get('cancelled');
    const returnedInvestmentId = searchParams.get('inversion_id');
    const isSuccess = checkoutStatus === 'success' || checkoutStatus === 'succeeded' || success === 'true';
    const isCanceled = checkoutStatus === 'cancel' || checkoutStatus === 'canceled' || canceled === 'true';

    if (!isSuccess && !isCanceled && !returnedInvestmentId) {
      return;
    }

    setCheckoutMessage(
      isSuccess || returnedInvestmentId
        ? 'Pago recibido. Estamos confirmando tu operacion con el banco.'
        : 'Pago cancelado. Puedes iniciar una nueva solicitud cuando quieras.',
    );
    loadInvestmentsData();
    setSearchParams({}, { replace: true });
  }, [loadInvestmentsData, searchParams, setSearchParams]);

  return (
    <div className="page investments-page motion-page" ref={pageRef}>
      <PageHero
        eyebrow="Inversion"
        icon={ChartNoAxesColumnIncreasing}
        stats={[
          { label: 'Planes', value: isLoading ? '...' : String(plans.length) },
          { label: 'Solicitudes', value: isLoading ? '...' : String(investments.length) },
        ]}
        title="Compara planes antes de invertir"
      >
        Una vista mas enfocada para revisar opciones y dejar lista tu solicitud sin perder contexto.
      </PageHero>

      {checkoutMessage && <Alert type="info">{checkoutMessage}</Alert>}

      <section className="section-block plans-section motion-immediate">
        <div className="section-heading">
          <span>Comparador</span>
          <h2>Planes disponibles</h2>
        </div>
        {isLoading && <div className="loading">Cargando planes...</div>}
        {!isLoading && error && (
          <div className="savings-plans-state savings-plans-error" role="alert">
            <AlertCircle size={34} aria-hidden="true" />
            <div>
              <h3>No se pudieron cargar los planes</h3>
              <p>{error}</p>
            </div>
            <Button className="button-secondary icon-button" onClick={loadInvestmentsData}>
              <RefreshCw size={18} aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        )}
        {!isLoading && !error && plans.length === 0 && (
          <div className="savings-plans-state">
            <div>
              <h3>Aun no hay planes disponibles</h3>
              <p>Cuando haya planes de inversion activos, apareceran aqui.</p>
            </div>
          </div>
        )}
        {!isLoading && !error && plans.length > 0 && (
          <div className="grid grid-2">
            {plans.map((plan, index) => (
              <InvestmentPlanCard key={plan?.id || plan?.id_inversion || plan?.label || `investment-plan-${index}`} plan={plan} />
            ))}
          </div>
        )}
      </section>

      <InvestmentRequestForm onCreated={loadInvestmentsData} plans={plans} />

      <div className="records-entry motion-immediate">
        <div>
          <span>Seguimiento</span>
          <h2>Consulta tus inversiones sin saturar la vista</h2>
          <p>El historial queda disponible en un modal con estados de pago y datos clave.</p>
        </div>
        <Button className="button-secondary icon-button records-entry-button" onClick={() => setIsRecordsOpen(true)}>
          <Eye size={18} aria-hidden="true" />
          Ver mis inversiones
        </Button>
      </div>

      <UserRecordsModal
        isOpen={isRecordsOpen}
        onClose={() => setIsRecordsOpen(false)}
        subtitle="Consulta monto invertido, plan, rendimiento, fecha y estado de pago."
        title="Mis inversiones"
      >
        <FinancialRequestList
          emptyDescription="Cuando completes una solicitud, aparecera aqui."
          emptyTitle="Aun no tienes inversiones registradas."
          error={error}
          isLoading={isLoading}
          items={investments}
          onRefresh={loadInvestmentsData}
          searchable
          title="Historial de inversiones"
          type="investments"
        />
      </UserRecordsModal>
    </div>
  );
}

export default InvestmentsPage;
