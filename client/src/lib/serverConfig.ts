const isLocalhost = (h: string) =>
  h === "localhost" ||
  h === "127.0.0.1" ||
  h === "::1" ||
  h.startsWith("127.");

const httpEndpoint = (() => {
  if (import.meta.env.DEV) {
    const { protocol, hostname } = window.location;

    if (isLocalhost(hostname)) {
      return `${protocol}//${hostname}:${import.meta.env.VITE_SERVER_PORT}`;
    }

    return `${import.meta.env.VITE_SERVER_URL}:${import.meta.env.VITE_SERVER_PORT}`;
  }

  return window.location.origin;
})();

const wsEndpoint = httpEndpoint.replace(/^http/, "ws");
console.log(wsEndpoint)
console.log(import.meta.env.VITE_SERVER_URL)
export { httpEndpoint, wsEndpoint };
