import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initGlobalFetchInterceptor } from "./lib/api-interceptor";

initGlobalFetchInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
