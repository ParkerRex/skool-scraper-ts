export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any) {
    console.log(`[${new Date().toISOString()}] [${this.context}] INFO: ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  error(message: string, error?: any) {
    console.error(`[${new Date().toISOString()}] [${this.context}] ERROR: ${message}`);
    if (error) {
      console.error(error);
    }
  }

  warn(message: string, data?: any) {
    console.warn(`[${new Date().toISOString()}] [${this.context}] WARN: ${message}`);
    if (data) {
      console.warn(JSON.stringify(data, null, 2));
    }
  }

  debug(message: string, data?: any) {
    if (process.env.DEBUG) {
      console.log(`[${new Date().toISOString()}] [${this.context}] DEBUG: ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }
}