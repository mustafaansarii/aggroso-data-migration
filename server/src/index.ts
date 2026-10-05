import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { appDb, targetDb } from './data/db';
import { AgentService } from './services/agentService';
import { sourceSchema, targetSchema, mockSourceRecords } from './domain/schema';
import { transform, MigrationPlan } from './domain/transformEngine';

const app = express();
app.use(cors());
app.use(express.json());

// 1. Dataset APIs
app.get('/api/dataset', (req, res) => {
  res.json({ sourceSchema, targetSchema, mockSourceRecords });
});

// 2. Agent Proposal API
app.post('/api/agent/propose', async (req, res) => {
  try {
    const agent = new AgentService();
    const result = await agent.runAgent();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Plan Management APIs
app.post('/api/plans', (req, res) => {
  const { mappings, approver } = req.body;
  const mappingJson = JSON.stringify(mappings);
  
  // Find current max version
  const stmt = appDb.prepare('SELECT MAX(version) as v FROM migration_plans');
  const result: any = stmt.get();
  const nextVersion = (result.v || 0) + 1;

  const insert = appDb.prepare(`
    INSERT INTO migration_plans (version, status, mapping_json, approver, approved_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const status = approver ? 'approved' : 'draft';
  const approvedAt = approver ? new Date().toISOString() : null;

  const info = insert.run(nextVersion, status, mappingJson, approver, approvedAt);
  res.json({ id: info.lastInsertRowid, version: nextVersion, status });
});

app.get('/api/plans', (req, res) => {
  const plans = appDb.prepare('SELECT * FROM migration_plans ORDER BY version DESC').all();
  res.json(plans);
});

// 4. Execution APIs (Dry Run, Execute, Rollback)
app.post('/api/runs/dry-run', (req, res) => {
  const { mappings } = req.body;
  if (!mappings) return res.status(400).json({ error: 'Mappings required' });
  
  const plan: MigrationPlan = { version: 0, mappings };
  const result = transform(mockSourceRecords, plan);
  
  res.json({
    source_count: mockSourceRecords.length,
    accepted_count: result.accepted.length,
    rejected_count: result.rejected.length,
    quarantine: result.rejected
  });
});

app.post('/api/runs/execute', (req, res) => {
  const { plan_id } = req.body;
  const planRow: any = appDb.prepare(`SELECT * FROM migration_plans WHERE id = ? AND status = 'approved'`).get(plan_id);
  
  if (!planRow) {
    return res.status(400).json({ error: 'Plan not found or not approved' });
  }

  const plan: MigrationPlan = { version: planRow.version, mappings: JSON.parse(planRow.mapping_json) };
  const transformResult = transform(mockSourceRecords, plan);

  const runInfo = appDb.prepare(`
    INSERT INTO runs (plan_id, type, status, source_count, accepted_count, rejected_count, skipped_duplicates)
    VALUES (?, 'execute', 'success', ?, ?, ?, 0)
  `).run(plan_id, mockSourceRecords.length, transformResult.accepted.length, transformResult.rejected.length);

  const runId = runInfo.lastInsertRowid;
  let skipped = 0;

  // Insert to mock target (transaction)
  const insertAccount = targetDb.prepare(`
    INSERT INTO accounts (account_id, first_name, last_name, email, phone, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT DO NOTHING
  `);

  const insertLineage = targetDb.prepare(`
    INSERT INTO migration_lineage (record_key, account_id, run_id)
    VALUES (?, ?, ?)
    ON CONFLICT DO NOTHING
  `);

  targetDb.transaction(() => {
    for (const record of transformResult.accepted) {
      const info = insertAccount.run(
        record.account_id, record.first_name, record.last_name, 
        record.email, record.phone, record.status, record.created_at
      );
      if (info.changes === 0) {
        skipped++;
      } else {
        insertLineage.run(record._sourceKey, record.account_id, runId);
      }
    }
  })();

  // Update skipped count
  appDb.prepare('UPDATE runs SET skipped_duplicates = ? WHERE id = ?').run(skipped, runId);

  // Record quarantine
  const insertQuarantine = appDb.prepare('INSERT INTO quarantine (run_id, source_key, raw_record, errors) VALUES (?, ?, ?, ?)');
  appDb.transaction(() => {
    for (const rej of transformResult.rejected) {
      insertQuarantine.run(runId, rej.sourceKey, JSON.stringify(rej.rawRecord), JSON.stringify(rej.errors));
    }
  })();

  res.json({ success: true, runId, accepted: transformResult.accepted.length, rejected: transformResult.rejected.length, skipped });
});

app.post('/api/runs/rollback', (req, res) => {
  const { run_id } = req.body;
  const run: any = appDb.prepare(`SELECT * FROM runs WHERE id = ? AND type = 'execute' AND status = 'success'`).get(run_id);
  if (!run) return res.status(400).json({ error: 'Valid execution run not found' });

  // Find all account_ids for this run
  const lineage = targetDb.prepare('SELECT account_id FROM migration_lineage WHERE run_id = ?').all(run_id) as any[];
  const keys = lineage.map(l => l.account_id);

  let deleted = 0;
  if (keys.length > 0) {
    targetDb.transaction(() => {
      for (const account_id of keys) {
        const info = targetDb.prepare('DELETE FROM accounts WHERE account_id = ?').run(account_id);
        deleted += info.changes;
        targetDb.prepare('DELETE FROM migration_lineage WHERE account_id = ?').run(account_id);
      }
    })();
  }
  
  // Mark run as rolled back
  appDb.prepare(`UPDATE runs SET status = 'rolled_back' WHERE id = ?`).run(run_id);
  
  res.json({ success: true, deleted, run_id });
});

app.get('/api/history', (req, res) => {
  const runs = appDb.prepare('SELECT * FROM runs ORDER BY id DESC').all();
  res.json(runs);
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
