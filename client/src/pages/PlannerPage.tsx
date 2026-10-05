import { useState } from 'react';
import { Bot, Play, Check } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { proposePlan, savePlan, dryRun, executeRun } from '../api';

export default function PlannerPage() {
  const [proposal, setProposal] = useState<any>(null);
  const [trace, setTrace] = useState<any[]>([]);
  const [currentMappings, setCurrentMappings] = useState<any[]>([]);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [approvedPlanId, setApprovedPlanId] = useState<number | null>(null);

  const proposeMutation = useMutation({
    mutationFn: proposePlan,
    onSuccess: (data: any) => {
      setProposal(data.proposal);
      setTrace(data.trace);
      setCurrentMappings(data.proposal.mappings);
    }
  });

  const dryRunMutation = useMutation({
    mutationFn: (mappings) => dryRun(mappings),
    onSuccess: (data: any) => setDryRunResult(data)
  });

  const approveMutation = useMutation({
    mutationFn: () => savePlan(currentMappings, 'Alice Approver'), // Hardcoded approver for demo
    onSuccess: (data: any) => setApprovedPlanId(data.id)
  });

  const executeMutation = useMutation({
    mutationFn: () => executeRun(approvedPlanId!),
    onSuccess: (data: any) => setExecutionResult(data)
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Migration Planner</h2>
        <button 
          onClick={() => proposeMutation.mutate()} 
          disabled={proposeMutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-blue-700 disabled:opacity-50"
        >
          <Bot className="w-4 h-4" />
          <span>{proposeMutation.isPending ? 'Agent is working...' : 'Run Agent Proposal'}</span>
        </button>
      </div>

      {trace.length > 0 && (
        <div className="bg-gray-100 p-4 rounded text-xs font-mono max-h-48 overflow-y-auto">
          <h3 className="font-bold mb-2">Agent Trace</h3>
          {trace.map((t, i) => (
            <div key={i} className="mb-1">
              <span className="text-gray-500">[{t.type}]</span> {t.name}: {t.args}
            </div>
          ))}
        </div>
      )}

      {proposal && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-50 p-4 rounded border border-orange-200">
              <h3 className="font-bold text-orange-800 mb-2">Risks Identified</h3>
              <ul className="list-disc pl-5 text-sm text-orange-700">
                {proposal.risks?.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">Clarification Questions</h3>
              <ul className="list-disc pl-5 text-sm text-blue-700">
                {proposal.questions?.map((q: string, i: number) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          </div>

          <div className="bg-white rounded border shadow-sm p-4 space-y-4">
            <h3 className="font-bold text-lg">Field Mappings</h3>
            {currentMappings.map((mapping, idx) => (
              <div key={idx} className="border p-3 rounded flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
                <div className="w-1/3 font-medium text-gray-700">{mapping.targetField}</div>
                <div className="w-1/3 text-gray-500">{mapping.sourceField || '<No Source>'}</div>
                <div className="w-1/3">
                  <div className="text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap font-mono">
                    {JSON.stringify(mapping.rules, null, 2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-4">
            <button 
              onClick={() => dryRunMutation.mutate(currentMappings as any)} 
              disabled={dryRunMutation.isPending}
              className="bg-gray-800 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-gray-900"
            >
              <Play className="w-4 h-4" />
              <span>Dry Run</span>
            </button>
            <button 
              onClick={() => approveMutation.mutate()} 
              disabled={approveMutation.isPending || !!approvedPlanId}
              className="bg-green-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{approvedPlanId ? 'Plan Approved' : 'Approve Plan'}</span>
            </button>
          </div>
        </div>
      )}

      {dryRunResult && (
        <div className="bg-white p-4 rounded border">
          <h3 className="font-bold text-lg mb-2">Dry Run Results</h3>
          <div className="grid grid-cols-4 gap-4 mb-4 text-center">
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold">{dryRunResult.source_count}</div>
              <div className="text-xs text-gray-500 uppercase">Source</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{dryRunResult.accepted_count}</div>
              <div className="text-xs text-green-600 uppercase">Accepted</div>
            </div>
            <div className="p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{dryRunResult.rejected_count}</div>
              <div className="text-xs text-red-600 uppercase">Rejected</div>
            </div>
          </div>
          
          {dryRunResult.quarantine?.length > 0 && (
            <div>
              <h4 className="font-bold text-red-600 mb-2">Quarantine (Rejected Records)</h4>
              <div className="space-y-2">
                {dryRunResult.quarantine.map((q: any, i: number) => (
                  <div key={i} className="border border-red-200 bg-red-50 p-2 rounded text-sm">
                    <strong>{q.sourceKey}</strong>
                    <ul className="list-disc pl-5 mt-1 text-red-800">
                      {q.errors.map((e: any, j: number) => (
                        <li key={j}>Field '{e.field}' failed rule '{e.rule}': {e.message}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {approvedPlanId && (
        <div className="bg-green-50 p-4 border border-green-200 rounded flex justify-between items-center">
          <div>
            <h3 className="font-bold text-green-800">Ready for Execution</h3>
            <p className="text-sm text-green-600">Plan #{approvedPlanId} is approved and ready.</p>
          </div>
          <button 
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
          >
            Execute Migration
          </button>
        </div>
      )}

      {executionResult && (
        <div className="bg-white p-4 rounded border border-blue-200 shadow">
          <h3 className="font-bold text-lg mb-2">Execution Complete (Run #{executionResult.runId})</h3>
          <p>Accepted: {executionResult.accepted} | Rejected: {executionResult.rejected} | Skipped Duplicates: {executionResult.skipped}</p>
        </div>
      )}
    </div>
  );
}
