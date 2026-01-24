import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Register.css';
import fundalll from '../assets/fundalll.png';

const colors = ["#00ffff", "#a855f7", "#ff00e6", "#22d3ee"];

class Particle {
  constructor(canvasWidth, canvasHeight) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 1 - 0.5;
    this.speedY = Math.random() * 1 - 0.5;
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }
  update(canvasWidth, canvasHeight) {
    this.x += this.speedX;
    this.y += this.speedY;

    // Bounce or Respawn
    if (this.x < 0 || this.x > canvasWidth) this.speedX *= -1;
    if (this.y < 0 || this.y > canvasHeight) this.speedY *= -1;
  }
  draw(ctx) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
}

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const canvasRef = useRef(null);
  const registerBoxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const registerBox = registerBoxRef.current;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Set canvas background
    canvas.style.backgroundImage = `url(${fundalll})`;
    canvas.style.backgroundSize = 'cover';
    canvas.style.backgroundPosition = 'center';
    canvas.style.backgroundRepeat = 'no-repeat';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1';

    let particlesArray = [];

    // Init particles
    function init() {
      particlesArray = [];
      const numberOfParticles = 50;
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle(canvas.width, canvas.height));
      }
    }

    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((particle) => {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx);
      });
      requestAnimationFrame(animate);
    }

    init();
    animate();

    // Resize canvas when window resizes
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };
    window.addEventListener("resize", handleResize);

    // Parallax Hover Effect on Register Box
    const handleMouseMove = (e) => {
      const xAxis = (window.innerWidth / 2 - e.pageX) / 40;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 40;
      registerBox.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    };

    const handleMouseLeave = () => {
      registerBox.style.transform = `rotateY(0deg) rotateX(0deg)`;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleRegister = async () => {
    try {
      await api.post('/api/auth/register', {
        username,
        email,
        password
      });
      alert('User created! Now login.');
      navigate('/login');
    } catch (err) {
      console.error('Register failed:', err.response?.data || err.message);
      alert('Register failed: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  return (
    <>
      <canvas ref={canvasRef} id="neonParticles"></canvas>
      <div className="register-container">
        <div ref={registerBoxRef} className="register-box" id="registerBox">
          <h2 className="glow-title">Register</h2>
          <div className="input-box">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <label>Username</label>
          </div>
          <div className="input-box">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <label>Email</label>
          </div>
          <div className="input-box">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <label>Password</label>
          </div>
          <button className="btn" onClick={handleRegister}>Register</button>
          <div className="register">
            <Link to="/login">Already have account? Login</Link>
          </div>
        </div>
      </div>
    </>
  );
}