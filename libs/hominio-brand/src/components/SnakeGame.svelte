<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	const GRID_SIZE = 20;
	const CELL_SIZE = 20;
	const INITIAL_SPEED = 150;

	let { 
		onGameOver = () => {},
		onScoreUpdate = () => {}
	}: {
		onGameOver?: (score: number) => void;
		onScoreUpdate?: (score: number) => void;
	} = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let gameLoop: number | null = null;
	let score = $state(0);
	let gameOver = $state(false);
	let isPaused = $state(false);
	let direction = $state<'up' | 'down' | 'left' | 'right'>('right');
	let nextDirection = $state<'up' | 'down' | 'left' | 'right'>('right');
	let snake = $state<Array<{ x: number; y: number }>>([{ x: 10, y: 10 }]);
	let food = $state<{ x: number; y: number }>({ x: 15, y: 15 });
	let speed = $state(INITIAL_SPEED);

	function randomFood(): { x: number; y: number } {
		let newFood;
		do {
			newFood = {
				x: Math.floor(Math.random() * GRID_SIZE),
				y: Math.floor(Math.random() * GRID_SIZE)
			};
		} while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
		return newFood;
	}

	function draw() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Clear canvas with glass effect background
		ctx.fillStyle = 'rgba(248, 249, 250, 0.3)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw grid lines (subtle)
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
		ctx.lineWidth = 1;
		for (let i = 0; i <= GRID_SIZE; i++) {
			ctx.beginPath();
			ctx.moveTo(i * CELL_SIZE, 0);
			ctx.lineTo(i * CELL_SIZE, canvas.height);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, i * CELL_SIZE);
			ctx.lineTo(canvas.width, i * CELL_SIZE);
			ctx.stroke();
		}

		// Draw food with glass effect
		ctx.fillStyle = 'rgba(163, 55, 106, 0.8)'; // Alert color
		ctx.shadowColor = 'rgba(163, 55, 106, 0.5)';
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.arc(
			food.x * CELL_SIZE + CELL_SIZE / 2,
			food.y * CELL_SIZE + CELL_SIZE / 2,
			CELL_SIZE / 2 - 2,
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.shadowBlur = 0;

		// Draw snake with glass effect
		snake.forEach((segment, index) => {
			const isHead = index === 0;
			const alpha = isHead ? 0.9 : 0.7 - (index * 0.05);
			
			ctx.fillStyle = `rgba(0, 66, 170, ${alpha})`; // Primary color
			ctx.shadowColor = `rgba(0, 66, 170, ${alpha * 0.5})`;
			ctx.shadowBlur = isHead ? 8 : 4;
			
			// Rounded rectangle for glass effect
			const x = segment.x * CELL_SIZE + 2;
			const y = segment.y * CELL_SIZE + 2;
			const size = CELL_SIZE - 4;
			const radius = 4;
			
			ctx.beginPath();
			// Use roundRect if available, otherwise fallback to manual path
			if (ctx.roundRect) {
				ctx.roundRect(x, y, size, size, radius);
			} else {
				// Manual rounded rectangle
				ctx.moveTo(x + radius, y);
				ctx.lineTo(x + size - radius, y);
				ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
				ctx.lineTo(x + size, y + size - radius);
				ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
				ctx.lineTo(x + radius, y + size);
				ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
				ctx.lineTo(x, y + radius);
				ctx.quadraticCurveTo(x, y, x + radius, y);
				ctx.closePath();
			}
			ctx.fill();
			
			// Add highlight for glass effect
			if (isHead) {
				ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
				ctx.beginPath();
				const highlightSize = size / 3;
				const highlightX = x + 2;
				const highlightY = y + 2;
				if (ctx.roundRect) {
					ctx.roundRect(highlightX, highlightY, highlightSize, highlightSize, radius / 2);
				} else {
					const highlightRadius = radius / 2;
					ctx.moveTo(highlightX + highlightRadius, highlightY);
					ctx.lineTo(highlightX + highlightSize - highlightRadius, highlightY);
					ctx.quadraticCurveTo(highlightX + highlightSize, highlightY, highlightX + highlightSize, highlightY + highlightRadius);
					ctx.lineTo(highlightX + highlightSize, highlightY + highlightSize - highlightRadius);
					ctx.quadraticCurveTo(highlightX + highlightSize, highlightY + highlightSize, highlightX + highlightSize - highlightRadius, highlightY + highlightSize);
					ctx.lineTo(highlightX + highlightRadius, highlightY + highlightSize);
					ctx.quadraticCurveTo(highlightX, highlightY + highlightSize, highlightX, highlightY + highlightSize - highlightRadius);
					ctx.lineTo(highlightX, highlightY + highlightRadius);
					ctx.quadraticCurveTo(highlightX, highlightY, highlightX + highlightRadius, highlightY);
					ctx.closePath();
				}
				ctx.fill();
			}
		});
		ctx.shadowBlur = 0;
	}

	function update() {
		if (gameOver || isPaused) return;

		direction = nextDirection;

		// Calculate new head position
		const head = { ...snake[0] };
		switch (direction) {
			case 'up':
				head.y -= 1;
				break;
			case 'down':
				head.y += 1;
				break;
			case 'left':
				head.x -= 1;
				break;
			case 'right':
				head.x += 1;
				break;
		}

		// Check wall collision
		if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
			endGame();
			return;
		}

		// Check self collision
		if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
			endGame();
			return;
		}

		snake = [head, ...snake];

		// Check food collision
		if (head.x === food.x && head.y === food.y) {
			score += 10;
			speed = Math.max(80, INITIAL_SPEED - score * 2); // Increase speed as score increases
			food = randomFood();
			onScoreUpdate(score);
		} else {
			snake = snake.slice(0, -1); // Remove tail
		}

		draw();
	}

	function endGame() {
		gameOver = true;
		if (gameLoop) {
			cancelAnimationFrame(gameLoop);
			gameLoop = null;
		}
		onGameOver(score);
	}

	function startGame() {
		if (gameLoop) return;
		
		gameOver = false;
		isPaused = false;
		score = 0;
		speed = INITIAL_SPEED;
		direction = 'right';
		nextDirection = 'right';
		snake = [{ x: 10, y: 10 }];
		food = randomFood();
		
		function loop() {
			update();
			if (!gameOver && !isPaused) {
				setTimeout(() => {
					gameLoop = requestAnimationFrame(loop);
				}, speed);
			}
		}
		
		draw();
		gameLoop = requestAnimationFrame(loop);
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (gameOver) {
			if (event.key === ' ' || event.key === 'Enter') {
				startGame();
			}
			return;
		}

		if (event.key === ' ') {
			isPaused = !isPaused;
			if (!isPaused && !gameLoop) {
				startGame();
			}
			return;
		}

		// Prevent reverse direction
		const keyMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
			ArrowUp: 'up',
			ArrowDown: 'down',
			ArrowLeft: 'left',
			ArrowRight: 'right',
			w: 'up',
			s: 'down',
			a: 'left',
			d: 'right'
		};

		const newDirection = keyMap[event.key];
		if (newDirection) {
			// Prevent reversing into itself
			if (
				(newDirection === 'up' && direction !== 'down') ||
				(newDirection === 'down' && direction !== 'up') ||
				(newDirection === 'left' && direction !== 'right') ||
				(newDirection === 'right' && direction !== 'left')
			) {
				nextDirection = newDirection;
			}
		}
	}

	// Touch controls for mobile
	let touchStartX = 0;
	let touchStartY = 0;

	function handleTouchStart(event: TouchEvent) {
		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
	}

	function handleTouchEnd(event: TouchEvent) {
		if (!touchStartX || !touchStartY) return;
		
		const touch = event.changedTouches[0];
		const touchEndX = touch.clientX;
		const touchEndY = touch.clientY;
		
		const diffX = touchEndX - touchStartX;
		const diffY = touchEndY - touchStartY;
		
		if (Math.abs(diffX) > Math.abs(diffY)) {
			// Horizontal swipe
			if (diffX > 30 && direction !== 'left') {
				nextDirection = 'right';
			} else if (diffX < -30 && direction !== 'right') {
				nextDirection = 'left';
			}
		} else {
			// Vertical swipe
			if (diffY > 30 && direction !== 'up') {
				nextDirection = 'down';
			} else if (diffY < -30 && direction !== 'down') {
				nextDirection = 'up';
			}
		}
		
		touchStartX = 0;
		touchStartY = 0;
	}

	function handleDirectionButton(newDir: 'up' | 'down' | 'left' | 'right') {
		if (gameOver) {
			startGame();
			return;
		}
		
		if (isPaused) {
			isPaused = false;
			if (!gameLoop) {
				startGame();
			}
			return;
		}
		
		// Prevent reverse direction
		if (
			(newDir === 'up' && direction !== 'down') ||
			(newDir === 'down' && direction !== 'up') ||
			(newDir === 'left' && direction !== 'right') ||
			(newDir === 'right' && direction !== 'left')
		) {
			nextDirection = newDir;
		}
	}
	
	function handleStartPause() {
		if (gameOver) {
			startGame();
		} else {
			isPaused = !isPaused;
		}
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleKeyPress);
			window.addEventListener('touchstart', handleTouchStart);
			window.addEventListener('touchend', handleTouchEnd);
		}
		startGame();
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('keydown', handleKeyPress);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchend', handleTouchEnd);
		}
		if (gameLoop) {
			cancelAnimationFrame(gameLoop);
		}
	});
