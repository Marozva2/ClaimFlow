# ClaimFlow frontend

The frontend is a Next.js App Router client for the versioned Flask REST API. It never accesses PostgreSQL directly. Set `NEXT_PUBLIC_API_URL` to the API origin (defaults to `http://127.0.0.1:5000`) when the API is hosted elsewhere. Google sign-in is displayed only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is configured; the API must also have its matching `GOOGLE_CLIENT_ID`.

## Available workflows

- Customers: session-based sign-in, policy list/details, claim search and filters, guided claim submission, and claim progress/activity.
- Claims officers: operations overview, paginated claims queue, assessments, and explicit claim lifecycle actions.
- Administrators: global claims and policy visibility, plus read-only paginated user and audit activity views.

The app keeps JWTs in browser `sessionStorage` for the current tab session. Authentication is coordinated by `lib/auth.tsx`; API serialization, error normalization, and expired-session handling are centralized in `lib/api.ts`. Hiding a route or action is a usability choice only; API authorization is authoritative.

## Local checks

```bash
npm ci
npm run lint
npm run build
```

Supporting-document upload, customer responses to information requests, Google Identity Services, user role/account changes, and system health details are not implemented because there is no corresponding complete frontend/API contract yet. The UI does not fabricate those actions.
