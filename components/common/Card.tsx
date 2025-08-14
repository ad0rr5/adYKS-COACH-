
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  fullHeight?: boolean;
}

const Card: React.FC<CardProps> = ({ title, children, action, fullHeight = false }) => {
  return (
    <div className={`bg-light-card dark:bg-dark-card rounded-xl shadow-lg border border-light-border dark:border-dark-border p-4 md:p-6 flex flex-col ${fullHeight ? 'h-full' : ''}`}>
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="text-xl font-bold text-light-text dark:text-dark-text">{title}</h3>
        {action}
      </div>
      <div className="flex-grow overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Card;
