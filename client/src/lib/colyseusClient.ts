import { Client } from 'colyseus.js'
import { getWsEndpoint } from './serverConfig'

let client: Client | null = null

export const getColyseusClient = () => {
  if (!client) {
    client = new Client(getWsEndpoint())
  }
  return client
}
