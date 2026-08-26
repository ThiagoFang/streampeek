import { Home } from "./routes/home";
import { Settings } from "./routes/settings";

const navigationClient = {
  home: Home,
  settings: Settings,
} as const;

type Route = keyof typeof navigationClient;

export { navigationClient, type Route };
