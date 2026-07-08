# Loan Request Contract Fix Design

## Root cause
The React client always serializes loan requests as multipart data. The Render Express route does not attach multipart middleware to `/prestamos`, so `req.body` is empty and `id_activo` fails Zod coercion. The API returns validation fields under `details`, while the frontend only reads `errors`. The local frontend URL still points to the retired Laravel domain.

## Design
Send JSON for code-based guarantor requests and multipart only when the payload contains files. Convert `id_activo` and `cantidad` to numbers before submission. Normalize both `errors` and `details` into the same field-error structure. Point the frontend environment to the Render API. No unrelated loan rules or UI flow change.

## Verification
Node unit tests cover request serialization and Render validation details. Vite lint/build must pass. A controlled request with plan 1, amount 2000 and code CAGO3086 must return 201 from Render and then be deleted.
