import { Client } from 'colyseus.js'
import { getWsEndpoint } from './serverConfig'

// One client per tab - cached to prevent multiple client instances
let client: Client | null = null

export const getColyseusClient = () => {
  if (!client) {
    client = new Client(getWsEndpoint())
  }
  return client
}
