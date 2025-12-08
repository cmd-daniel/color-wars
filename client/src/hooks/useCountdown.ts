// useCountdown.ts
import { useEffect, useMemo, useState } from 'react';

type CountdownOptions = {
	intervalMs?: number; // how often to tick (default 250ms)
	clampAtZero?: boolean; // stop at 0 or go negative (default true)
};

export function useCountdown(targetTime: number | null | undefined, options?: CountdownOptions) {
	let intervalMs = options?.intervalMs || 250
	let clampAtZero = options?.clampAtZero || true

	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!targetTime) return;

		const id = setInterval(() => {
			setNow(Date.now());
		}, intervalMs);

		return () => clearInterval(id);
	}, [targetTime, intervalMs]);

	const msLeft = useMemo(() => {
		if (!targetTime) return 0;
		const diff = targetTime - now;
		return clampAtZero ? Math.max(0, diff) : diff;
	}, [targetTime, now, clampAtZero]);

	const seconds = Math.ceil(msLeft / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	return {
		msLeft,
		seconds,
		minutes,
		remainingSeconds,
		isDone: msLeft <= 0,
	};
}
