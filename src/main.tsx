import { render } from "solid-js/web";
import { createAuthClient } from "./infra/client/auth-api";
import LoginPage from "./ui/LoginPage";
import "./style.css";

document.title = "메추라기 비가 내린다";
const authClient = createAuthClient();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

render(() => <LoginPage client={authClient} />, root);
