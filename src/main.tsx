import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force clear student data cache (One-time cleanup to ensure data integrity)
const cachePurged = localStorage.getItem('purge_v1_completed');
if (!cachePurged) {
  const keysToPurge = ['optativas_usuarios', 'optativas_estudantes', 'optativas_inscricoes'];
  keysToPurge.forEach(key => localStorage.removeItem(key));
  localStorage.setItem('purge_v1_completed', 'true');
  console.log('Local storage cache purged.');
}

createRoot(document.getElementById("root")!).render(<App />);
