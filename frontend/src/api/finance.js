import apiClient from './client';

export const financeService = {
  // Dashboard Metrics
  getDashboardSummary: async () => {
    const response = await apiClient.get('/transactions/dashboard-summary/');
    return response.data;
  },

  // Expenses CRUD
  getExpenses: async (params = {}) => {
    const response = await apiClient.get('/transactions/expenses/', { params });
    return response.data;
  },

  createExpense: async (expenseData) => {
    const response = await apiClient.post('/transactions/expenses/', expenseData);
    return response.data;
  },

  deleteExpense: async (id) => {
    const response = await apiClient.delete(`/transactions/expenses/${id}/`);
    return response.data;
  },

  // Income CRUD
  getIncome: async (params = {}) => {
    const response = await apiClient.get('/transactions/income/', { params });
    return response.data;
  },

  createIncome: async (incomeData) => {
    const response = await apiClient.post('/transactions/income/', incomeData);
    return response.data;
  },

  deleteIncome: async (id) => {
    const response = await apiClient.delete(`/transactions/income/${id}/`);
    return response.data;
  },

  // Budgets CRUD
  getBudgets: async (params = {}) => {
    const response = await apiClient.get('/transactions/budgets/', { params });
    return response.data;
  },

  createBudget: async (budgetData) => {
    const response = await apiClient.post('/transactions/budgets/', budgetData);
    return response.data;
  },

  // Savings Goals CRUD
  getGoals: async () => {
    const response = await apiClient.get('/transactions/goals/');
    return response.data;
  },

  createGoal: async (goalData) => {
    const response = await apiClient.post('/transactions/goals/', goalData);
    return response.data;
  },

  contributeToGoal: async (goalId, contributionData) => {
    const response = await apiClient.post(`/transactions/goals/${goalId}/contribute/`, contributionData);
    return response.data;
  },
};

export default financeService;
