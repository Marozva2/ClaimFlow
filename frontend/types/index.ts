export type UserRole = "customer" | "claims_officer" | "admin";

export type ClaimStatus =
  | "submitted"
  | "under_review"
  | "awaiting_information"
  | "approved"
  | "rejected"
  | "settled"
  | "closed";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
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
  status: ClaimStatus | string;
  submitted_at: string;
  updated_at: string;
  policy?: Pick<Policy, "id" | "policy_number" | "policy_type" | "coverage_amount" | "status">;
  customer?: Pick<User, "id" | "first_name" | "last_name" | "email">;
}

export interface Assessment {
  id: number;
  claim_id: number;
  assessor_id: number;
  recommendation: "approve" | "reject" | "request_information" | string;
  approved_amount: number | null;
  notes: string | null;
  assessed_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  claim_id: number | null;
  action: string;
  description: string;
  created_at: string;
}

export interface EntityList<T> {
  [key: string]: T[] | undefined;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
