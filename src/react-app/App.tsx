import { BrowserRouter as Router, Routes, Route } from "react-router";
import { ClerkLoaded, ClerkLoading } from "@clerk/clerk-react";
import HomePage from "@/react-app/pages/Home";

export default function App() {
  return (
    <Router>
      <ClerkLoading>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-32 w-32 rounded-3xl bg-white/10" />
          </div>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </ClerkLoaded>
    </Router>
  );
}
