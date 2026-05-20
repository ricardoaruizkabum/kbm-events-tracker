
import { tracker } from "./tracker"
import { consoleAdapter } from "../adapters/console"
import { apiAdapter } from "../adapters/api"

tracker.register(consoleAdapter, "demo-app")
tracker.register(apiAdapter, "demo-app")
