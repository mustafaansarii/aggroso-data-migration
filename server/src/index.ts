import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './data/db';
import { AgentService } from './services/agentService';
import { sourceSchema, targetSchema, mockSourceRecords } from './domain/schema';
import { transform, MigrationPlan } from './domain/transformEngine';

const app = express();
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
app.post('/api/plans', async (req, res) => {
  try {
    const { mappings, approver } = req.body;
    const mappingJson = JSON.stringify(mappings);
    
    // Find current max version
    const [rows]: any = await db.query('SELECT MAX(version) as v FROM migration_plans');
    const nextVersion = (rows[0]?.v || 0) + 1;

    const status = approver ? 'approved' : 'draft';
    const approvedAt = approver ? new Date() : null;

    const [result]: any = await db.query(`
      INSERT INTO migration_plans (version, status, mapping_json, approver, approved_at)
      VALUES (?, ?, ?, ?, ?)
    `, [nextVersion, status, mappingJson, approver, approvedAt]);
    
    res.json({ id: result.insertId, version: nextVersion, status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/plans', async (req, res) => {
  try {
    const [plans] = await db.query('SELECT * FROM migration_plans ORDER BY version DESC');
    res.json(plans);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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

app.post('/api/runs/execute', async (req, res) => {
  try {
    const { plan_id } = req.body;
    const [planRows]: any = await db.query(`SELECT * FROM migration_plans WHERE id = ? AND status = 'approved'`, [plan_id]);
    
    if (planRows.length === 0) {
      return res.status(400).json({ error: 'Plan not found or not approved' });
    }
    const planRow = planRows[0];

    const plan: MigrationPlan = { version: planRow.version, mappings: JSON.parse(planRow.mapping_json) };
    const transformResult = transform(mockSourceRecords, plan);

    const [runInfo]: any = await db.query(`
      INSERT INTO runs (plan_id, type, status, source_count, accepted_count, rejected_count, skipped_duplicates)
      VALUES (?, 'execute', 'success', ?, ?, ?, 0)
    `, [plan_id, mockSourceRecords.length, transformResult.accepted.length, transformResult.rejected.length]);

    const runId = runInfo.insertId;
    let skipped = 0;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      for (const record of transformResult.accepted) {
        const [info]: any = await connection.query(`
          INSERT IGNORE INTO accounts (account_id, first_name, last_name, email, phone, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [record.account_id, record.first_name, record.last_name, record.email, record.phone, record.status, record.created_at]);
        
        if (info.affectedRows === 0) {
          skipped++;
        } else {
          await connection.query(`
            INSERT IGNORE INTO migration_lineage (record_key, account_id, run_id)
            VALUES (?, ?, ?)
          `, [record._sourceKey, record.account_id, runId]);
        }
      }

      // Record quarantine
      for (const rej of transformResult.rejected) {
        await connection.query(`
          INSERT INTO quarantine (run_id, source_key, raw_record, errors) VALUES (?, ?, ?, ?)
        `, [runId, rej.sourceKey, JSON.stringify(rej.rawRecord), JSON.stringify(rej.errors)]);
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Update skipped count
    await db.query('UPDATE runs SET skipped_duplicates = ? WHERE id = ?', [skipped, runId]);

    res.json({ success: true, runId, accepted: transformResult.accepted.length, rejected: transformResult.rejected.length, skipped });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/runs/rollback', async (req, res) => {
  try {
    const { run_id } = req.body;
    const [runRows]: any = await db.query(`SELECT * FROM runs WHERE id = ? AND type = 'execute' AND status = 'success'`, [run_id]);
    if (runRows.length === 0) return res.status(400).json({ error: 'Valid execution run not found' });

    // Find all account_ids for this run
    const [lineage]: any = await db.query('SELECT account_id FROM migration_lineage WHERE run_id = ?', [run_id]);
    const keys = lineage.map((l: any) => l.account_id);

    let deleted = 0;
    if (keys.length > 0) {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        for (const account_id of keys) {
          const [info]: any = await connection.query('DELETE FROM accounts WHERE account_id = ?', [account_id]);
          deleted += info.affectedRows;
          await connection.query('DELETE FROM migration_lineage WHERE account_id = ?', [account_id]);
        }
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }
    
    // Mark run as rolled back
    await db.query(`UPDATE runs SET status = 'rolled_back' WHERE id = ?`, [run_id]);
    
    res.json({ success: true, deleted, run_id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const [runs] = await db.query('SELECT * FROM runs ORDER BY id DESC');
    res.json(runs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
