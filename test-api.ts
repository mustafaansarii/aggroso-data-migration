const API_URL = 'http://localhost:3000/api';

async function fetchApi(path: string, options: any = {}) {
  const url = API_URL + path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
}

async function runTests() {
  console.log('--- Testing Backend APIs ---\\n');

  try {
    // 1. GET /api/dataset
    console.log('1. GET /api/dataset');
    const dataset = await fetchApi('/dataset');
    console.log('✅ Dataset fetched, targetSchema fields:', dataset.targetSchema.length);

    // 2. POST /api/agent/propose
    console.log('\\n2. POST /api/agent/propose (Testing Groq LLM)');
    const proposeRes = await fetchApi('/agent/propose', { method: 'POST' });
    const proposal = proposeRes.proposal;
    console.log('✅ Agent generated proposal mappings:', proposal.mappings.length);

    // 3. POST /api/plans
    console.log('\\n3. POST /api/plans (Draft)');
    const planDraftRes = await fetchApi('/plans', { method: 'POST', body: JSON.stringify({ mappings: proposal.mappings }) });
    console.log('✅ Plan draft saved, id:', planDraftRes.id, 'status:', planDraftRes.status);

    // 4. POST /api/runs/dry-run
    console.log('\\n4. POST /api/runs/dry-run');
    const dryRunRes = await fetchApi('/runs/dry-run', { method: 'POST', body: JSON.stringify({ mappings: proposal.mappings }) });
    console.log('✅ Dry run complete. Accepted:', dryRunRes.accepted_count, 'Rejected:', dryRunRes.rejected_count);

    // 5. POST /api/plans (Approve)
    console.log('\\n5. POST /api/plans (Approve)');
    const planApproveRes = await fetchApi('/plans', { method: 'POST', body: JSON.stringify({ mappings: proposal.mappings, approver: 'Test User' }) });
    const approvedPlanId = planApproveRes.id;
    console.log('✅ Plan approved, id:', approvedPlanId, 'status:', planApproveRes.status);

    // 6. POST /api/runs/execute
    console.log('\\n6. POST /api/runs/execute');
    const execRes = await fetchApi('/runs/execute', { method: 'POST', body: JSON.stringify({ plan_id: approvedPlanId }) });
    const runId = execRes.runId;
    console.log('✅ Execution complete. RunID:', runId, 'Accepted:', execRes.accepted, 'Skipped (Idempotency):', execRes.skipped);

    // 7. GET /api/history
    console.log('\\n7. GET /api/history');
    const historyRes = await fetchApi('/history');
    console.log('✅ History fetched. Total runs:', historyRes.length, 'Last run status:', historyRes[0].status);

    // 8. POST /api/runs/rollback
    console.log('\\n8. POST /api/runs/rollback');
    const rollbackRes = await fetchApi('/runs/rollback', { method: 'POST', body: JSON.stringify({ run_id: runId }) });
    console.log('✅ Rollback complete. Deleted accounts:', rollbackRes.deleted);

    console.log('\\n🎉 All APIs successfully tested!');
  } catch (error: any) {
    console.error('\\n❌ API Test Failed:', error.message);
  }
}

runTests();
