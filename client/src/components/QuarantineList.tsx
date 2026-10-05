
type QuarantineItem = {
  sourceKey: string;
  errors: { field: string; rule: string; message: string }[];
};

export function QuarantineList({ items }: { items: QuarantineItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h4 className="font-bold text-red-600 mb-2">Quarantine (Rejected Records)</h4>
      <div className="space-y-2">
        {items.map((q, i) => (
          <div key={i} className="border border-red-200 bg-red-50 p-2 rounded text-sm">
            <strong>{q.sourceKey}</strong>
            <ul className="list-disc pl-5 mt-1 text-red-800">
              {q.errors.map((e, j) => (
                <li key={j}>Field '{e.field}' failed rule '{e.rule}': {e.message}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
