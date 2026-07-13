export function parseStripeReturn(searchParams, idKey) {
  const status = String(
    searchParams.get('status')
      || searchParams.get('payment')
      || searchParams.get('stripe')
      || '',
  ).toLowerCase();
  const success = String(searchParams.get('success') || '').toLowerCase();
  const canceled = String(
    searchParams.get('canceled')
      || searchParams.get('cancelled')
      || '',
  ).toLowerCase();
  const entityId = searchParams.get(idKey);
  const sessionId = searchParams.get('session_id');
  const action = searchParams.get('action') || 'create';
  const isCanceled = status === 'cancel'
    || status === 'canceled'
    || canceled === 'true';
  const isSuccess = !isCanceled && (
    status === 'success'
      || status === 'succeeded'
      || success === 'true'
  );

  return {
    action,
    entityId,
    hasReturn: isSuccess || isCanceled,
    isCanceled,
    isSuccess,
    sessionId,
  };
}
