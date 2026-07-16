export interface PaginationResult<T> {
  rows: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CurrentUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  organizationId?: string;
  organizationType?: string;
}
