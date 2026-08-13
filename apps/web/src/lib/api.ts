import axios from 'axios';

const api = axios.create({
  baseURL: "/api/campagne",
  withCredentials: true, // indispensable pour recevoir/envoyer le refresh cookie
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Très important :
  // si on envoie du FormData, il ne faut PAS forcer Content-Type.
  // Le navigateur/axios mettra automatiquement multipart/form-data avec boundary.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

let isRefreshing = false;
let pending: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  pending.forEach((cb) => cb(token));
  pending = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as any;

    if (original?.url?.includes('/auth/refresh')) {
      localStorage.removeItem('accessToken');
      delete api.defaults.headers.common.Authorization;
      window.location.href = `${import.meta.env.BASE_URL}login`;
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          pending.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;

      try {
        const resp = await api.post('/auth/refresh');
        const newToken = resp.data.accessToken;

        localStorage.setItem('accessToken', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        onRefreshed(newToken);

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        localStorage.removeItem('accessToken');
        delete api.defaults.headers.common.Authorization;
        window.location.href = `${import.meta.env.BASE_URL}login`;
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;