import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingProps {
  initialRating?: number;
  readonly?: boolean;
  onChange?: (rating: number) => void;
  size?: number;
}

export const Rating: React.FC<RatingProps> = ({ 
  initialRating = 0, 
  readonly = false, 
  onChange,
  size = 24
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const handleMouseEnter = (index: number) => {
    if (!readonly) setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (!readonly) setHoverRating(0);
  };

  const handleClick = (index: number) => {
    if (!readonly) {
      setRating(index);
      if (onChange) onChange(index);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => {
        const isFilled = (hoverRating || rating) >= index;
        return (
          <button
            key={index}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            className={`focus:outline-none transition-transform ${
              readonly ? 'cursor-default' : 'cursor-pointer active:scale-90 hover:scale-110'
            }`}
          >
            <Star
              size={size}
              className={`${
                isFilled ? 'text-yellow-400 fill-current' : 'text-slate-200'
              } transition-colors`}
            />
          </button>
        );
      })}
    </div>
  );
};
