import { useStore } from "@/stores/sessionStore"

const Pinger = ({ playerId }: { playerId: string }) => {
    const ping = useStore((state)=>state.state?.playersPings?.[playerId])
    if(!ping) return null
    return <span>{Math.round(ping)} ms</span>
}

export default Pinger