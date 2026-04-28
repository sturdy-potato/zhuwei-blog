export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}

export interface PagesFunctionContext<Env = Record<string, unknown>> {
  request: Request;
  env: Env;
  params: Record<string, string | undefined>;
}

export type PagesFunction<Env = Record<string, unknown>> = (
  context: PagesFunctionContext<Env>
) => Response | Promise<Response>;
