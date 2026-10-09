export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type MetaProps = {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
};

export type PaginatedProps<T> = {
  meta: MetaProps;
  data: T[];
};

export type PaginatedRequestProps = {
  page?: number;
  limit?: number;
};
