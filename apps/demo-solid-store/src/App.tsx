import '@fontsource-variable/onest/index.css'
import { Router } from '~/app/router'
import { CartProvider } from '~/cart/CartProvider'
import { AppShell } from '~/components/AppShell'

import '~/styles/global.css'

export default function App() {
  return (
    <Router>
      {props => (
        <CartProvider>
          <AppShell>{props.children}</AppShell>
        </CartProvider>
      )}
    </Router>
  )
}
