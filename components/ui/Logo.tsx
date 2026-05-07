import Image from 'next/image'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'mark' | 'full'
}

// Height in px — width auto-computed from 192:84 native aspect ratio
const HEIGHTS: Record<string, number> = { xs: 28, sm: 36, md: 48, lg: 64, xl: 84 }

export function Logo({ size = 'md' }: LogoProps) {
  const h = HEIGHTS[size]
  const w = Math.round((h * 192) / 84)

  return (
    <Image
      src="/logo-sacolas-braga.png"
      alt="Sacolas Braga"
      width={w}
      height={h}
      priority
      className="shrink-0"
    />
  )
}
