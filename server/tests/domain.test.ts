import { expect, test, describe } from 'vitest';
import { RuleRegistry } from '../src/domain/rules';
import { transform, MigrationPlan } from '../src/domain/transformEngine';

describe('Domain Rules', () => {
  test('trim rule removes whitespace', () => {
    const res = RuleRegistry.trim.apply(' hello ');
    expect(res.success).toBe(true);
    expect(res.value).toBe('hello');
  });

  test('map_values rule maps correctly', () => {
    const res = RuleRegistry.map_values.apply('1', { map: { '1': 'ACTIVE', '2': 'INACTIVE' } });
    expect(res.success).toBe(true);
    expect(res.value).toBe('ACTIVE');
  });

  test('map_values rule falls back to default', () => {
    const res = RuleRegistry.map_values.apply('99', { map: { '1': 'ACTIVE' }, default: 'UNKNOWN' });
    expect(res.success).toBe(true);
    expect(res.value).toBe('UNKNOWN');
  });
});

describe('Transform Engine', () => {
  test('processes records successfully', () => {
    const records = [{ id: '1', name: ' john ' }];
    const plan: MigrationPlan = {
      version: 1,
      mappings: [
        { targetField: 'account_id', sourceField: 'id', rules: [{ name: 'copy' }] },
        { targetField: 'full_name', sourceField: 'name', rules: [{ name: 'trim' }, { name: 'uppercase' }] }
      ]
    };

    const res = transform(records, plan);
    expect(res.accepted).toHaveLength(1);
    expect(res.rejected).toHaveLength(0);
    expect(res.accepted[0].account_id).toBe('1');
    expect(res.accepted[0].full_name).toBe('JOHN');
  });

  test('rejects records on rule failure', () => {
    const records = [{ id: '2', date: 'invalid-date' }];
    const plan: MigrationPlan = {
      version: 1,
      mappings: [
        { targetField: 'created_at', sourceField: 'date', rules: [{ name: 'parse_date' }] }
      ]
    };

    const res = transform(records, plan);
    expect(res.accepted).toHaveLength(0);
    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0].errors[0].message).toBe('Invalid date');
  });
});
