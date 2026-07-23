import { CartLarge, Home, Magnifer, Shop } from '@solar-icons/solid/Outline'

export default function StoreIcon(props: {
  name: 'cart' | 'home' | 'search' | 'shop'
  size: number
}) {
  if (props.name === 'cart') return <CartLarge aria-hidden="true" size={props.size} />
  if (props.name === 'home') return <Home aria-hidden="true" size={props.size} />
  if (props.name === 'search') return <Magnifer aria-hidden="true" size={props.size} />
  return <Shop aria-hidden="true" size={props.size} />
}
