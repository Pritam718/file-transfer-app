declare namespace NodeJS {
  interface ProcessEnv {
    // Application Settings
    APP_NAME?: string;
    NODE_ENV: 'development' | 'production' | 'test';

    // API Configuration (Optional)
    API_URL?: string;

    // Server Configuration
    PORT?: string;

    // Security
    SECRET_KEY?: string;

    // Logging (Optional)
    LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug' | 'loading' | 'success';
  }
}
