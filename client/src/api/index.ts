import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
});

export const getDataset = () => api.get('/dataset').then((res: any) => res.data);
export const proposePlan = () => api.post('/agent/propose').then((res: any) => res.data);
export const savePlan = (mappings: any, approver?: string) => api.post('/plans', { mappings, approver }).then((res: any) => res.data);
export const getPlans = () => api.get('/plans').then((res: any) => res.data);
export const dryRun = (mappings: any) => api.post('/runs/dry-run', { mappings }).then((res: any) => res.data);
export const executeRun = (plan_id: number) => api.post('/runs/execute', { plan_id }).then((res: any) => res.data);
export const rollbackRun = (run_id: number) => api.post('/runs/rollback', { run_id }).then((res: any) => res.data);
export const getHistory = () => api.get('/history').then((res: any) => res.data);
