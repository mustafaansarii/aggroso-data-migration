import { useQuery } from '@tanstack/react-query';
import { getDataset } from '../api';

export default function DatasetPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dataset'], queryFn: getDataset });

  if (isLoading) return <div>Loading dataset...</div>;
  if (error) return <div>Error loading dataset</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Source Schema</h2>
        <div className="bg-white rounded border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.sourceSchema.map((field: any) => (
                <tr key={field.name}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-sm text-gray-900">{field.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.required ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{field.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Target Schema (Accounts)</h2>
        <div className="bg-white rounded border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.targetSchema.map((field: any) => (
                <tr key={field.name}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-sm text-gray-900">{field.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.required ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{field.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Sample Source Records</h2>
        <div className="bg-gray-900 rounded p-4 overflow-x-auto text-sm text-green-400 font-mono">
          <pre>{JSON.stringify(data.mockSourceRecords, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
