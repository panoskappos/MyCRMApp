import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  onClick,
  label = "Πίσω",
  className = "",
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button" // Προστέθηκε για να αποτρέπει την υποβολή φόρμας
      onClick={handleClick}
      className={`text-slate-600 hover:text-blue-600 flex items-center text-sm font-medium transition-colors ${className}`}
    >
      <ArrowLeft className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </button>
  );
};
