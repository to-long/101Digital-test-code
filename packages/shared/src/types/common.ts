export interface PaginatedResponse<T> {
  data: T[];
  paging: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
