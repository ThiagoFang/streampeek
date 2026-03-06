import { Auth } from "./components/auth"
import { StreamerList } from "./components/streamer-list"
import { usePathStore } from "./store/path"

type Route = "auth" | "home" | "settings"

const pathsMap: Record<Route, React.FC> = {
  auth: Auth,
  home: StreamerList,
  settings: StreamerList,
}

export default function App() {
  const path = usePathStore((state) => state.path)

  const Element = pathsMap[path]
  return <Element />
}
