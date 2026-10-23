declare module "cloudflare:workers" {
  interface DurableObjectId {
    readonly __brand?: unique symbol;
  }

  interface DurableObjectStub {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  }

  interface DurableObjectNamespace {
    idFromName(name: string): DurableObjectId;
    get(id: DurableObjectId): DurableObjectStub;
  }

  export const env: {
    AUTH_RATE_LIMITER: DurableObjectNamespace;
  };
}
