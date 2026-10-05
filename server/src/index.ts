import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { db } from './data/db';
import { AgentService } from './services/agentService';
import { sourceSchema, targetSchema, mockSourceRecords } from './domain/schema';
import { transform, MigrationPlan } from './domain/transformEngine';

const app = express();
app.use(cors());
app.use(express.json());

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/dataset', (req, res) => {
  res.json({ sourceSchema, targetSchema, mockSourceRecords });
});

app.post('/api/agent/propose', asyncHandler(async (req: Request, res: Response) => {
  const agent = new AgentService();
  const result = await agent.runAgent();
  res.json(result);
}));

app.post('/api/plans', asyncHandler(async (req: Request, res: Response) => {
  const { mappings, approver } = req.body;
  const mappingJson = JSON.stringify(mappings);
  
  const [rows]: any = await db.query('SELECT MAX(version) as v FROM migration_plans');
  const nextVersion = (rows[0]?.v || 0) + 1;
  const status = approver ? 'approved' : 'draft';
  const approvedAt = approver ? new Date() : null;

  const [result]: any = await db.query(`
    INSERT INTO migration_plans (version, status, mapping_json, approver, approved_at)
    VALUES (?, ?, ?, ?, ?)
  `, [nextVersion, status, mappingJson, approver, approvedAt]);
  
  res.json({ id: result.insertId, version: nextVersion, status });
}));

app.get('/api/plans', asyncHandler(async (req: Request, res: Response) => {
  const [plans] = await db.query('SELECT * FROM migration_plans ORDER BY version DESC');
  res.json(plans);
}));

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

app.post('/api/runs/execute', asyncHandler(async (req: Request, res: Response) => {
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

  await db.query('UPDATE runs SET skipped_duplicates = ? WHERE id = ?', [skipped, runId]);

  res.json({ success: true, runId, accepted: transformResult.accepted.length, rejected: transformResult.rejected.length, skipped });
}));

app.post('/api/runs/rollback', asyncHandler(async (req: Request, res: Response) => {
  const { run_id } = req.body;
  const [runRows]: any = await db.query(`SELECT * FROM runs WHERE id = ? AND type = 'execute' AND status = 'success'`, [run_id]);
  if (runRows.length === 0) return res.status(400).json({ error: 'Valid execution run not found' });

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
  
  await db.query(`UPDATE runs SET status = 'rolled_back' WHERE id = ?`, [run_id]);
  res.json({ success: true, deleted, run_id });
}));

app.get('/api/history', asyncHandler(async (req: Request, res: Response) => {
  const [runs] = await db.query('SELECT * FROM runs ORDER BY id DESC');
  res.json(runs);
}));

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
