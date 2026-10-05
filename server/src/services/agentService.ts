import Groq from 'groq-sdk';
import { RuleRegistry } from '../domain/rules';
import { targetSchema, sourceSchema, mockSourceRecords } from '../domain/schema';

// The tools array using JSON schema that Groq (OpenAI compatible) supports
const tools = [
  {
    type: 'function',
    function: {
      name: 'inspect_source_schema',
      description: 'Returns the schema of the source dataset.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'inspect_target_schema',
      description: 'Returns the schema of the target database.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sample_source_records',
      description: 'Returns a sample of source records.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max records (max 20)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_transformation_rules',
      description: 'Returns available transformation rules and their descriptions.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'propose_plan',
      description: 'Propose the final migration plan. Must be called to finish.',
      parameters: {
        type: 'object',
        properties: {
          mappings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                targetField: { type: 'string' },
                sourceField: { type: 'string', description: 'Can be omitted if not needed' },
                rules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      params: { type: 'object', additionalProperties: true }
                    },
                    required: ['name']
                  }
                }
              },
              required: ['targetField', 'rules']
            }
          },
          risks: { type: 'array', items: { type: 'string' } },
          questions: { type: 'array', items: { type: 'string' } }
        },
        required: ['mappings', 'risks', 'questions']
      }
    }
  }
];

export class AgentService {
  private groq: Groq;
  
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy_key'
    });
  }

  async runAgent() {
    const messages: any[] = [
      {
        role: 'system',
        content: `You are an expert Data Migration Agent.
Your job is to map a source dataset to a target schema using ONLY the provided transformation rules.
Use the provided tools to inspect the source schema, target schema, sample data, and available rules.
When you are ready, call the 'propose_plan' function to output your mapping.
Analyze the data carefully:
- Full names might need to be split into first_name and last_name.
- State codes might need to be mapped to 'ACTIVE' / 'INACTIVE'.
- Missing required fields need a 'default_value' rule.
- Phone and emails need normalization.
- Dates need to be parsed.`
      }
    ];

    const maxSteps = 10;
    let step = 0;
    let proposal = null;
    const trace = [];

    // Simple heuristic fallback if no real key
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'dummy_key') {
      return this.runHeuristicFallback();
    }

    while (step < maxSteps) {
      step++;
      const completion = await this.groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages,
        tools: tools as any,
        tool_choice: 'auto'
      });

      const responseMessage = completion.choices[0].message;
      messages.push(responseMessage);

      if (responseMessage.tool_calls) {
        for (const toolCall of responseMessage.tool_calls) {
          trace.push({ type: 'tool_call', name: toolCall.function.name, args: toolCall.function.arguments });
          
          let toolResult: any;
          if (toolCall.function.name === 'inspect_source_schema') {
            toolResult = sourceSchema;
          } else if (toolCall.function.name === 'inspect_target_schema') {
            toolResult = targetSchema;
          } else if (toolCall.function.name === 'sample_source_records') {
            toolResult = mockSourceRecords;
          } else if (toolCall.function.name === 'list_transformation_rules') {
            toolResult = Object.values(RuleRegistry).map(r => ({ name: r.name, description: r.description }));
          } else if (toolCall.function.name === 'propose_plan') {
            proposal = JSON.parse(toolCall.function.arguments);
            toolResult = { status: 'success' };
          } else {
            toolResult = { error: 'Unknown tool' };
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: JSON.stringify(toolResult)
          });
        }
      }

      if (proposal) break;
    }

    return { proposal, trace };
  }

  runHeuristicFallback() {
    // Deterministic fallback for testing without API keys
    return {
      trace: [{ type: 'heuristic_fallback', name: 'used_heuristic', args: '{}' }],
      proposal: {
        risks: ['State codes need manual verification for 1 vs 2 mapping.'],
        questions: ['Is John Doe guaranteed to have exactly 2 names?'],
        mappings: [
          { targetField: 'account_id', sourceField: 'id', rules: [{ name: 'copy' }] },
          { targetField: 'first_name', sourceField: 'full_name', rules: [{ name: 'split', params: { separator: ' ', index: 0 } }] },
          { targetField: 'last_name', sourceField: 'full_name', rules: [{ name: 'split', params: { separator: ' ', index: 1 } }] },
          { targetField: 'email', sourceField: 'contact_email', rules: [{ name: 'normalize_email' }] },
          { targetField: 'phone', sourceField: 'phone_number', rules: [{ name: 'normalize_phone' }] },
          { targetField: 'status', sourceField: 'state_code', rules: [
            { name: 'map_values', params: { map: { '1': 'ACTIVE', '2': 'INACTIVE' }, default: 'INACTIVE' } }
          ]},
          { targetField: 'created_at', sourceField: 'signup_date', rules: [{ name: 'parse_date' }, { name: 'default_value', params: { value: '1970-01-01' } }] }
        ]
      }
    };
  }
}
