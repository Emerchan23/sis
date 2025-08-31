import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { registerCrudRoutes } from "./routes-crud.js";
import { registerBackup } from "./routes-backup.js";
import { registerDashboardRoutes } from "./routes-dashboard.js";
import "./seed-demo.js";
async function startServer() {
    const app = Fastify({ logger: true });
    await app.register(cookie);
    await app.register(cors, {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin)
                return callback(null, true);
            // Allow any localhost or IP address on port 8000
            if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):8000$/)) {
                return callback(null, true);
            }
            // Fallback to environment variable
            const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ["http://localhost:8000", "http://127.0.0.1:8000"];
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'), false);
        },
        credentials: true,
    });
    app.get("/health", async () => ({ ok: true }));
    await app.register(registerCrudRoutes);
    await app.register(registerBackup);
    await app.register(registerDashboardRoutes);
    const port = Number(process.env.PORT || 8001);
    app.listen({ port, host: "0.0.0.0" }).catch((err) => {
        app.log.error(err);
        process.exit(1);
    });
}
startServer().catch(console.error);
