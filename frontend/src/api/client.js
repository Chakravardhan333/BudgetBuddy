import axios from 'axios';

const getApiBaseUrl = () => {
  // 1. If explicitly configured via Vite environment variable, use that
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    let url = envUrl.trim().replace(/\/+$/, '');
    if (!url.endsWith('/api')) {
      url = `${url}/api`;
    }
    return url;
  }

  // 2. Detect runtime hostname: If accessing from local development, target local Django server
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '0.0.0.0' ||
     window.location.hostname.startsWith('192.168.') ||
     window.location.hostname.startsWith('10.') ||
     window.location.hostname.endsWith('.local') ||
     window.location.port === '5173' ||
     window.location.port === '3000' ||
     window.location.port === '5174');

  if (isLocalhost) {
    const host = (window.location.hostname === '0.0.0.0' || !window.location.hostname) ? '127.0.0.1' : window.location.hostname;
    return `http://${host}:8000/api`;
  }

  // 3. Deployed production fallback (e.g. Vercel domain) targets verified Render backend
  return 'https://budgetbuddy-zg6o.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 75000, // 75 seconds to comfortably accommodate Render free-tier cold starts (~45-60s)
});

// Request interceptor: Attach JWT token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('budgetbuddy_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Automatic token refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/accounts/login/') &&
      !originalRequest.url.includes('/accounts/register/') &&
      !originalRequest.url.includes('/accounts/token/refresh/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('budgetbuddy_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        localStorage.setItem('budgetbuddy_access_token', newAccessToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('budgetbuddy_access_token');
        localStorage.removeItem('budgetbuddy_refresh_token');
        localStorage.removeItem('budgetbuddy_user');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Health check API with automatic retry & exponential backoff for Render cold starts
export const checkApiHealth = async (retries = 2, initialDelayMs = 2000) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await apiClient.get('/health/', { timeout: 35000 });
      return { success: true, data: response.data };
    } catch (err) {
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, initialDelayMs * Math.pow(2, attempt)));
      } else {
        return { success: false, error: err };
      }
    }
  }
};

// Singleton prewarm ping to wake up Render container when user lands on public/auth pages
let prewarmPromise = null;
export const prewarmBackend = () => {
  if (!prewarmPromise) {
    prewarmPromise = apiClient.get('/health/', { timeout: 75000 })
      .then((res) => ({ success: true, data: res.data }))
      .catch((err) => ({ success: false, error: err }));
  }
  return prewarmPromise;
};

// Accounts API Services
export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post('/accounts/login/', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/accounts/register/', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/accounts/profile/');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.put('/accounts/profile/', profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await apiClient.post('/accounts/change-password/', passwordData);
    return response.data;
  },

  requestPasswordReset: async (email) => {
    const response = await apiClient.post('/accounts/password-reset/request/', { email });
    return response.data;
  },

  confirmPasswordReset: async (data) => {
    const response = await apiClient.post('/accounts/password-reset/confirm/', data);
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('budgetbuddy_refresh_token');
    try {
      if (refreshToken) {
        await apiClient.post('/accounts/logout/', { refresh: refreshToken });
      }
    } catch {
      // Ignored: Token clear proceeds regardless
    } finally {
      localStorage.removeItem('budgetbuddy_access_token');
      localStorage.removeItem('budgetbuddy_refresh_token');
      localStorage.removeItem('budgetbuddy_user');
    }
  },
};

export default apiClient;
