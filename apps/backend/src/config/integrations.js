function optionalEnv(key, fallback = '') {
  return process.env[key] ?? fallback
}

export const integrationsConfig = {
  weather: {
    apiKey:      optionalEnv('OPENWEATHER_API_KEY'),
    baseUrl:     'https://api.openweathermap.org/data/2.5',
    // Nha Trang default coords
    defaultLat:  12.2388,
    defaultLng:  109.1967,
    pollCronExpr: '*/30 * * * *',   // every 30 min
    hotThresholdC:  35,             // heat alert
  },
  mapbox: {
    token:       optionalEnv('MAPBOX_TOKEN'),
    style:       'mapbox://styles/mapbox/dark-v11',
    heatmapRadius: 3000,            // meters
  },
  stripe: {
    secretKey:   optionalEnv('STRIPE_SECRET_KEY'),
    webhookPath: '/webhook/stripe',
  },
  googleCalendar: {
    clientId:     optionalEnv('GOOGLE_CALENDAR_CLIENT_ID'),
    clientSecret: optionalEnv('GOOGLE_CALENDAR_CLIENT_SECRET'),
  },
  zalo: {
    appId:     optionalEnv('ZALO_APP_ID'),
    appSecret: optionalEnv('ZALO_APP_SECRET'),
  },
  instagram: {
    accessToken: optionalEnv('INSTAGRAM_ACCESS_TOKEN'),
  },
  ton: {
    minterWalletSeed: optionalEnv('TON_MINTER_WALLET_SEED'),
    network:          optionalEnv('TON_NETWORK', 'testnet'),
  },
}
