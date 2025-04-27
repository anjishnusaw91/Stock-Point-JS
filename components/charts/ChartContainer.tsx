import React from 'react';

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ title, children }) => {
  return (
    <div className="bg-white rounded-lg shadow mb-4">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[320px] w-full h-[250px] md:min-w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ChartContainer; 