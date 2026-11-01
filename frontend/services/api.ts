const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    let url: string;
    if (endpoint.startsWith('http')) {
      url = endpoint;
    } else {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      // In the browser, prefer same-origin relative path /api to leverage Next.js rewrite proxy (prevents CORS & host resolution issues)
      if (typeof window !== 'undefined') {
        url = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
      } else {
        url = `${API_BASE_URL}${cleanEndpoint}`;
      }
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return { data: null, error: json?.error || `Request failed with status ${res.status}` };
    }

    return { data: json, error: null };
  } catch (err: any) {
    // If relative path fails in browser, fallback attempt to direct API_BASE_URL
    if (typeof window !== 'undefined' && !endpoint.startsWith('http')) {
      try {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const fallbackUrl = `${API_BASE_URL}${cleanEndpoint}`;
        const fallbackRes = await fetch(fallbackUrl, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        });
        const fallbackJson = await fallbackRes.json().catch(() => null);
        if (!fallbackRes.ok) {
          return { data: null, error: fallbackJson?.error || `Request failed with status ${fallbackRes.status}` };
        }
        return { data: fallbackJson, error: null };
      } catch (fallbackErr: any) {
        return { data: null, error: fallbackErr.message || 'Network error' };
      }
    }

    return { data: null, error: err.message || 'Network error' };
  }
}

