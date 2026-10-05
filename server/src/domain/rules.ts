import { z } from 'zod';

export type RuleResult = {
  success: boolean;
  value?: any;
  error?: string;
};

export interface RuleDefinition<TParams extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  paramSchema?: TParams;
  apply: (value: any, params?: z.infer<TParams>) => RuleResult;
}

export const RuleRegistry: Record<string, RuleDefinition<any>> = {
  copy: {
    name: 'copy',
    description: 'Copies the value exactly as is',
    apply: (value) => ({ success: true, value }),
  },
  trim: {
    name: 'trim',
    description: 'Trims whitespace from a string',
    apply: (value) => {
      if (typeof value !== 'string') return { success: true, value };
      return { success: true, value: value.trim() };
    },
  },
  lowercase: {
    name: 'lowercase',
    description: 'Converts a string to lowercase',
    apply: (value) => {
      if (typeof value !== 'string') return { success: true, value };
      return { success: true, value: value.toLowerCase() };
    },
  },
  uppercase: {
    name: 'uppercase',
    description: 'Converts a string to uppercase',
    apply: (value) => {
      if (typeof value !== 'string') return { success: true, value };
      return { success: true, value: value.toUpperCase() };
    },
  },
  cast_integer: {
    name: 'cast_integer',
    description: 'Casts a value to an integer',
    apply: (value) => {
      if (value === null || value === undefined || value === '') return { success: true, value: null };
      const parsed = parseInt(String(value), 10);
      if (isNaN(parsed)) return { success: false, error: 'Cannot cast to integer' };
      return { success: true, value: parsed };
    },
  },
  cast_decimal: {
    name: 'cast_decimal',
    description: 'Casts a value to a decimal',
    apply: (value) => {
      if (value === null || value === undefined || value === '') return { success: true, value: null };
      const parsed = parseFloat(String(value));
      if (isNaN(parsed)) return { success: false, error: 'Cannot cast to decimal' };
      return { success: true, value: parsed };
    },
  },
  default_value: {
    name: 'default_value',
    description: 'Provides a default value if the input is null, undefined or empty string',
    paramSchema: z.object({ value: z.any() }),
    apply: (val, params) => {
      if (val === null || val === undefined || val === '') {
        return { success: true, value: params?.value };
      }
      return { success: true, value: val };
    }
  },
  normalize_email: {
    name: 'normalize_email',
    description: 'Validates and lowercases an email address',
    apply: (value) => {
      if (!value) return { success: true, value: null };
      if (typeof value !== 'string') return { success: false, error: 'Email must be a string' };
      const email = value.trim().toLowerCase();
      if (!email.includes('@')) return { success: false, error: 'Invalid email format' };
      return { success: true, value: email };
    }
  },
  normalize_phone: {
    name: 'normalize_phone',
    description: 'Removes non-numeric characters from a phone number',
    apply: (value) => {
      if (!value) return { success: true, value: null };
      const phone = String(value).replace(/\\D/g, '');
      return { success: true, value: phone };
    }
  },
  split: {
    name: 'split',
    description: 'Splits a string by a separator and takes the part at the given index',
    paramSchema: z.object({ separator: z.string(), index: z.number().int().min(0) }),
    apply: (value, params) => {
      if (!value || typeof value !== 'string') return { success: true, value: null };
      const parts = value.split(params?.separator || ' ');
      const val = parts[params?.index || 0] || '';
      return { success: true, value: val.trim() };
    }
  },
  parse_date: {
    name: 'parse_date',
    description: 'Parses a date string and outputs ISO 8601 (YYYY-MM-DD)',
    apply: (value) => {
      if (!value) return { success: true, value: null };
      const d = new Date(value);
      if (isNaN(d.getTime())) return { success: false, error: 'Invalid date' };
      return { success: true, value: d.toISOString().split('T')[0] };
    }
  },
  map_values: {
    name: 'map_values',
    description: 'Maps an input string to an output string using a dictionary. Fallbacks to default if provided. Pass the dictionary as the map param.',
    paramSchema: z.object({ map: z.record(z.string(), z.string()).optional(), mapping: z.record(z.string(), z.string()).optional(), default: z.string().optional() }),
    apply: (value, params) => {
      const mapObj = params?.map || params?.mapping;
      if (!mapObj) return { success: false, error: 'Missing map param' };
      const strVal = String(value);
      if (mapObj[strVal] !== undefined) {
        return { success: true, value: mapObj[strVal] };
      }
      if (params.default !== undefined) {
        return { success: true, value: params.default };
      }
      return { success: false, error: `Value ${strVal} not found in map` };
    }
  }
};
