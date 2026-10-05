import { RuleRegistry } from './rules';
import crypto from 'crypto';

export type PlanMapping = {
  targetField: string;
  sourceField?: string; // Optional if rule doesn't need source (e.g. constant)
  rules: { name: string; params?: any }[];
};

export type MigrationPlan = {
  version: number;
  mappings: PlanMapping[];
};

export type FieldError = {
  field: string;
  rule: string;
  input: any;
  message: string;
};

export type RejectedRecord = {
  sourceKey: string;
  rawRecord: any;
  errors: FieldError[];
};

export type TransformResult = {
  accepted: any[];
  rejected: RejectedRecord[];
};

// Generates a deterministic idempotency key for a source record
export function generateIdempotencyKey(sourceRecord: any): string {
  // Assuming a consistent shape or a primary key exists in source.
  // In a real app we'd configure a primary key. For this assignment, hash the whole record if no 'id' exists.
  const idValue = sourceRecord.id || sourceRecord.userId || sourceRecord.email || JSON.stringify(sourceRecord);
  return crypto.createHash('sha256').update(String(idValue)).digest('hex');
}

export function transform(records: any[], plan: MigrationPlan): TransformResult {
  const result: TransformResult = { accepted: [], rejected: [] };

  for (const record of records) {
    const sourceKey = generateIdempotencyKey(record);
    const targetRecord: any = {};
    const errors: FieldError[] = [];

    for (const mapping of plan.mappings) {
      let currentValue = mapping.sourceField ? record[mapping.sourceField] : null;

      for (const rule of mapping.rules) {
        const ruleDef = RuleRegistry[rule.name];
        if (!ruleDef) {
          errors.push({
            field: mapping.targetField,
            rule: rule.name,
            input: currentValue,
            message: `Rule not found: ${rule.name}`
          });
          break;
        }

        const res = ruleDef.apply(currentValue, rule.params);
        if (!res.success) {
          errors.push({
            field: mapping.targetField,
            rule: rule.name,
            input: currentValue,
            message: res.error || 'Validation failed'
          });
          break; // Stop processing rules for this field
        }
        currentValue = res.value;
      }

      if (errors.length === 0) {
        targetRecord[mapping.targetField] = currentValue;
      }
    }

    if (errors.length > 0) {
      result.rejected.push({
        sourceKey,
        rawRecord: record,
        errors
      });
    } else {
      targetRecord._sourceKey = sourceKey; // Inject idempotency key for data layer
      result.accepted.push(targetRecord);
    }
  }

  return result;
}
