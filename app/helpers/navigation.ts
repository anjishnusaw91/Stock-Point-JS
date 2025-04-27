import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export const handleNavigation = (tab: string, router: AppRouterInstance) => {
  switch (tab) {
    case 'Home':
      router.push('/');
      break;
    case 'Performance Comparator':
      router.push('/performance-comparator');
      break;
    case 'Market Profile':
      router.push('/market-profile');
      break;
    case 'NIFTY predictor':
      router.push('/nifty-predictor');
      break;
    case 'Technical Analysis':
      router.push('/technical-analysis');
      break;
    case 'General Forecaster':
      router.push('/general-forecaster');
      break;
    case 'Live Charts':
      router.push('/live-charts');
      break;
    case 'Portfolio Manager':
      router.push('/portfolio');
      break;
    case 'Watchlist Manager':
      router.push('/watchlist');
      break;
    case 'Market News':
      router.push('/market-news');
      break;
    case 'Contact':
      router.push('/contact');
      break;
    case 'User Profile':
      router.push('/user-profile');
      break;
    case 'User Activity':
      router.push('/user-activity');
      break;
    default:
      router.push('/');
      break;
  }
}; 