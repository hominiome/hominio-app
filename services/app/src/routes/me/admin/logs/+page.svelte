<script lang="ts">
    import { createVoiceCallService } from '@hominio/voice';
    import { GlassCard } from '@hominio/brand';
    
    const voice = createVoiceCallService();
</script>

<div class="min-h-screen bg-glass-gradient pt-6 pb-12">
    <div class="container mx-auto px-4 max-w-4xl">
        <div class="mb-8">
            <h1 class="text-4xl font-bold tracking-tight text-slate-900 mb-2">Voice Logs</h1>
            <p class="text-slate-600">Real-time voice service logs and debugging information</p>
        </div>

        <GlassCard class="p-6 mb-6">
            <div class="flex gap-4 mb-6">
                <button 
                    class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onclick={() => voice.start()}
                    disabled={voice.isConnected}
                >
                    Start Call
                </button>
                
                <button 
                    class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onclick={() => voice.stop()}
                    disabled={!voice.isConnected}
                >
                    Stop Call
                </button>
            </div>

            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Connection</div>
                    <div class="font-mono text-lg font-bold" class:text-green-600={voice.isConnected} class:text-slate-400={!voice.isConnected}>
                        {voice.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </div>
                </div>
                <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Mic</div>
                    <div class="font-mono text-lg font-bold" class:text-red-600={voice.isRecording} class:text-slate-400={!voice.isRecording}>
                        {voice.isRecording ? 'RECORDING' : 'OFF'}
                    </div>
                </div>
                <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">AI Status</div>
                    <div class="font-mono text-sm font-bold" 
                         class:text-blue-600={voice.isSpeaking}
                         class:text-purple-600={voice.isThinking}
                         class:text-slate-400={!voice.isSpeaking && !voice.isThinking}>
                        {#if voice.isSpeaking}
                            SPEAKING
                        {:else if voice.isThinking}
                            THINKING
                        {:else if voice.isConnected}
                            LISTENING
                        {:else}
                            IDLE
                        {/if}
                    </div>
                </div>
            </div>

            <div class="bg-black rounded-lg border border-slate-800 overflow-hidden">
                <div class="p-3 bg-slate-900 border-b border-slate-800">
                    <h3 class="text-sm font-semibold text-slate-300">Logs</h3>
                </div>
                <div class="overflow-y-auto p-4 h-96 font-mono text-sm text-green-400">
                    {#each voice.logs as log}
                        <div class="mb-1">{log}</div>
                    {:else}
                        <div class="text-slate-500">No logs yet. Start a call to see logs.</div>
                    {/each}
                </div>
            </div>
        </GlassCard>
    </div>
</div>

