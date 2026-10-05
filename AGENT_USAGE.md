# Agent Usage

## Core Agent Architecture
The AI agent in this Data Migration Workbench is constrained to a specific set of tools and outputs using the **Groq SDK** and an OpenAI-compatible function calling API (Llama-3 model).

### Available Tools
The agent uses the following bounded tools to perform the task without needing direct database queries or arbitrary code execution:
1. `inspect_source_schema`: Fetches the source schema.
2. `inspect_target_schema`: Fetches the target schema.
3. `sample_source_records`: Retrieves a sample of the source data to look for anomalies (mixed dates, malformed emails, state codes).
4. `list_transformation_rules`: Retrieves the declarative rule registry to know what transformations are possible (e.g. `split`, `normalize_email`, `map_values`).
5. `propose_plan`: Outputs the final JSON structure for mappings, risks, and questions.

### Representative Prompts
**System Prompt:**
\`\`\`
You are an expert Data Migration Agent.
Your job is to map a source dataset to a target schema using ONLY the provided transformation rules.
Use the provided tools to inspect the source schema, target schema, sample data, and available rules.
When you are ready, call the 'propose_plan' function to output your mapping.
Analyze the data carefully:
- Full names might need to be split into first_name and last_name.
- State codes might need to be mapped to 'ACTIVE' / 'INACTIVE'.
- Missing required fields need a 'default_value' rule.
- Phone and emails need normalization.
- Dates need to be parsed.
\`\`\`

### Delegated Work
The agent is responsible for:
- Inferring how a legacy source field (e.g. `full_name`) maps to new fields (`first_name`, `last_name`).
- Deducing standard rules like `normalize_email` and `normalize_phone` from looking at dirty sample data.
- Identifying missing fields and automatically suggesting default values.
- Creating a declarative rule chain that the backend `TransformEngine` executes.

### Rejected Suggestions / Important Mistakes
During development, the agent occasionally attempted to invent its own rules (like `extract_regex` or `conditional_default`). 
**Solution:** The system enforces strict matching of proposed rule chains against the `RuleRegistry` in the domain layer. Any fabricated rules are caught either by the tool schema boundaries or during the Dry Run simulation.

### Output Verification
The agent's output is NEVER executed blindly.
1. The user views the `Tool Trace` to see what the agent inspected.
2. The user reviews the field mappings and risks in the Planner UI.
3. The user MUST perform a deterministic **Dry Run**. This tests the agent's proposed rules against the source records and shows exactly what fails (quarantine).
4. The user explicitly clicks **Approve Plan** before the engine is permitted to persist any data to the target database.
