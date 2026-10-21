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

  updateExpense: async (id, expenseData) => {
    const response = await apiClient.put(`/transactions/expenses/${id}/`, expenseData);
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

  updateIncome: async (id, incomeData) => {
    const response = await apiClient.put(`/transactions/income/${id}/`, incomeData);
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

  updateBudget: async (id, budgetData) => {
    const response = await apiClient.put(`/transactions/budgets/${id}/`, budgetData);
    return response.data;
  },

  deleteBudget: async (id) => {
    const response = await apiClient.delete(`/transactions/budgets/${id}/`);
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

  updateGoal: async (id, goalData) => {
    const response = await apiClient.put(`/transactions/goals/${id}/`, goalData);
    return response.data;
  },

  deleteGoal: async (id) => {
    const response = await apiClient.delete(`/transactions/goals/${id}/`);
    return response.data;
  },

  contributeToGoal: async (goalId, contributionData) => {
    const response = await apiClient.post(`/transactions/goals/${goalId}/contribute/`, contributionData);
    return response.data;
  },
};

export default financeService;
