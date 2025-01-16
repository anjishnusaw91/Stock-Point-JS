import { SVGProps } from 'react'

export function StockPointLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 2v20h20" />
      <path d="M6 16l6-8 4 4 6-8" />
      <circle cx="18" cy="8" r="2" fill="currentColor" />
    </svg>
  )
} 