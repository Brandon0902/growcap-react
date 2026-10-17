import { useState, useMemo, useRef } from 'react';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  Building2, 
  UserMinus, 
  ShieldAlert, 
  AlertTriangle, 
  PiggyBank, 
  TrendingUp, 
  ShieldCheck, 
  FileText,
  ExternalLink,
  X,
  Banknote,
  Wallet
} from 'lucide-react';
import useGrowcapPageMotion from '../../../hooks/useGrowcapPageMotion.js';

const FAQ_CATEGORIES = [
  { id: 'all', label: 'Todas las dudas', icon: HelpCircle },
  { id: 'prestamos', label: 'Préstamos Personales', icon: Banknote },
  { id: 'nomina', label: 'Convenio y Nómina', icon: Building2 },
  { id: 'bajas', label: 'Bajas y Finiquitos', icon: UserMinus },
  { id: 'aval', label: 'Aval Solidario', icon: ShieldAlert },
  { id: 'insuficiencia', label: 'Nómina Insuficiente', icon: AlertTriangle },
  { id: 'ahorro', label: 'Ahorro', icon: PiggyBank },
  { id: 'inversion', label: 'Inversiones', icon: TrendingUp },
  { id: 'saldos', label: 'Saldos y Retiros', icon: Wallet },
  { id: 'seguridad', label: 'Seguridad y NIP', icon: ShieldCheck },
];

