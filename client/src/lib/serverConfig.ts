const DEFAULT_HTTP_ENDPOINT = 'http://localhost:2567';

const resolveHttpEndpoint = () => {
  const fromEnv = import.meta.env.VITE_SERVER_HTTP_ENDPOINT as string | undefined;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const inferredProtocol = protocol === 'https:' ? 'https:' : 'http:';
    const port = (import.meta.env.VITE_SERVER_PORT as string | undefined) ?? '2567';
    return `${inferredProtocol}//${hostname}:${port}`;
  }

  return DEFAULT_HTTP_ENDPOINT;
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
