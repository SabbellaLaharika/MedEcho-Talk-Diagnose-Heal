import React, { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
  title, 
  subtitle, 
  children, 
  actions 
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="mt-4 md:mt-0 flex-shrink-0">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
};

export default PageContainer;