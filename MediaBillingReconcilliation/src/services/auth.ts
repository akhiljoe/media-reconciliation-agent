import axios from 'axios';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'mr_auth_token';
const USER_KEY = 'mr_auth_user';

export interface LoginResponse {
  token: string;
  username: string;
  expires_in: number;
}

export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  const response = await axios.post<LoginResponse>(
    `${API_BASE_URL}/auth/login`,
    { username, password }
  );
  sessionStorage.setItem(TOKEN_KEY, response.data.token);
  sessionStorage.setItem(USER_KEY, response.data.username);
  return response.data;
};

export const logout = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

export const getToken = (): string | null => sessionStorage.getItem(TOKEN_KEY);

export const getUser = (): string | null => sessionStorage.getItem(USER_KEY);

export const isAuthenticated = (): boolean => Boolean(getToken());

// Attach Bearer token to every axios request
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect to login on 401
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      logout();
      // Avoid redirect loop if we are already at login
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);