</script>

<div class="snake-game-container">
	<canvas
		bind:this={canvas}
		width={GRID_SIZE * CELL_SIZE}
		height={GRID_SIZE * CELL_SIZE}
		class="snake-canvas"
	></canvas>
	
	<div class="game-overlay">
		{#if gameOver}
			<div class="game-over-screen">
				<h2 class="game-over-title">Game Over!</h2>
				<p class="game-over-score">Score: {score}</p>
				<p class="game-over-hint">Press Space or Enter to restart</p>
			</div>
		{:else if isPaused}
			<div class="game-paused-screen">
				<h2 class="game-paused-title">Paused</h2>
				<p class="game-paused-hint">Press Space to resume</p>
			</div>
		{/if}
		
		<div class="game-info">
			<div class="score-display">
				<span class="score-label">Score:</span>
				<span class="score-value">{score}</span>
			</div>
		</div>
	</div>
	
	<!-- Mobile Game Controls -->
	<div class="mobile-controls">
		<button 
			type="button"
			class="control-button up-button"
			onclick={() => handleDirectionButton('up')}
			aria-label="Move up"
		>
			<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
			</svg>
		</button>
		<div class="control-row">
			<button 
				type="button"
				class="control-button left-button"
				onclick={() => handleDirectionButton('left')}
				aria-label="Move left"
			>
				<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<button 
				type="button"
				class="control-button start-pause-button"
				onclick={handleStartPause}
				aria-label={gameOver ? "Start game" : isPaused ? "Resume" : "Pause"}
			>
				{#if gameOver}
					<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				{:else if isPaused}
					<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				{:else}
					<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				{/if}
			</button>
			<button 
				type="button"
				class="control-button right-button"
				onclick={() => handleDirectionButton('right')}
				aria-label="Move right"
			>
				<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>
		<button 
			type="button"
			class="control-button down-button"
			onclick={() => handleDirectionButton('down')}
			aria-label="Move down"
		>
			<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	</div>
</div>

<style>
	.snake-game-container {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.snake-canvas {
		border-radius: 1rem;
		border: 2px solid rgba(0, 66, 170, 0.3);
		background: rgba(248, 249, 250, 0.4);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		max-width: 100%;
		max-height: 100%;
		touch-action: none;
	}

	.game-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.game-over-screen,
	.game-paused-screen {
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 2px solid rgba(0, 66, 170, 0.3);
		border-radius: 1rem;
		padding: 2rem;
		text-align: center;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		pointer-events: auto;
	}

	.game-over-title,
	.game-paused-title {
		font-size: 2rem;
		font-weight: bold;
		color: var(--color-primary-700);
		margin: 0 0 1rem 0;
	}

	.game-over-score {
		font-size: 1.5rem;
		color: var(--color-primary-600);
		margin: 0 0 1rem 0;
	}

	.game-over-hint,
	.game-paused-hint {
		font-size: 0.875rem;
		color: var(--color-slate-600);
		margin: 0;
	}

	.game-info {
		position: absolute;
		top: 1rem;
		left: 1rem;
		right: 1rem;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	.score-display {
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(0, 66, 170, 0.2);
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.score-label {
		font-size: 0.875rem;
		color: var(--color-slate-600);
		font-weight: 500;
	}

	.score-value {
		font-size: 1rem;
		color: var(--color-primary-700);
		font-weight: bold;
	}

	.mobile-controls {
		display: none;
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		z-index: 30;
		pointer-events: auto;
	}

	.control-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.control-button {
		width: 3rem;
		height: 3rem;
		border-radius: 0.5rem;
		border: 2px solid rgba(0, 66, 170, 0.3);
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: var(--color-primary-700);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.control-button:active {
		transform: scale(0.95);
		background: rgba(255, 255, 255, 1);
		border-color: rgba(0, 66, 170, 0.5);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.start-pause-button {
		width: 3.5rem;
		height: 3.5rem;
	}

	@media (max-width: 640px) {
		.mobile-controls {
			display: flex;
		}

		.snake-canvas {
			border-radius: 0.75rem;
			border-width: 1px;
		}

		.game-over-title,
		.game-paused-title {
			font-size: 1.5rem;
		}

		.game-over-score {
			font-size: 1.25rem;
		}

		.game-over-screen,
		.game-paused-screen {
			padding: 1.5rem;
		}

		.score-display {
			top: 0.5rem;
			left: 0.5rem;
			right: 0.5rem;
			padding: 0.375rem 0.75rem;
		}

		.score-label {
			font-size: 0.75rem;
		}

		.score-value {
			font-size: 0.875rem;
		}

		.control-button {
			width: 2.5rem;
			height: 2.5rem;
		}

		.start-pause-button {
			width: 3rem;
			height: 3rem;
		}
	}
</style>

