module.exports = {
  apps: [
    {
      name: "api-campagne",
      cwd: __dirname,
      script: "dist/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3004,
        WEB_ORIGIN: "http://192.168.0.13:84"
      }
    }
  ]
};