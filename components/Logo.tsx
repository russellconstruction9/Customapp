import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center my-4 py-4">
        <svg width="250" height="60" viewBox="0 0 250 60" className="drop-shadow-sm">
            {/* <!-- Icon: Spray Gun --> */}
            <g transform="translate(5, 5) scale(0.9)">
                {/* <!-- Gun Body (black) --> */}
                <path d="M 0 15 L 20 15 L 20 5 L 45 5 L 45 25 L 30 25 L 30 35 L 0 35 Z" fill="#11182B" />
                {/* <!-- Handle (black) --> */}
                <path d="M 5 35 L 5 45 L 12 52 L 20 45 L 20 35 Z" fill="#11182B" />
                {/* <!-- Trigger (red) --> */}
                <rect x="15" y="17" width="4" height="8" rx="1" fill="#EF4444" />
                {/* <!-- Nozzle (gray) --> */}
                <rect x="45" y="12" width="12" height="6" fill="#4B5563" />
            </g>

            {/* <!-- Text: FOAM CRMAI --> */}
            <text x="70" y="45" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="900" fill="#11182B" letterSpacing="-1">
                FOAM
            </text>
            <text x="165" y="45" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="500" fill="#DC2626" letterSpacing="-1">
                CRMAI
            </text>
            
            {/* <!-- Accent line (yellow) --> */}
            <rect x="70" y="50" width="170" height="3" fill="#FBBF24" rx="1.5" />
        </svg>
    </div>
  );
};

export default Logo;
