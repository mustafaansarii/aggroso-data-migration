
type BadgeProps = {
  status: string;
};

export function Badge({ status }: BadgeProps) {
  const isSuccess = status === 'success';
  const isRolledBack = status === 'rolled_back';
  
  const bg = isSuccess ? 'bg-green-100' : isRolledBack ? 'bg-yellow-100' : 'bg-red-100';
  const text = isSuccess ? 'text-green-800' : isRolledBack ? 'text-yellow-800' : 'text-red-800';

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
      {status}
    </span>
  );
}
