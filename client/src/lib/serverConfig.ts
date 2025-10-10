const normalize = (value?: string | null) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const resolveHttpEndpoint = () => {
  if (import.meta.env.DEV) {
    const fromEnv = normalize(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (!fromEnv) {
      throw new Error('VITE_API_BASE_URL must be set when running the client in development mode.');
    }
    return stripTrailingSlashes(fromEnv);
  }

  if (typeof window !== 'undefined') {
    return stripTrailingSlashes(window.location.origin);
  }

  if (typeof globalThis.location !== 'undefined') {
    const { protocol, hostname, port } = globalThis.location as Location;
    const portSuffix = port ? `:${port}` : '';
    return stripTrailingSlashes(`${protocol}//${hostname}${portSuffix}`);
  }

  throw new Error('Unable to determine API endpoint for production build.');
};

const httpEndpoint = resolveHttpEndpoint();

const resolveWsEndpoint = (httpUrl: string) => {
  try {
    const url = new URL(httpUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.toString();
  } catch {
    return httpUrl.replace(/^http/, 'ws');
  }
};

export const getHttpEndpoint = () => httpEndpoint;
export const getWsEndpoint = () => resolveWsEndpoint(httpEndpoint);
