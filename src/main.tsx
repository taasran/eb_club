import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import "./theme.css"
import "./admin/auth.css"
import "./admin/facebook-archive.css"
import "./components/profile-cards.css"
import "./pages/profile-page.css"
import { initializeTheme } from "./theme"

initializeTheme()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
