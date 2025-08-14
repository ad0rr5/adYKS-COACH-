
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: "text-white bg-light-secondary hover:bg-orange-600 dark:bg-dark-primary dark:hover:bg-indigo-600 focus:ring-light-secondary dark:focus:ring-dark-primary",
    secondary: "text-light-primary dark:text-dark-secondary bg-light-primary/10 hover:bg-light-primary/20 dark:bg-dark-secondary/10 dark:hover:bg-dark-secondary/20 focus:ring-light-primary dark:focus:ring-dark-secondary",
  };
  
  // Eğer className'de özel stiller varsa, onları kullan
  const finalClassName = className.includes('bg-') || className.includes('text-') 
    ? `${baseClasses} ${className}` 
    : `${baseClasses} ${variantClasses[variant]} ${className}`;
  
  return (
    <button
      className={finalClassName}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
