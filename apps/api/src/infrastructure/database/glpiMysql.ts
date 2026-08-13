import mysql from "mysql2/promise";

const {
  GLPI_DB_HOST,
  GLPI_DB_PORT,
  GLPI_DB_USER,
  GLPI_DB_PASSWORD,
  GLPI_DB_NAME,
  NODE_ENV,
} = process.env;

if (!GLPI_DB_HOST || !GLPI_DB_PORT || !GLPI_DB_USER || !GLPI_DB_NAME) {
  console.warn("[GLPI MYSQL] Variables d’environnement GLPI incomplètes");
}

if (NODE_ENV !== "production") {
  console.log("[GLPI MYSQL] Config:", {
    host: GLPI_DB_HOST,
    port: Number(GLPI_DB_PORT || 3306),
    user: GLPI_DB_USER,
    database: GLPI_DB_NAME,
    passwordDefined: GLPI_DB_PASSWORD !== undefined,
  });
}

export const glpiPool = mysql.createPool({
  host: GLPI_DB_HOST,
  port: Number(GLPI_DB_PORT || 3306),
  user: GLPI_DB_USER,
  password: GLPI_DB_PASSWORD || "",
  database: GLPI_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});