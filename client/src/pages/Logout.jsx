import React, { useEffect } from 'react'
import "../styles/Logout.css";
import { useNavigate } from 'react-router-dom';

const Logout = () => {

    const navigate = useNavigate();
    
    useEffect(() => {
        // Clear the token the app actually uses
        localStorage.removeItem("accessToken");
        // Optionally clear any other cached auth state
        // localStorage.removeItem("auth");
        // Redirect to login immediately
        navigate("/login", { replace: true });
    }, []);

  return (
    <div className='logout-main'>
    <h1>Logout Successful!</h1>
    <p>You will be redirected to the landing page in 3 seconds...</p>
  </div>
  )
}

export default Logout
