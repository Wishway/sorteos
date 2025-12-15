import React, { useState, useEffect } from 'react';

const Countdown = ({ targetDate, onComplete, className = '', darkMode = false }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = new Date(targetDate) - new Date();
    
    if (difference <= 0) {
      return { expired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return { days, hours, minutes, seconds, expired: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      if (newTimeLeft.expired && onComplete) {
        onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.expired) {
    return <span className={className}>¡Tiempo expirado!</span>;
  }

  const { days, hours, minutes, seconds } = timeLeft;
  
  // Colores según el modo
  const textColor = darkMode ? 'text-gray-800' : 'text-white';
  const labelColor = darkMode ? 'text-gray-600' : 'text-gray-300';

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      {days > 0 && (
        <div className="text-center">
          <div className={`text-3xl font-bold ${textColor}`}>{days}</div>
          <div className={`text-xs ${labelColor}`}>días</div>
        </div>
      )}
      {(days > 0 || hours > 0) && (
        <>
          {days > 0 && <span className={`text-3xl font-bold ${textColor}`}>:</span>}
          <div className="text-center">
            <div className={`text-3xl font-bold ${textColor}`}>{String(hours).padStart(2, '0')}</div>
            <div className={`text-xs ${labelColor}`}>hrs</div>
          </div>
        </>
      )}
      <span className={`text-3xl font-bold ${textColor}`}>:</span>
      <div className="text-center">
        <div className={`text-3xl font-bold ${textColor}`}>{String(minutes).padStart(2, '0')}</div>
        <div className={`text-xs ${labelColor}`}>min</div>
      </div>
      <span className={`text-3xl font-bold ${textColor}`}>:</span>
      <div className="text-center">
        <div className={`text-3xl font-bold ${textColor}`}>{String(seconds).padStart(2, '0')}</div>
        <div className={`text-xs ${labelColor}`}>seg</div>
      </div>
    </div>
  );
};

export default Countdown;
