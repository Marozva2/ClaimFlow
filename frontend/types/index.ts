export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
}

export interface Policy {
  id: number;
  policy_number: string;
  user_id: number;
  policy_type: string;
  premium: number;
  coverage_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export interface Claim {
  id: number;
  claim_number: string;
  policy_id: number;
  description: string;
  amount_claimed: number;
  amount_approved: number | null;
  status: string;
  submitted_at: string;
  updated_at: string;
}