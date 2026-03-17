// api.ts
const originalFetch = window.fetch;

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  // Only intercept /api/ calls, but skip auth routes to avoid infinite loops
  if (url.startsWith('/api/') && !url.startsWith('/api/auth/')) {
    let token = localStorage.getItem('accessToken');
    
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const options = { ...init, headers };
    let response = await originalFetch(input, options);

    if (response.status === 401) {
      try {
        const refreshResponse = await originalFetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem('accessToken', data.accessToken);
          
          // Retry the original request
          headers.set('Authorization', `Bearer ${data.accessToken}`);
          response = await originalFetch(input, { ...options, headers });
        } else {
          // Refresh failed, logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return response;
  }

  return originalFetch(input, init);
};
