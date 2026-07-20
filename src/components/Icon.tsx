type IconProps = { name: 'message' | 'import' | 'settings' | 'logout' | 'send'; size?: number }

import { figmaAssets } from '../assets'

export function Icon({ name, size = 24 }: IconProps) {
  return <img className="asset-icon" src={figmaAssets[name]} width={size} height={size} alt="" aria-hidden="true" />
}
