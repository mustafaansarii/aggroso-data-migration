
type StatCardProps = {
  value: number;
  label: string;
  colorType?: 'default' | 'success' | 'error' | 'warning';
};

export function StatCard({ value, label, colorType = 'default' }: StatCardProps) {
  const colorMap = {
    default: { bg: 'bg-gray-50', text: 'text-gray-900', label: 'text-gray-500' },
    success: { bg: 'bg-green-50', text: 'text-green-600', label: 'text-green-600' },
    error: { bg: 'bg-red-50', text: 'text-red-600', label: 'text-red-600' },
    warning: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'text-yellow-600' },
  };

  const colors = colorMap[colorType];

  return (
    <div className={`p-3 rounded ${colors.bg}`}>
      <div className={`text-2xl font-bold ${colors.text}`}>{value}</div>
      <div className={`text-xs uppercase ${colors.label}`}>{label}</div>
    </div>
  );
}
