declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_API_URL?: string;
      SERVER_URL?: string;
      NODE_ENV?: "development" | "production" | "test";
      [key: string]: string | undefined;
    }
  }

  // Provides TypeScript ambient definitions for 'process' in client code
  // when @types/node is missing from local node_modules
  var process: {
    env: NodeJS.ProcessEnv;
  };
}

export {};

