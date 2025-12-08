import { useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/sessionStore';
import TurnControls from '@/components/TurnControls';
import GameStatus from '@/components/GameStatus';
import { useNetworkStore } from '@/stores/networkStore';
import { useCountdown } from '@/hooks/useCountdown';
import LobbyActions from '@/components/LobbyActions/LobbyActions';
import ActionArea from '@/components/ActionArea';
import DiceTrack from '@/components/GameBoardz/DiceTrack';
import { GameRenderer } from '@/components/GameBoard/GameRenderer';
import GameView from '@/components/GameBoard/GameView';

const RoomPage = () => {
	const navigate = useNavigate();
	const { state: networkState, autoReconnect } = useNetworkStore();
	const roomPhase = useStore((z) => z.state.room?.phase);
	const tryAutoReconnect = useStore((z) => z.tryAutoReconnect);
	const reconnectionToken = useStore((z) => z.room.reconnectionToken);

	useLayoutEffect(() => {
		const tryReconnect = async () => {
			await tryAutoReconnect('page-refresh');
		};
		if (networkState === 'disconnected') {
			if (reconnectionToken) tryReconnect();
			else navigate('/');
		} else {
			//happy path
		}
		return () => {
			console.log('unmount');
		};
	}, []);

	if (networkState === 'connecting' || networkState === 'reconnecting') {
		return (
			<div className="room-page room-page--loading">
				<div className="room-loading">
					<div className="room-spinner"></div>
					<p>Connecting to room...</p>
				</div>
			</div>
		);
	}

	if (autoReconnect.inprogress && autoReconnect.attempt < 3) {
		const { remainingSeconds } = useCountdown(autoReconnect.nextRetryAt);
		return (
			<div className="room-page room-page--loading">
				<div className="room-loading">
					<div className="room-spinner"></div>
					<p>connection lost. retrying in {remainingSeconds}s...</p>
				</div>
			</div>
		);
	}

	if (networkState === 'disconnected') {
		return (
			<div className="room-page room-page--error">
				<div className="room-error">
					<h2>Connection Lost</h2>
					<button onClick={() => navigate('/')}>Return to Lobby</button>
				</div>
			</div>
		);
	}

	// Show spectator banner if in spectator mode
	//   const spectatorBanner = isSpectator && (
	//     <div className="room-spectator-banner">
	//       <span>👁️ Spectator Mode - {isGameActive ? 'Watching the game' : 'Room is full or game already started'}</span>
	//     </div>
	//   )

	// Show game board + GameStatus component for both lobby and active phases

	return (
		<div className="w-full flex flex-col items-center justify-center">
			{/* {spectatorBanner} */}
			<div className='max-w-[420px] w-full'>
				<DiceTrack/>
			</div>
			<GameStatus />

			{/* Game HUD - only visible during active game */}

			<ActionArea>
				{roomPhase === 'lobby' && <TurnControls />}
				{roomPhase === 'active' && <LobbyActions />}
			</ActionArea>
		</div>
	);
};

export default RoomPage;
