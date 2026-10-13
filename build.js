const fs = require("fs");
const missing = ["DB_URL", "DB_KEY", "CARTER_KEYS"].filter(
  (name) => !process.env[name],
);
if (missing.length) {
  console.error("Missing environment variables:", missing.join(", "));
  process.exit(1);
}
const lock = process.env.LOCK_INSPECT_ENV === "true";
fs.writeFileSync(
  "config.js",
  `const LOCK_INSPECT_ENV = ${lock ? "true" : "false"};\n`,
);
console.log(
  "config.js generated without credentials. LOCK_INSPECT_ENV:",
  lock ? "true" : "false",
);
