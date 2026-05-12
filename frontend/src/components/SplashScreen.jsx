import { useState, useEffect } from 'react';
import adhilLogo from '../assets/ADHIL LOGO.png';
import '../styles/SplashScreen.css';

export const SplashScreen = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Show splash for 2 seconds, then start fade out
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      
      // After fade animation (0.5s), call onFinish
      setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div className={`splash-screen ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="splash-logo-container">
        <div className="splash-logo-wrapper">
          <img src="/logo.png" alt="Logo" className="splash-main-logo" />
        </div>
      </div>
      
      <div className="splash-branding">
        <span className="splash-from">from</span>
        <div className="splash-brand-row">
          <img src={adhilLogo} alt="Adhil Logo" className="splash-small-logo" />
          <span className="splash-brand-name">HeadGreen!</span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
