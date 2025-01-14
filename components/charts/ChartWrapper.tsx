import dynamic from 'next/dynamic';

// Properly handle SSR for ApexCharts
export const Chart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div>Loading Chart...</div>
}); 