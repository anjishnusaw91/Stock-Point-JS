import { redirect } from 'next/navigation';

export default function LoginPage() {
  // Redirect to the main page if login is not needed
  redirect('/');
} 