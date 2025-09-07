import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./utils/AuthContext";
import Dashboard from "./Components/Dashboard";
import MerchantDashboard from "./Components/MerchantDashboard";
import "./index.css";
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import Home from "./pages/Home";
import Plans from "./pages/Plans";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Chatbot from "./Components/Chatbot";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="main-content">
          <Navbar/>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/merchant-dashboard" element={<MerchantDashboard />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<About />} />
          </Routes>
          <Chatbot/>
          <Footer/>
        </div>
      </Router>
    </AuthProvider>
  );
}
