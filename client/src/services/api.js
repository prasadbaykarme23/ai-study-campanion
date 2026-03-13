import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;
const API_BASE = API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const requestUrl = String(config.url || '');
  const isPublicAuthRequest = requestUrl.startsWith('/auth/register') || requestUrl.startsWith('/auth/login');

  if (isPublicAuthRequest) {
    // Ensure stale tokens do not affect public auth endpoints.
    delete config.headers.Authorization;
    return config;
  }

  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  firebaseGoogleLogin: (payload) => api.post('/auth/firebase/google', payload),
  firebaseLogin: (payload) => api.post('/auth/firebase/login', payload),
  getProfile: () => api.get('/user/profile'),
  getGoogleLoginUrl: () => `${API_ORIGIN}/api/auth/google`,
  getGitHubLoginUrl: () => `${API_ORIGIN}/api/auth/github`,
};

export const materialService = {
  uploadMaterial: (formData) => {
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
    };
    // Token will be added by the interceptor, we just need to ensure it doesn't override
    return api.post('/materials/upload', formData, config);
  },
  getMaterials: () => api.get('/materials'),
  getMaterialById: (id) => api.get(`/materials/${id}`),
  deleteMaterial: (id) => api.delete(`/materials/${id}`),
};

export const summaryService = {
  uploadFile: (formData) =>
    api.post('/summary/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const quizService = {
  createQuiz: (materialId, difficulty) =>
    api.post('/quiz/create', { materialId, difficulty }),
  getQuiz: (id) => api.get(`/quiz/${id}`),
  submitQuiz: (quizId, answers) => api.post('/quiz/submit', { quizId, answers }),
  getResults: () => api.get('/quiz/results/all'),
};

export const qaService = {
  askQuestion: (materialId, question, mode = 'material') =>
    api.post('/qa/ask', {
      question,
      mode,
      ...(materialId ? { materialId } : {}),
    }),
};

export const questionService = {
  add: (text) => api.post('/questions', { text }),
  list: () => api.get('/questions'),
  remove: (id) => api.delete(`/questions/${id}`),
};

export const flashcardService = {
  create: (front, back) => api.post('/flashcards', { front, back }),
  list: () => api.get('/flashcards'),
  remove: (id) => api.delete(`/flashcards/${id}`),
};

export const studySubjectService = {
  list: () => api.get('/study-subjects'),
  add: (title) => api.post('/study-subjects', { title }),
  remove: (id) => api.delete(`/study-subjects/${id}`),
};

export default api;
