import { listen } from "@colyseus/tools";
import { env } from "./config/env";
import app from "./app.config";

listen(app, env.port);
