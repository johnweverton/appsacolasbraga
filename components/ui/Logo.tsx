import Image from 'next/image'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'mark' | 'full'
  inverted?: boolean
}

// Height in px for each size — width auto-computed from 220:133 aspect ratio
const HEIGHTS: Record<string, number> = { xs: 24, sm: 30, md: 38, lg: 56, xl: 90 }

export function Logo({ size = 'md', inverted = false }: LogoProps) {
  const h = HEIGHTS[size]
  const w = Math.round((h * 220) / 133)

  return (
    <Image
      src="/logo-sacolas-braga.png"
      alt="Sacolas Braga"
      width={w}
      height={h}
      priority
      style={{ mixBlendMode: inverted ? 'screen' : 'darken' }}
      className="shrink-0"
    />
  )
}
