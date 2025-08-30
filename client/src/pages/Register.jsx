import React, { useEffect, useState } from "react";
import Image from "../assets/image.png";
import Logo from "../assets/logo.png";
import GoogleSvg from "../assets/icons8-google.svg";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import "../styles/Register.css";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const API = import.meta?.env?.VITE_API_URL || "http://localhost:3000";

export default function Register() {
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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") || "").trim();
    const lastname = (form.get("lastname") || "").trim();
    const email = (form.get("email") || "").trim();
    const role = (form.get("role") || "manager").trim();
    const password = (form.get("password") || "").trim();
    const confirmPassword = (form.get("confirmPassword") || "").trim();

    if (!name || !lastname || !email || !password || !confirmPassword) {
      toast.error("Please fill all inputs");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    const payload = {
      username: `${name} ${lastname}`,
      email,
      password,
      role,
    };

    try {
      const res = await axios.post(`${API}/auth/register`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      // If your backend returns a token on register:
      const tk = res.data?.token;
      if (tk) {
        localStorage.setItem("accessToken", tk);
        toast.success("Registration successful");
        navigate("/dashboard", { replace: true });
      } else {
        toast.success("Registration successful — please log in");
        navigate("/login", { replace: true });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed";
      toast.error(msg);
    }
  };

  return (
    <div className="register-main">
      <div className="register-left">
        <img src={Image} alt="" />
      </div>
      <div className="register-right">
        <div className="register-right-container">
          <div className="register-logo">
            <img src={Logo} alt="" />
          </div>
          <div className="register-center">
            <h2>Welcome to our website!</h2>
            <p>Please enter your details</p>

            <form onSubmit={handleRegisterSubmit}>
              <input type="text" placeholder="Name" name="name" required />
              <input type="text" placeholder="Lastname" name="lastname" required />
              <input type="email" placeholder="Email" name="email" required />
              <select name="role" defaultValue="manager" required>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>

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

              <div className="pass-input-div">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  name="confirmPassword"
                  required
                />
                {showPassword ? (
                  <FaEyeSlash onClick={() => setShowPassword(false)} />
                ) : (
                  <FaEye onClick={() => setShowPassword(true)} />
                )}
              </div>

              <div className="register-center-buttons">
                <button type="submit">Sign Up</button>
                <button type="button" onClick={() => toast.info("Google OAuth not wired yet")}>
                  <img src={GoogleSvg} alt="" />
                  Sign Up with Google
                </button>
              </div>
            </form>
          </div>

          <p className="login-bottom-p">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