const FAQ_ITEMS = [
  // --- PRÉSTAMOS PERSONALES ---
  {
    id: 'pres-1',
    category: 'prestamos',
    question: '¿Cuáles son los requisitos básicos para solicitar un préstamo personal?',
    answer: 'Estar activo en una empresa con convenio vigente, percibir ingresos por nómina comprobables, tener capacidad de descuento disponible (máximo 30% de tu sueldo neto periódico) y presentar identificación oficial vigente, comprobante de domicilio y el último recibo de nómina.',
  },
  {
    id: 'pres-2',
    category: 'prestamos',
    question: '¿Cuánto dinero puedo solicitar y de qué depende mi límite de crédito?',
    answer: 'El monto mínimo y máximo está determinado por los planes habilitados para tu empresa. Además, por normativa de protección laboral, la cuota estimada de pago no puede superar el 30% de tu percepción salarial neta periódica.',
  },
  {
    id: 'pres-3',
    category: 'prestamos',
    question: '¿Cómo se calculan y descuentan las cuotas de mi préstamo?',
    answer: 'Las cuotas son fijas y uniformes a lo largo de todo el plazo seleccionado en el simulador. Se descuentan automáticamente en cada dispersión oficial de nómina (semanal, quincenal o mensual) directamente por tu empresa.',
  },
  {
    id: 'pres-4',
    category: 'prestamos',
    question: '¿Puedo realizar abonos extraordinarios o liquidar mi préstamo antes de tiempo?',
    answer: 'Sí. En cualquier momento puedes entrar a tu módulo de Préstamos, dar clic en "Abonar / Liquidar" y realizar abonos directos o saldar tu cuenta mediante transferencia bancaria SPEI o pasarela de pago para reducir tu saldo restante.',
  },
  {
    id: 'pres-5',
    category: 'prestamos',
    question: '¿Existe alguna penalización o comisión por liquidar antes de tiempo?',
    answer: 'No hay ninguna penalización ni cobro extra por liquidar antes de tiempo. Sin embargo, ten en cuenta que el sistema liquida el total de la deuda acordada (capital más intereses contratados desde el inicio del préstamo), por lo que no aplica descuento ni condonación de intereses por pronto pago.',
  },
  {
    id: 'pres-6',
    category: 'prestamos',
    question: '¿Cuánto tiempo tarda la revisión, aprobación y depósito de mi préstamo?',
    answer: 'Una vez firmado el pagaré y completada la validación de tu aval (o seleccionada tu auto-garantía), el comité revisa la solicitud en un lapso de 24 a 48 horas hábiles. Al ser aprobada, la dispersión se envía vía SPEI a tu cuenta bancaria registrada.',
  },
  {
    id: 'pres-7',
    category: 'prestamos',
    question: '¿Cómo recibo el dinero aprobado de mi préstamo?',
    answer: 'El recurso se transfiere íntegramente por SPEI a la cuenta CLABE personal que diste de alta en la plataforma, garantizando que el dinero llegue de forma segura y directa a tu banco.',
  },
  {
    id: 'pres-8',
    category: 'prestamos',
    question: '¿Puedo tener dos préstamos activos al mismo tiempo?',
    answer: 'Como regla general debes liquidar tu préstamo en curso antes de solicitar otro. El comité de crédito solo evaluará una segunda solicitud si tu capacidad de retención del 30% lo permite con total solvencia.',
  },
  {
    id: 'pres-9',
    category: 'prestamos',
    question: '¿Qué documentos debo adjuntar al solicitar mi préstamo?',
    answer: 'Depende del monto solicitado: para préstamos a partir de $2,000.00 MXN debes adjuntar el formato de solicitud firmado, INE vigente y comprobante de domicilio reciente, tanto tuyos como de tu aval solidario. Para préstamos menores a $2,000.00 MXN el trámite es simplificado: puedes utilizar un código de aval solidario o respaldar el crédito con tu propio ahorro a plazo fijo (Auto-Garantía).',
  },
  {
    id: 'pres-10',
    category: 'prestamos',
    question: '¿Dónde puedo consultar mi saldo pendiente, cuotas pagadas y próximas fechas de cobro?',
    answer: 'Ingresa a Préstamos y da clic en "Ver Detalle" sobre tu crédito activo. Podrás revisar tu saldo insoluto, el número de cuotas cubiertas y la tabla de amortización detallada.',
  },
  {
    id: 'pres-11',
    category: 'prestamos',
    question: '¿Qué sucede si mi solicitud de préstamo es devuelta o rechazada?',
    answer: 'La plataforma te notificará el motivo puntual (por ejemplo: imagen ilegible de la identificación, cuota superior al 30% permitido o falta de confirmación del aval). Podrás corregir los datos u observaciones y reenviarla de inmediato.',
  },
  {
    id: 'pres-12',
    category: 'prestamos',
    question: '¿Tener un préstamo en GrowCap afecta o consulta mi Buró de Crédito?',
    answer: 'No. GrowCap opera como una prestación interna de caja de ahorro bajo convenio laboral con tu empresa. La evaluación se realiza con base en tu estabilidad e ingresos en el centro de trabajo, sin reportar consultas de buró tradicional.',
  },
  {
    id: 'pres-13',
    category: 'prestamos',
    question: 'Si termino de pagar mi préstamo, ¿puedo solicitar otro de inmediato?',
    answer: 'Sí. En cuanto se registra la conciliación del último abono o cuota de nómina y el crédito pasa al estatus "Liquidado", tu capacidad crediticia se restablece al 100% y puedes iniciar una nueva solicitud.',
  },

  // --- CONVENIO Y NÓMINA ---
  {
    id: 'nom-1',
    category: 'nomina',
    question: '¿Cómo funcionan los descuentos vía nómina si soy socio por convenio de mi empresa?',
    answer: 'Tu empresa cuenta con un convenio formal con GrowCap para facilitar la retención automática de tus compromisos de ahorro o préstamos. El departamento de Nóminas aplica el descuento directamente en tu fecha de corte y transfiere el monto a la Caja para acreditarlo a tu cuenta sin que tengas que acudir a ventanillas bancarias.',
  },
  {
    id: 'nom-2',
    category: 'nomina',
    question: '¿En qué fechas se aplican los descuentos de nómina?',
    answer: 'Los descuentos se sincronizan de forma estricta con el calendario oficial de pagos de tu centro de trabajo: cada semana, quincena o mes, conforme a la periodicidad registrada en tus Datos Laborales.',
  },
  {
    id: 'nom-3',
    category: 'nomina',
    question: '¿Aparecen estos descuentos reflejados en mi recibo de nómina oficial (CFDI / recibo de pago)?',
    answer: 'Sí. En el apartado de deducciones de tu recibo de pago oficial verás el concepto claramente desglosado como retención de caja de ahorro o préstamo GrowCap, lo que te garantiza absoluta transparencia contable y laboral.',
  },
  {
    id: 'nom-4',
    category: 'nomina',
    question: '¿Qué pasa si el día de pago de nómina cae en fin de semana o día festivo oficial?',
    answer: 'El descuento se ejecuta en el día hábil en que tu empresa efectivamente disperse el pago de nómina. La plataforma de la caja reconoce este movimiento y mantiene tus compromisos al corriente sin recargos.',
  },
  {
    id: 'nom-5',
    category: 'nomina',
    question: '¿Puedo cambiar la periodicidad de mis descuentos (ejemplo: de semanal a quincenal)?',
    answer: 'La periodicidad de retención está sujeta directamente a cómo tu empresa te paga tu salario. Si tu centro de trabajo modifica tu esquema de nómina, comunícalo a Recursos Humanos y a la administración de GrowCap para actualizar tus datos.',
  },
  {
    id: 'nom-6',
    category: 'nomina',
    question: '¿Puedo modificar o pausar el monto que ahorro por nómina?',
    answer: 'Sí. Puedes pausar o ajustar la cuota de tu plan de ahorro programado directamente en la sección de Ahorros. Las solicitudes confirmadas antes del cierre de corte de nómina de tu empresa se aplican para el siguiente periodo de pago.',
  },

  // --- BAJAS Y FINIQUITOS ---
  {
    id: 'bajas-1',
    category: 'bajas',
    question: '¿Qué pasa con mi deuda si renuncio o me dan de baja de la empresa y tengo un préstamo activo?',
    answer: 'Al concluir tu relación laboral con la empresa con convenio, el saldo pendiente de tu préstamo debe liquidarse. Conforme a las cláusulas legales del pagaré y el contrato firmado, la empresa aplicará la retención del saldo insoluto de tu préstamo directamente de tu liquidación o finiquito laboral.',
  },
  {
    id: 'bajas-2',
    category: 'bajas',
    question: '¿Qué sucede si mi finiquito no alcanza para cubrir la totalidad de mi préstamo?',
    answer: 'Si el importe de tu finiquito resulta insuficiente para saldar el total, el remanente continúa siendo tu obligación personal. La administración de GrowCap te contactará para establecer un calendario de pagos voluntarios mediante transferencia bancaria SPEI, permitiéndote finiquitar tu crédito sin perjudicar tu historial ni comprometer a tu aval.',
  },
  {
    id: 'bajas-3',
    category: 'bajas',
    question: '¿Qué ocurre con mis ahorros e inversiones acumuladas si dejo de laborar en la empresa?',
    answer: 'Tu dinero acumulado es 100% tu patrimonio. Si tienes un préstamo pendiente, tus ahorros disponibles pueden aplicarse para amortizar la deuda. Si no tienes deuda o tras liquidarla queda saldo a favor, tus fondos liberados se transfieren íntegramente a tu cuenta bancaria registrada vía SPEI.',
  },
  {
    id: 'bajas-4',
    category: 'bajas',
    question: '¿Puedo seguir ahorrando o invirtiendo en GrowCap si cambio de trabajo?',
    answer: 'Podrás dar seguimiento y culminar tus inversiones y ahorros activos hasta su fecha de vencimiento. La posibilidad de abrir nuevos productos dependerá de si tu nuevo centro de trabajo cuenta con convenio o si la caja habilita esquemas de aportación independiente.',
  },

  // --- AVAL SOLIDARIO ---
  {
    id: 'aval-1',
    category: 'aval',
    question: '¿Qué pasa si soy aval de un compañero y él renuncia o es despedido teniendo deuda activa?',
    answer: 'El primer mecanismo legal de cobro es siempre el finiquito o liquidación laboral del propio titular del crédito, retenido por la empresa. Solo en el caso excepcional de que el finiquito no cubra la deuda y el titular se desentienda del pago voluntario, la administración contactará al aval para revisar el remanente y acordar esquemas accesibles de regularización.',
  },
  {
    id: 'aval-2',
    category: 'aval',
    question: '¿A mí como aval me descuentan de inmediato de mi nómina si el titular renuncia?',
    answer: 'No de manera inmediata ni sorpresiva. Primero se agota el cobro sobre el finiquito del solicitante y se le brinda la oportunidad de transferir vía SPEI. Solo tras este proceso, y con previo aviso formal, se requeriría el cumplimiento solidario.',
  },
  {
    id: 'aval-3',
    category: 'aval',
    question: '¿Qué pasa si el que renuncia a la empresa soy yo, y soy aval activo de otro compañero?',
    answer: 'Al tramitar tu baja laboral, el área administrativa verificará que el crédito que respaldaste se encuentre al corriente en sus pagos. De ser necesario, se solicitará al deudor titular que designe un aval sustituto o respalde su préstamo con su propio ahorro a plazo para liberar tu garantía.',
  },
  {
    id: 'aval-4',
    category: 'aval',
    question: '¿Puedo renunciar a ser aval de un compañero antes de que termine de pagar su crédito?',
    answer: 'Una vez formalizado y desembolsado el crédito, la obligación de aval solidario permanece vigente durante todo el plazo del préstamo. Solo se puede liberar al aval anticipadamente si el titular liquida su adeudo o si presenta un nuevo aval que sea aprobado por el comité.',
  },
  {
    id: 'aval-5',
    category: 'aval',
    question: '¿Por qué para préstamos a partir de $2,000.00 MXN es obligatorio tener un aval solidario?',
    answer: 'Es una regla estatutaria para proteger el fondo comunitario de la caja de ahorro. En créditos a partir de $2,000 MXN se formaliza el pagaré con la firma digital y documentación oficial tanto del titular como del aval solidario.',
  },
  {
    id: 'aval-6',
    category: 'aval',
    question: '¿Qué es la Auto-Garantía para préstamos menores a $2,000.00 MXN?',
    answer: 'Si solicitas menos de $2,000 MXN y cuentas con saldo en cuentas de ahorro a plazo fijo, puedes usar ese saldo como garantía propia. El crédito se aprueba al instante sin necesidad de pedir favores ni avales.',
  },

  // --- NÓMINA INSUFICIENTE ---
  {
    id: 'insuf-1',
    category: 'insuficiencia',
    question: '¿Qué pasa si en una semana o quincena mi nómina no alcanza para cubrir mis compromisos?',
    answer: 'Si tus percepciones netas bajan por faltas, permisos o comisiones menores, la empresa retendrá únicamente hasta donde legalmente sea posible. El saldo que no pudo ser descontado quedará pendiente de pago para su posterior regularización.',
  },
  {
    id: 'insuf-2',
    category: 'insuficiencia',
    question: '¿Qué ocurre si tengo una incapacidad médica del IMSS y mi empresa no me genera nómina?',
    answer: 'Durante una incapacidad del IMSS, la empresa no dispersa nómina ordinaria. En este periodo debes notificar a la administración de GrowCap con tu boleta de incapacidad; tus cuotas se pausarán temporalmente o podrás realizar pagos voluntarios por SPEI para mantener tu crédito al día.',
  },
  {
    id: 'insuf-3',
    category: 'insuficiencia',
    question: 'Si la nómina no alcanzó para descontar mi cuota, ¿se me cobran penalizaciones o intereses moratorios?',
    answer: 'No hay recargos abusivos inmediatos si existe una causa justificada. Tienes la opción de realizar el abono por transferencia bancaria SPEI directamente desde la plataforma antes del siguiente corte para no acumular cuotas vencidas.',
  },
  {
    id: 'insuf-4',
    category: 'insuficiencia',
    question: '¿Cómo realizo el pago manual si mi empresa no pudo descontar mi cuota en nómina?',
    answer: 'Ingresa a tu módulo de Préstamos, ubica tu crédito activo y da clic en "Abonar / Liquidar". La plataforma te mostrará la cuenta CLABE y la referencia para transferir vía SPEI, y podrás adjuntar tu comprobante bancario para acreditación inmediata.',
  },
  {
    id: 'insuf-5',
    category: 'insuficiencia',
    question: 'Si mi nómina neta queda muy justa, ¿se prioriza el préstamo o el ahorro?',
    answer: 'Por política de protección crediticia, se prioriza el descuento del préstamo para evitar atrasos y proteger tanto tu historial como el respaldo de tu aval. La aportación de ahorro programado puede ajustarse o posponerse.',
  },

  // --- AHORRO ---
  {
    id: 'ah-1',
    category: 'ahorro',
    question: '¿Cómo sé qué rendimiento generará mi cuenta de ahorro?',
    answer: 'Al seleccionar tu plan de ahorro (Siempre disponible o Programado con meta), la plataforma te informa la tasa de rendimiento preferencial vigente pactada para dicho producto. Los intereses se calculan diariamente y se acreditan conforme a las condiciones del plan.',
  },
  {
    id: 'ah-2',
    category: 'ahorro',
    question: '¿Cuál es el monto mínimo para abrir una cuenta de ahorro?',
    answer: 'El monto mínimo de apertura es muy accesible (desde $100.00 MXN), permitiendo a cualquier colaborador comenzar a construir su fondo de reserva con pequeñas aportaciones.',
  },
  {
    id: 'ah-3',
    category: 'ahorro',
    question: '¿Qué es la ventana de gracia de 10 días al cumplir el plazo de mi ahorro programado?',
    answer: 'Al llegar a la fecha de vencimiento de tu ahorro con meta, se abre un periodo de 10 días de gracia durante el cual tu capital y ganancias están 100% disponibles para transferir a tu banco. Si no solicitas el retiro, el plan se renueva para seguir generando rendimientos.',
  },
  {
    id: 'ah-4',
    category: 'ahorro',
    question: '¿Hay algún costo por retiro o comisión por manejo de cuenta en mis ahorros?',
    answer: 'No. No existen comisiones de apertura, saldo mínimo ni penalizaciones por retiro en las ventanas autorizadas. Todos los rendimientos pactados se acreditan íntegros a tu favor.',
  },
  {
    id: 'ah-5',
    category: 'ahorro',
    question: '¿Puedo tener más de una cuenta de ahorro activa al mismo tiempo?',
    answer: 'Sí. Puedes mantener una cuenta de Ahorro Siempre Disponible para emergencias cotidianas y a la vez tener uno o más planes de Ahorro Programado para metas específicas como vacaciones o fin de año.',
  },
  {
    id: 'ah-6',
    category: 'ahorro',
    question: '¿Cómo y cuándo se acreditan los rendimientos generados por mi ahorro?',
    answer: 'Los intereses se generan diariamente sobre tu saldo acumulado conforme a la tasa pactada y se acreditan a tu cuenta al corte mensual o al finalizar la meta establecida.',
  },

  // --- INVERSIONES ---
  {
    id: 'inv-1',
    category: 'inversion',
    question: '¿Puedo retirar mi inversión antes de que venza el plazo contratado?',
    answer: 'No. Las inversiones a plazo fijo son acuerdos donde el capital permanece invertido durante todo el plazo elegido a cambio de una tasa de rendimiento preferencial garantizada. El dinero y los intereses se liberan puntualmente al cumplirse la fecha de vencimiento.',
  },
  {
    id: 'inv-2',
    category: 'inversion',
    question: '¿Cómo funciona la auto-reinversión de mis inversiones?',
    answer: 'Al crear tu inversión o durante su vigencia puedes activar o desactivar la casilla de auto-reinversión. Si está activa, al vencer el plazo tu capital (o capital más ganancias) se renovará automáticamente por un ciclo idéntico para generar interés compuesto.',
  },
  {
    id: 'inv-3',
    category: 'inversion',
    question: '¿El rendimiento de mi inversión es fijo o puede variar con la inflación?',
    answer: 'La tasa pactada al momento de confirmar tu inversión queda formalmente garantizada durante toda la vigencia de tu póliza, sin importar variaciones externas del mercado.',
  },
  {
    id: 'inv-4',
    category: 'inversion',
    question: '¿Puedo pagar una nueva inversión usando mi Saldo Disponible acumulado?',
    answer: 'Sí. Al configurar tu inversión puedes seleccionar pagar con tu Saldo Disponible, evitando transferencias bancarias intermedias y optimizando tu capital.',
  },
  {
    id: 'inv-5',
    category: 'inversion',
    question: '¿Qué opciones tengo al cumplirse la fecha de vencimiento de mi inversión?',
    answer: 'Al vencer el plazo puedes transferir tus recursos hacia tu cuenta bancaria personal vía SPEI, pasarlos a tu Saldo Disponible para utilizarlos libremente, o reinvertirlos para continuar generando ganancias.',
  },

  // --- SALDOS Y RETIROS ---
  {
    id: 'sal-1',
    category: 'saldos',
    question: '¿Cuál es la diferencia entre Saldo Disponible y Saldo Colocado?',
    answer: 'El Saldo Disponible es dinero 100% líquido que puedes transferir a tu cuenta bancaria de inmediato o usar para abrir nuevas inversiones. El Saldo Colocado es el capital que está trabajando dentro de planes activos generando rendimientos día con día.',
  },
  {
    id: 'sal-2',
    category: 'saldos',
    question: '¿Cómo retiro dinero de mi Saldo Disponible a mi cuenta bancaria?',
    answer: 'En tu pantalla de Inicio o Perfil, da clic en "Solicitar Retiro", escribe el monto deseado y confirma con tu NIP de 4 dígitos. El sistema generará la orden de transferencia interbancaria hacia tu cuenta CLABE registrada.',
  },
  {
    id: 'sal-3',
    category: 'saldos',
    question: '¿Cuánto tiempo tarda en reflejarse un retiro en mi cuenta bancaria?',
    answer: 'Las solicitudes de retiro se procesan y validan por el área administrativa en un lapso habitual de 24 a 48 horas hábiles bancarias antes de emitir la dispersión vía SPEI.',
  },
  {
    id: 'sal-4',
    category: 'saldos',
    question: '¿Qué es el Kardex y cómo descargo mi estado de cuenta?',
    answer: 'El Kardex es el registro contable detallado de cada abono, cargo, rendimiento o retiro en tu cuenta. Puedes consultarlo en el botón "Movimientos" del Inicio o descargar estados de cuenta específicos por plan en formato PDF.',
  },
  {
    id: 'sal-5',
    category: 'saldos',
    question: '¿Por qué mi depósito por transferencia bancaria no se reflejó de inmediato?',
    answer: 'Al transferir vía SPEI y subir tu comprobante, la solicitud entra en estatus "En Revisión" mientras tesorería concilia los fondos en la cuenta de la caja. Una vez verificado, pasa a "Acreditado" y se refleja en tu saldo disponible.',
  },
  {
    id: 'sal-6',
    category: 'saldos',
    question: '¿Qué formato de archivo puedo subir como comprobante de depósito y qué peso máximo permite?',
    answer: 'Puedes adjuntar archivos de imagen (PNG, JPG, JPEG) o documentos PDF emitidos por la aplicación de tu banco, con un tamaño máximo permitido de 15 MB.',
  },
  {
    id: 'sal-7',
    category: 'saldos',
    question: '¿Qué sucede si olvidé colocar la referencia sugerida al transferir mi depósito?',
    answer: 'No hay inconveniente. Al adjuntar tu comprobante bancario en la plataforma, el área de caja coteja la clave de rastreo, la hora y el monto exacto para acreditarlo manualmente a tu cuenta.',
  },

  // --- SEGURIDAD Y NIP ---
  {
    id: 'seg-1',
    category: 'seguridad',
    question: '¿Para qué sirve mi NIP de 4 dígitos y en qué momentos me lo solicitarán?',
    answer: 'El NIP es tu firma electrónica secreta para autorizaciones críticas: (1) Solicitar retiros de dinero hacia tu cuenta bancaria personal, y (2) Autorizar formalmente el respaldo como aval de un compañero de trabajo.',
  },
  {
    id: 'seg-2',
    category: 'seguridad',
    question: '¿Qué hago si olvido mi NIP de 4 dígitos?',
    answer: 'Ingresa a tu módulo de Perfil y elige la opción "Configurar / Restablecer NIP". El sistema solicitará tu contraseña de inicio de sesión para verificar tu identidad y te permitirá definir un nuevo código de 4 números al instante.',
  },
  {
    id: 'seg-3',
    category: 'seguridad',
    question: '¿Por qué se cierra la sesión tras 10 minutos de inactividad?',
    answer: 'Es una medida de seguridad obligatoria para proteger tu privacidad y tu patrimonio. Si dejas tu equipo o teléfono desatendido en el trabajo, evitamos que terceras personas puedan visualizar tus saldos o efectuar operaciones en tu cuenta.',
  },
  {
    id: 'seg-4',
    category: 'seguridad',
    question: '¿Por qué mi cuenta CLABE para retiros debe coincidir obligatoriamente con mi nombre?',
    answer: 'Por estrictas normas de seguridad y prevención de fraudes, la caja de ahorro únicamente transfiere recursos a cuentas bancarias verificadas a nombre y RFC del colaborador titular registrado.',
  },
  {
    id: 'seg-5',
    category: 'seguridad',
    question: '¿Dónde registro a mis beneficiarios y qué pasa con mis recursos en caso fortuito?',
    answer: 'En la sección de Perfil puedes registrar y actualizar a tus beneficiarios designando los porcentajes correspondientes (que sumen 100%). En caso fortuito, la caja entrega los fondos acumulados a las personas designadas conforme a la ley.',
  },
];

