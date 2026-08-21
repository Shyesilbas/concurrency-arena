const BASE_URL = 'http://localhost:8080/api/v1';

/**
 * Common API request helper
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const json = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    data: json?.data ?? null,
    message: json?.message ?? (response.ok ? 'Başarılı' : 'Hata'),
    errors: json?.errors ?? [],
    raw: json
  };
}

export const api = {
  // Concert APIs
  getConcert: (concertId = 1) => request(`/concerts/${concertId}`),
  resetConcert: (concertId = 1, capacity = 100) => 
    request(`/concerts/${concertId}/reset?capacity=${capacity}`, { method: 'POST' }),

  // User APIs
  loginUser: (email, username) => 
    request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, username })
    }),

  // Booking Execution
  bookTicket: (endpoint, payload) => 
    request(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
