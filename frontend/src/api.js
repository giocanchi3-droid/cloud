const BASE_URL = '/api/products';

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType =
    response.headers.get('content-type') || '';

  const data = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(
      data?.message || `Error HTTP ${response.status}`,
    );
  }

  return data;
}

export function getProducts(filters = {}) {
  const params = new URLSearchParams();

  if (filters.q?.trim()) {
    params.set('q', filters.q.trim());
  }

  if (filters.brand?.trim()) {
    params.set('brand', filters.brand.trim());
  }

  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }

  const query = params.toString();

  return request(
    `${BASE_URL}${query ? `?${query}` : ''}`,
  );
}

export function getStats() {
  return request(`${BASE_URL}/stats`);
}

export function createProduct(product) {
  return request(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export function updateProduct(id, product) {
  return request(`${BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
}

export function deleteProduct(id) {
  return request(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}