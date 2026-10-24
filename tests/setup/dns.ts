// Integration tests talk to the dev database on Neon. On networks whose DNS
// refuses *.neon.tech, fall back to public DNS for those hostnames only.
// This is a no-op wherever the system resolver already works.
import { createRequire } from "node:module";

createRequire(import.meta.url)("../../scripts/use-public-dns.cjs");
