import React, { useEffect, useState } from 'react';
import Header from './Header';

const Layout = ({ children }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="home-container">
      <div className="atmosphere-bg">
        <div className="gradient-mesh"></div>
        <div className="grid-pattern"></div>
      </div>

      <Header scrollY={scrollY} />

      {children}
    </div>
  );
};

export default Layout;
