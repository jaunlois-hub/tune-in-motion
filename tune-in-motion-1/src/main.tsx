import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AudioGraphProvider } from './audio/AudioGraphProvider';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AudioGraphProvider>
      <App />
    </AudioGraphProvider>
  </React.StrictMode>
);
