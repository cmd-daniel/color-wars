# Color Wars Frontend

This package contains the Vite + React client for Color Wars. The client is served by the backend in production, but it can also be run separately for local development.

## Environment configuration

Environment variables follow Vite's conventions (`VITE_*`). The client determines the backend endpoint based on the active mode:

- **Production build** &ndash; the bundle is served by the backend and always calls back to the same origin that delivered it. No environment variables are required.
- **Vite development mode** &ndash; set `VITE_API_BASE_URL` so the client knows which backend to contact (for example `http://localhost:2567` or a remote staging server).

| Variable | Purpose | Required |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Backend origin used for HTTP and WebSocket requests while running `npm run dev --prefix client`. | Yes (development mode only) |

### File layout

- `client/.env.development.example` &ndash; template for supplying `VITE_API_BASE_URL` during local development.
- `client/.env.local` / `client/.env.development.local` &ndash; ignored by git; copy the example file here with your backend URL.

Copy `.env.development.example` to `.env.local` (or `.env.development.local`) and adjust the value before running the client Dev Server.

## Common workflows

### Local server + local client (default)

```bash
npm run dev --prefix server
npm run dev --prefix client
```

Set `VITE_API_BASE_URL` to the address where the backend is running (e.g. `http://localhost:2567`) before starting the client Dev Server, or place it in `client/.env.local`.

### Local client against remote server

```bash
VITE_API_BASE_URL="https://staging.color-wars.example" npm run dev --prefix client
```

or save the value in `client/.env.local`.

### Production build served by backend

```bash
# from repository root
npm run build --prefix client
npm run build --prefix server # if applicable
npm start --prefix server
```

The server reads `CLIENT_BUILD_PATH` from `server/.env` (defaults to `../client/dist`) and serves the built assets at `/`. The bundled client automatically communicates with the same origin that served it—no additional configuration is necessary.
