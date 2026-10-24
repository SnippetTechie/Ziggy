/**
 * Opt-in DNS fallback for networks whose resolver refuses *.neon.tech
 * (symptom: ECONNREFUSED / ENOTFOUND / EREFUSED for the database host; see
 * README "Database"). It only acts for Neon hostnames, only AFTER the system
 * resolver has failed, and only affects the Node process it is loaded into —
 * it does not change any system or network setting.
 *
 *   NODE_OPTIONS="--require ./scripts/use-public-dns.cjs" npm run dev
 *
 * Servers default to 1.1.1.1 and 8.8.8.8; override with ZIGGY_DNS_SERVERS.
 */
// CommonJS on purpose: loaded with `node --require`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dns = require("node:dns");

const servers = (process.env.ZIGGY_DNS_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const resolver = new dns.Resolver();
resolver.setServers(servers);

const originalLookup = dns.lookup;

dns.lookup = function lookup(hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (typeof options === "number") options = { family: options };
  options = options || {};

  originalLookup.call(dns, hostname, options, (err, address, family) => {
    if (!err || typeof hostname !== "string" || !/\.neon\.tech$/i.test(hostname)) {
      return callback(err, address, family);
    }
    resolver.resolve4(hostname, (resolveErr, addresses) => {
      if (resolveErr || !addresses || addresses.length === 0) return callback(err);
      if (options.all) return callback(null, addresses.map((a) => ({ address: a, family: 4 })));
      callback(null, addresses[0], 4);
    });
  });
};
