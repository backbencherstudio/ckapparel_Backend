export default () => ({
  app: {
    name: process.env.APP_NAME,
    key: process.env.APP_KEY,
    url: process.env.APP_URL,
    client_app_url: process.env.CLIENT_APP_URL,
    port: parseInt(process.env.PORT, 10) || 3000,
  },

  fileSystems: {
    public: {},
    s3: {
      bucket: process.env.AWS_S3_BUCKET,
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_S3_ENDPOINT,
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    },
    minio: {
      bucket: process.env.MINIO_BUCKET,
      endpoint: process.env.MINIO_ENDPOINT,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
      port: process.env.MINIO_PORT,
      useSSL: process.env.MINIO_USE_SSL === 'true',
    },
    gcs: {
      driver: 'gcs',
      projectId: process.env.GCP_PROJECT_ID,
      keyFile: process.env.GCP_KEY_FILE,
      apiEndpoint: process.env.GCP_API_ENDPOINT,
      bucket: process.env.GCP_BUCKET,
    },
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    port: process.env.REDIS_PORT,
  },

  security: {
    salt: 10,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY,
  },

  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 587,
    user: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM_ADDRESS,
  },

  auth: {
    google: {
      app_id:
        process.env.GOOGLE_APP_ID ||
        process.env.GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_ANDROID_APP_ID ||
        process.env.GOOGLE_IOS_APP_ID,
      app_secret:
        process.env.GOOGLE_APP_SECRET ||
        process.env.GOOGLE_WEB_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET,
      callback:
        process.env.GOOGLE_CALLBACK_URL ||
        process.env.GOOGLE_WEB_CALLBACK_URL,
    },
    apple: {
      client_id: process.env.APPLE_CLIENT_ID || process.env.APPLE_WEB_CLIENT_ID || process.env.APPLE_MOBILE_CLIENT_IDS,
      team_id: process.env.APPLE_TEAM_ID,
      key_id: process.env.APPLE_KEY_ID,
      private_key: process.env.APPLE_PRIVATE_KEY,
      callback: process.env.APPLE_CALLBACK_URL,
      session_secret: process.env.SESSION_SECRET,
    },
  },

  strava: {
    base: process.env.STRAVA_API_BASE || 'https://www.strava.com',
    api_v3: process.env.STRAVA_API_V3 || 'https://www.strava.com/api/v3',
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    callback_url: process.env.STRAVA_CALLBACK_URL,
    webhook_verify_token: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
    webhook_callback_url: process.env.STRAVA_WEBHOOK_CALLBACK_URL,
    auto_webhook_subscribe:
      (process.env.STRAVA_AUTO_WEBHOOK_SUBSCRIBE || 'false') === 'true',
    auto_sync_enabled: (process.env.STRAVA_AUTO_SYNC_ENABLED || 'false') === 'true',
    auto_sync_cron: process.env.STRAVA_AUTO_SYNC_CRON || '*/30 * * * *',
    auto_sync_per_page: parseInt(process.env.STRAVA_AUTO_SYNC_PER_PAGE || '50', 10),
    auto_sync_max_pages: parseInt(process.env.STRAVA_AUTO_SYNC_MAX_PAGES || '1', 10),
    scope:
      process.env.STRAVA_SCOPES ||
      'read,activity:read,activity:read_all,profile:read_all',
  },

  payment: {
    stripe: {
      secret_key: process.env.STRIPE_SECRET_KEY,
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    paypal: {
      client_id: process.env.PAYPAL_CLIENT_ID,
      secret: process.env.PAYPAL_SECRET,
      api: process.env.PAYPAL_API,
    },
    registration: {
      coach_registration_fee: parseFloat(
        process.env.COACH_REGISTRATION_FEE ?? '10',
      ),
      coach_subscription_fee: parseFloat(
        process.env.COACH_SUBSCRIPTION_FEE ?? '49',
      ),
    },
  },

  subscription: {
    trial_days: parseInt(process.env.SUBSCRIPTION_TRIAL_DAYS || '14', 10),
  },

  /**
   * Storage directory
   */
  storageUrl: {
    rootUrl: './public/storage',
    rootUrlPublic: '/public/storage',
    package: 'package',
    destination: 'destination',
    blog: 'blog',
    avatar: 'avatar',
    video: 'video',
    photo: 'photo',
    websiteInfo: 'website-info',
    attachment: 'attachment',
  },

  defaultUser: {
    system: {
      username: process.env.SYSTEM_USERNAME,
      email: process.env.SYSTEM_EMAIL,
      password: process.env.SYSTEM_PASSWORD,
    },
  },
});
