import React, { useEffect, useState } from "react";
import Image from "../assets/image.png";
import Logo from "../assets/logo.png";
import GoogleSvg from "../assets/icons8-google.svg";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import "../styles/Login.css";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const API = import.meta?.env?.VITE_API_URL || "http://localhost:3000";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken") || "";

  useEffect(() => {
    if (token) {
      toast.info("You're already logged in");
      navigate("/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = (form.get("email") || "").trim();
    const password = (form.get("password") || "").trim();

    if (!email || !password) {
      toast.error("Please fill all inputs");
      return;
    }

    try {
      const res = await axios.post(
        `${API}/auth/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );
      const tk = res.data?.token || res.data?.accessToken;
      if (!tk) {
        toast.error("Token missing in response");
        return;
      }
      localStorage.setItem("accessToken", tk);
      toast.success("Login successful");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Login failed";
      toast.error(msg);
    }
  };

  return (
    <div className="login-main">
      <div className="login-left">
        <img src={Image} alt="" />
      </div>
      <div className="login-right">
        <div className="login-right-container">
          <div className="login-logo">
            <img src={Logo} alt="" />
          </div>
          <div className="login-center">
            <h2>Welcome back!</h2>
            <p>Please enter your details</p>

            <form onSubmit={handleLoginSubmit}>
              <input type="email" placeholder="Email" name="email" required />
              <div className="pass-input-div">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  name="password"
                  required
                />
                {showPassword ? (
                  <FaEyeSlash onClick={() => setShowPassword(false)} />
                ) : (
                  <FaEye onClick={() => setShowPassword(true)} />
                )}
              </div>

              <div className="login-center-options">
                <div className="remember-div">
                  <input type="checkbox" id="remember-checkbox" />
                  <label htmlFor="remember-checkbox">Remember for 30 days</label>
                </div>
                <button type="button" className="forgot-pass-link" onClick={() => toast.info("Forgot password not implemented yet")}>
                  Forgot password?
                </button>
              </div>

              <div className="login-center-buttons">
                <button type="submit">Log In</button>
                <button type="button" onClick={() => toast.info("Google OAuth not wired yet")}>
                  <img src={GoogleSvg} alt="" />
                  Log In with Google
                </button>
              </div>
            </form>
          </div>

          <p className="login-bottom-p">
            Don't have an account? <Link to="/register">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
