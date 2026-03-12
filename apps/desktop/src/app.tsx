import { navigationClient } from "./navigation";
import { usePathStore } from "./store/path";

export default function App() {
  const path = usePathStore((state) => state.path);

  const Element = navigationClient[path];

  return <Element />;
}
