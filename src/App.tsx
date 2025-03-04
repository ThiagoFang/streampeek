import { List } from "./components/List";
import { Auth } from "./components/Auth";
import { Routes } from "./types/routing";
import { usePathStore } from "./store/path";

const pathsMap: Record<Routes, React.FC> = {
  auth: Auth,
  home: List,
  settings: List,
};

function App() {
  const path = usePathStore((state) => state.path);

  const Element = pathsMap[path];
  return <Element />;
}

export default App;
