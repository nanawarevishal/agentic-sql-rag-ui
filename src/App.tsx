import { NavLink, Route, Routes } from "react-router-dom";
import { ChatPage } from "./pages/ChatPage";
import { AdminPage } from "./pages/AdminPage";
import "./App.css";

function App() {
  return (
    <div className="app-shell">
      <header>
        <h1>Agentic SQL RAG</h1>
        <nav>
          <NavLink to="/" end>
            Query
          </NavLink>
          <NavLink to="/admin">Schema Admin</NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
