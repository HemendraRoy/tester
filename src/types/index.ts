export interface ExecuteRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
}

export interface ExecuteResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

export interface SuccessResponse {
  success: true;
  data: ExecuteResponseData;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse = SuccessResponse | ErrorResponse;
