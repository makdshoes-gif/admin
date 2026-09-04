import React from 'react';

interface MakdLogoProps {
  className?: string;
  size?: number | string;
  showSlogan?: boolean;
  inverted?: boolean; // For dark backgrounds
  onClick?: () => void;
}

export const MakdLogo: React.FC<MakdLogoProps> = ({
  className = '',
  size = 40,
  showSlogan = true,
  inverted = false,
  onClick,
}) => {
  const fg = inverted ? '#FFFFFF' : '#000000';
  const bg = inverted ? '#000000' : '#FFFFFF';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      title="MAKD SHOP - marcamos tu estilo"
    >
      <svg
        viewBox="0 0 500 500"
        width="100%"
        height="100%"
        className="w-full h-full drop-shadow-xs"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background container */}
        <rect width="500" height="500" fill={bg} rx="8" />

        {/* Outer Square Border (characteristic of the logo) */}
        <rect
          x="36"
          y="36"
          width="428"
          height="428"
          fill="none"
          stroke={fg}
          strokeWidth="24"
        />

        {/* MAKD Block Typography */}
        <g fill={fg}>
          {/* Letter M */}
          <path d="M 65 200 L 105 200 L 125 238 L 145 200 L 185 200 L 185 265 L 155 265 L 155 230 L 135 265 L 115 265 L 95 230 L 95 265 L 65 265 Z" />

          {/* Letter A with characteristic diagonal slash */}
          <path d="M 215 200 L 245 200 L 275 265 L 245 265 L 238 250 L 210 250 L 206 257 L 199 253 L 215 222 Z" />
          <path d="M 191 245 L 198 232 L 205 245 L 185 265 L 175 265 Z" />
          <polygon points="225,220 233,240 217,240" fill={bg} />

          {/* Letter K */}
          <path d="M 285 200 L 315 200 L 315 225 L 340 200 L 375 200 L 338 233 L 378 265 L 342 265 L 315 240 L 315 265 L 285 265 Z" />

          {/* Letter D */}
          <path
            d="M 385 200 L 420 200 C 438 200 448 212 448 232.5 C 448 253 438 265 420 265 L 385 265 Z M 412 222 L 412 243 C 418 243 422 239 422 232.5 C 422 226 418 222 412 222 Z"
            fillRule="evenodd"
          />
        </g>

        {/* Word SHOP (Right aligned under AKD) */}
        <text
          x="448"
          y="306"
          textAnchor="end"
          fontFamily="'Space Grotesk', 'Arial Black', sans-serif"
          fontSize="36"
          fontWeight="900"
          letterSpacing="3"
          fill={fg}
        >
          SHOP
        </text>

        {/* Slogan 'marcamos tu estilo' */}
        {showSlogan && (
          <text
            x="448"
            y="328"
            textAnchor="end"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontSize="17"
            fontStyle="italic"
            fontWeight="500"
            letterSpacing="0.5"
            fill={fg}
          >
            marcamos tu estilo
          </text>
        )}
      </svg>
    </div>
  );
};
