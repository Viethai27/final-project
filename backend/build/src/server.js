"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const ensure_database_1 = require("./shared/ensure-database");
dotenv_1.default.config();
const port = Number(process.env.PORT ?? 4000);
async function bootstrap() {
    await (0, ensure_database_1.ensureDatabaseAvailable)();
    app_1.app.listen(port, () => {
        console.log(`Patient dispatch backend listening on http://localhost:${port}`);
    });
}
void bootstrap().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