export default function FaqPage() {
  const pageRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({});

  useGrowcapPageMotion(pageRef);

  const toggleItem = (id) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="page faq-page motion-page" ref={pageRef} style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Header / Hero */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          <HelpCircle size={15} />
          <span>Centro de Ayuda y Soporte</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>
          Preguntas Frecuentes
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.96rem', margin: 0, lineHeight: 1.5 }}>
          Respuestas claras sobre descuentos de nómina, convenios de empresa, avales, bajas y reglas de operación.
        </p>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Busca por palabra clave: finiquito, renuncia, incapacidad, aval, 30%..."
          style={{
            width: '100%',
            height: '46px',
            padding: '0 44px 0 46px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '0.92rem',
            color: '#0f172a',
            outline: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Limpiar búsqueda"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px', scrollbarWidth: 'none' }}>
        {FAQ_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: isSelected ? '#2563eb' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.2)' : 'none',
              }}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Results Count */}
      <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Mostrando <strong>{filteredItems.length}</strong> preguntas</span>
        <a 
          href="/manual-usuario.html" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <FileText size={14} />
          <span>Manual de Usuario</span>
          <ExternalLink size={13} style={{ opacity: 0.8 }} />
        </a>
      </div>

      {/* Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <HelpCircle size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1rem', color: '#0f172a', margin: '0 0 6px 0' }}>No encontramos coincidencias</h3>
            <p style={{ fontSize: '0.86rem', margin: 0 }}>Intenta con otro término de búsqueda o selecciona otra categoría.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isOpen = Boolean(openItems[item.id] || searchQuery.trim().length > 1);
            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  border: isOpen ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: isOpen ? '0 4px 12px rgba(37,99,235,0.06)' : '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: isOpen ? '#1d4ed8' : '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ lineHeight: 1.4 }}>{item.question}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.25s ease',
                      color: isOpen ? '#2563eb' : '#94a3b8',
                      flexShrink: 0,
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 18px 20px', color: '#334155', fontSize: '0.88rem', lineHeight: 1.6, borderTop: '1px solid #f1f5f9', paddingTop: '12px', background: '#fafbfc' }}>
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
