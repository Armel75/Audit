const originalFetch = window.fetch;
const API_BASE = import.meta.env.VITE_API_URL;

let refreshPromise: Promise<string | null> | null = null;

const handleLogout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  window.location.href = '/audit/login';
};

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (url.startsWith(`${API_BASE}/`) && !url.startsWith(`${API_BASE}/auth/`)) {
    const token = localStorage.getItem('accessToken');

    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const options: RequestInit = {
      ...init,
      headers,
      credentials: 'include',
    };

    let response = await originalFetch(input, options);

    // 🔴 CAS TOKEN EXPIRE
    if (response.status === 401) {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshResponse = await originalFetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });

            if (!refreshResponse.ok) {
              return null;
            }

            const data = await refreshResponse.json();
            localStorage.setItem('accessToken', data.accessToken);

            return data.accessToken;
          } catch {
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;

      // 🔴 Si refresh échoue → logout
      if (!newToken) {
        handleLogout();
        return response;
      }

      // 🔁 Retry avec nouveau token (sécurisé)
      const retryResponse = await originalFetch(input, {
        ...options,
        headers: new Headers({
          ...Object.fromEntries(headers.entries()),
          Authorization: `Bearer ${newToken}`,
        }),
        credentials: 'include',
      });

      // 🔴 Si même après refresh → toujours 401 → logout
      if (retryResponse.status === 401) {
        handleLogout();
      }

      return retryResponse;
    }

    // 🔴 403 → ne pas logout (gestion côté UI)
    if (response.status === 403) {
      return response;
    }

    return response;
  }

  return originalFetch(input, init);
};