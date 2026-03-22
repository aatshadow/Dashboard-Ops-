import { createContext, useContext } from 'react'

export const ClientContext = createContext({
  clientSlug: null,
  clientId: null,
  clientConfig: null,
})

export function useClient() {
  return useContext(ClientContext)
}
