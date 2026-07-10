/** fetch Response.json() — default generic tránh hàng loạt cast khi parse API client-side. */
interface Response {
  json<T = any>(): Promise<T>;
}
