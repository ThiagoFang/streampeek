import { Auth } from "./routes/auth";
import { Home } from "./routes/home";

const navigationClient = {
  home: Home,
  auth: Auth,
} as const;

type Route = keyof typeof navigationClient;

export { navigationClient, type Route };

