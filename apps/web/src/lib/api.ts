const originalFetch = window.fetch;

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

  if (url.startsWith('/api/v1/') && !url.startsWith('/api/v1/auth/')) {
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
      // 👉 Si aucun refresh en cours → on lance
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshResponse = await originalFetch('/api/v1/auth/refresh', {
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

      // 👉 Toutes les requêtes attendent ici
      const newToken = await refreshPromise;

      // 🔴 Si refresh échoue → logout
      if (!newToken) {
        handleLogout();
        return response;
      }

      // 🔁 Retry avec nouveau token
      headers.set('Authorization', `Bearer ${newToken}`);

      return originalFetch(input, {
        ...options,
        headers,
        credentials: 'include',
      });
    }

    // 🔴 Sécurité (si backend renvoie encore 403)
    if (response.status === 403) {
      handleLogout();
    }

    return response;
  }

  return originalFetch(input, init);
};