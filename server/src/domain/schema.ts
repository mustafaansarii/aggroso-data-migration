export type SchemaField = {
  name: string;
  type: string;
  required: boolean;
  description?: string;
};

export const targetSchema: SchemaField[] = [
  { name: 'account_id', type: 'string', required: true, description: 'Unique identifier for the account' },
  { name: 'first_name', type: 'string', required: true, description: 'First name of the customer' },
  { name: 'last_name', type: 'string', required: true, description: 'Last name of the customer' },
  { name: 'email', type: 'string', required: true, description: 'Valid email address' },
  { name: 'phone', type: 'string', required: false, description: 'Numeric phone number only' },
  { name: 'status', type: 'string', required: true, description: 'ACTIVE or INACTIVE' },
  { name: 'created_at', type: 'string', required: true, description: 'ISO 8601 date (YYYY-MM-DD)' }
];

export const mockSourceRecords = [
  {
    id: 'CUST-001',
    full_name: 'John Doe',
    contact_email: 'JOHN.DOE@example.com',
    phone_number: '(555) 123-4567',
    state_code: '1',
    signup_date: '01/15/2023'
  },
  {
    id: 'CUST-002',
    full_name: 'Jane Smith',
    contact_email: 'jane.smith@Example.org',
    phone_number: '555-987-6543',
    state_code: '2',
    signup_date: '2023-02-20T10:00:00Z'
  },
  {
    id: 'CUST-003',
    full_name: 'Alice',
    contact_email: 'invalid-email',
    phone_number: '+1 555 555 5555',
    state_code: '1',
    signup_date: 'Mar 10 2023'
  },
  {
    id: 'CUST-004',
    full_name: 'Bob Jones',
    contact_email: null,
    phone_number: null,
    state_code: 'unknown',
    signup_date: null
  }
];

export const sourceSchema: SchemaField[] = [
  { name: 'id', type: 'string', required: true },
  { name: 'full_name', type: 'string', required: false },
  { name: 'contact_email', type: 'string', required: false },
  { name: 'phone_number', type: 'string', required: false },
  { name: 'state_code', type: 'string', required: false, description: '1=Active, 2=Inactive' },
  { name: 'signup_date', type: 'string', required: false, description: 'Various date formats' }
];
