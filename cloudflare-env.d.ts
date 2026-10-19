declare namespace Cloudflare {
  interface Env {
    ASSETS?: Fetcher;
    SATELLITE_FEED?: DurableObjectNamespace;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
