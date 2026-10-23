import { render } from "solid-js/web";
import "./style.css";

function App() {
  return (
    <main>
      <p class="eyebrow">SOLIDJS + CLOUDFLARE WORKERS</p>
      <h1>Hello, world!</h1>
      <p>SolidJS 앱이 Cloudflare Workers에서 실행 중입니다.</p>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

render(() => <App />, root);
