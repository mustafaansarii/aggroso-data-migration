import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHistory, rollbackRun } from '../api';
import { RotateCcw } from 'lucide-react';

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const { data: runs, isLoading } = useQuery({ queryKey: ['history'], queryFn: getHistory });
  
  const rollbackMutation = useMutation({
    mutationFn: rollbackRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    }
  });

  if (isLoading) return <div>Loading history...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Migration History</h2>
      
      <div className="bg-white rounded border shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Run ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {runs?.map((run: any) => (
              <tr key={run.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{run.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">v{run.plan_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{run.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full \${
                    run.status === 'success' ? 'bg-green-100 text-green-800' :
                    run.status === 'rolled_back' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {run.accepted_count} acc / {run.rejected_count} rej / {run.skipped_duplicates || 0} skip
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(run.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {run.type === 'execute' && run.status === 'success' && (
                    <button 
                      onClick={() => rollbackMutation.mutate(run.id)}
                      disabled={rollbackMutation.isPending}
                      className="text-red-600 hover:text-red-900 flex items-center justify-end space-x-1 ml-auto"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Rollback</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {runs?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">No runs found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
