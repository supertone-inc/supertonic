import time
import math
import sys
import threading
import os  # Added missing import
import numpy as np
import soundfile as sf
import sounddevice as sd
import keyboard

class InteractivePlayer:
    def __init__(self, filepath):
        self.filepath = filepath
        self.stream_mode = False
        
        # Check if we are in streaming mode (file size might change)
        # For now, we just load what we can, but we can improve this to re-read.
        # Simpler approach: Just open the file with soundfile and read block by block in callback?
        # But we need seeking. Reading block by block makes seeking harder (need random access).
        # Loading into RAM is easiest for seeking.
        
        # Let's try to load initial chunk
        print(f"Loading {filepath}...")
        try:
            self.data, self.fs = sf.read(filepath, dtype='float32')
        except Exception as e:
            # If file is empty (just created), wait a bit
            print(f"Waiting for file content... ({e})")
            time.sleep(1)
            self.data, self.fs = sf.read(filepath, dtype='float32')

        if self.data.ndim == 1:
            self.data = self.data[:, np.newaxis]
            
        self.n_frames = len(self.data)
        self.cursor = 0
        self.block_size = 2048
        self.speed = 1.0
        self.playing = True
        
        # Watch for file updates (same file growing) AND new files (jukebox mode)
        self.last_size = os.path.getsize(filepath)
        self.update_thread = threading.Thread(target=self.watch_file, daemon=True)
        self.update_thread.start()
        
        self.jukebox_thread = threading.Thread(target=self.watch_new_files, daemon=True)
        self.jukebox_thread.start()
        
        # Key state
        self.next_pressed_time = None
        self.prev_pressed_time = None
        self.lock = threading.Lock()

        # Config
        self.seek_seconds = 2.0
        self.hold_threshold = 1.0
        
        # Start streams and listeners
        self.stream = sd.OutputStream(
            samplerate=self.fs,
            channels=self.data.shape[1],
            blocksize=self.block_size,
            callback=self.audio_callback
        )
        
    def watch_new_files(self):
        """Monitor results/ folder for newer files and switch to them."""
        results_dir = os.path.dirname(self.filepath) or "."
        last_mtime = os.path.getmtime(self.filepath)
        
        while self.playing:
            time.sleep(1.0)
            try:
                # Check for new files
                files = [os.path.join(results_dir, f) for f in os.listdir(results_dir) if f.endswith(".wav")]
                if not files:
                    continue
                    
                # Find the newest file
                files.sort(key=os.path.getmtime)
                newest_file = files[-1]
                newest_mtime = os.path.getmtime(newest_file)
                
                if newest_file != self.filepath and newest_mtime > last_mtime:
                    print(f"\n\nDetected new file: {newest_file}. Switching...", file=sys.stderr)
                    
                    # Load initial chunk of new file
                    try:
                        new_data, new_fs = sf.read(newest_file, dtype='float32')
                        if new_data.ndim == 1:
                            new_data = new_data[:, np.newaxis]
                    except Exception:
                        continue # Maybe locked or empty, try next loop

                    # Hot-swap data under lock
                    with self.lock:
                        self.filepath = newest_file
                        self.data = new_data
                        self.fs = new_fs # Assuming sample rate doesn't change wildly, or we might need to restart stream?
                        # If sample rate changes, sounddevice stream needs recreation. 
                        # TextToSpeech usually uses constant SR.
                        self.n_frames = len(self.data)
                        self.cursor = 0
                        self.last_size = os.path.getsize(newest_file)
                        
                    last_mtime = newest_mtime
                    
            except Exception as e:
                print(f"Error watching for new files: {e}", file=sys.stderr)

    def watch_file(self):
        """Monitor file size and reload data if it grows."""
        while self.playing:
            time.sleep(0.5)
            try:
                current_size = os.path.getsize(self.filepath)
                if current_size > self.last_size:
                    # Reload data
                    # This is inefficient for huge files but simple for "streaming"
                    # To do it efficiently, we should only read the appended part.
                    # soundfile allows seek.
                    
                    with sf.SoundFile(self.filepath) as f:
                         # Check if new frames available
                         if f.frames > self.n_frames:
                             f.seek(self.n_frames)
                             new_data = f.read(dtype='float32')
                             if new_data.ndim == 1:
                                 new_data = new_data[:, np.newaxis]
                             
                             with self.lock:
                                 self.data = np.concatenate([self.data, new_data])
                                 self.n_frames = len(self.data)
                                 self.last_size = current_size
                                 # print(f"\rUpdated: {self.n_frames} frames", end="", file=sys.stderr)
            except Exception as e:
                print(f"Error watching file: {e}", file=sys.stderr)

    def audio_callback(self, outdata, frames, time_info, status):
        if status:
            print(status, file=sys.stderr)
            
        with self.lock:
            current_speed = self.speed
            
        # Calculate how many frames to read from source to fill 'frames' at 'current_speed'
        n_source_frames = int(frames * current_speed)
        
        # Wait loop? No, callback cannot block long.
        # If we are at the end, check if we should wait for more data (streaming)
        # or stop.
        
        remaining = self.n_frames - self.cursor
        
        if remaining <= 0:
            # In streaming mode, we might want to output silence and wait?
            # Or just stop if no updates for a while?
            # For now, fill with silence if we think more is coming?
            # But we don't know. 
            # Let's stop if we are essentially done.
            outdata.fill(0)
            
            # If stream is active, maybe just play silence?
            # But normally CallbackStop is better.
            # Let's allow a brief pause buffer? 
            # For now, assume if we hit end, we stop, unless we know we are streaming.
            # But we don't explicitly know when stream ends.
            
            # Let's just stop. If user is faster than generator, they will have to restart or we handle it.
            # But user asked for "read audios as it is generated".
            # If we catch up to generation, we should output silence until more data arrives.
            
            # Let's output silence but NOT raise CallbackStop.
            return 
            
        read_len = min(n_source_frames, remaining)
        with self.lock:
             chunk = self.data[self.cursor : self.cursor + read_len]
        self.cursor += read_len
        
        # Resample if speed is not 1.0
        if abs(current_speed - 1.0) > 0.01 and len(chunk) > 0:
            # Simple linear interpolation for speed
            # We want to map len(chunk) -> frames
            # But we only read what was available. 
            # If we hit end of file, we might produce fewer output frames than requested.
            
            target_len = int(len(chunk) / current_speed)
            
            # Create input indices
            old_indices = np.arange(len(chunk))
            # Create output indices
            new_indices = np.linspace(0, len(chunk) - 1, target_len)
            
            # Interpolate for each channel
            resampled_chunk = np.zeros((target_len, self.data.shape[1]), dtype='float32')
            for c in range(self.data.shape[1]):
                resampled_chunk[:, c] = np.interp(new_indices, old_indices, chunk[:, c])
                
            chunk = resampled_chunk

        # If we have enough data to fill buffer
        if len(chunk) >= len(outdata):
            outdata[:] = chunk[:len(outdata)]
        else:
            outdata[:len(chunk)] = chunk
            outdata[len(chunk):] = 0
            # We hit end of file but still filled some buffer. 
            # Next call will trigger CallbackStop
            
    def update_logic(self):
        """Check key states and update speed/cursor"""
        now = time.time()
        
        # --- Next Track Logic (Ctrl + Right Arrow) ---
        if keyboard.is_pressed('ctrl+right'):
            if self.next_pressed_time is None:
                self.next_pressed_time = now
            else:
                duration = now - self.next_pressed_time
                if duration > self.hold_threshold:
                    # Fast forward
                    # Speed = 1 + log(1 + duration - 1)
                    # Shallow slope
                    with self.lock:
                        self.speed = 1.0 + 0.5 * math.log(1 + (duration - self.hold_threshold))
                        print(f"\rFast Forward Speed: {self.speed:.2f}x", end="")
        else:
            if self.next_pressed_time is not None:
                # Key released
                duration = now - self.next_pressed_time
                if duration <= self.hold_threshold:
                    # Seek forward
                    with self.lock:
                        self.cursor += int(self.seek_seconds * self.fs)
                        self.cursor = min(self.cursor, self.n_frames)
                        print(f"\nSeek Forward +{self.seek_seconds}s")
                
                # Reset speed and state
                with self.lock:
                    self.speed = 1.0
                self.next_pressed_time = None
                
        # --- Prev Track Logic (Ctrl + Left Arrow) ---
        if keyboard.is_pressed('ctrl+left'):
            if self.prev_pressed_time is None:
                self.prev_pressed_time = now
            else:
                duration = now - self.prev_pressed_time
                if duration > self.hold_threshold:
                     # Fast Forward (as per user request "If the keys are holded... fast forward")
                     with self.lock:
                        self.speed = 1.0 + 0.5 * math.log(1 + (duration - self.hold_threshold))
                        print(f"\rFast Forward (Prev Key) Speed: {self.speed:.2f}x", end="")
        else:
            if self.prev_pressed_time is not None:
                duration = now - self.prev_pressed_time
                if duration <= self.hold_threshold:
                    # Seek backward
                    with self.lock:
                        self.cursor -= int(self.seek_seconds * self.fs)
                        self.cursor = max(0, self.cursor)
                        print(f"\nSeek Backward -{self.seek_seconds}s")
                
                with self.lock:
                    self.speed = 1.0
                self.prev_pressed_time = None

    def play(self):
        print("Playing... Press 'Ctrl+Right' to seek +2s (Hold to FF). Press 'Ctrl+Left' to seek -2s.")
        with self.stream:
            while self.stream.active:
                self.update_logic()
                time.sleep(0.05)
        print("\nPlayback finished.")

if __name__ == "__main__":
    import os # Ensure os is imported in main block if used before class init
    
    if len(sys.argv) < 2:
        # Auto-watch latest file
        if os.path.exists("results"):
             # Get list of wav files with full paths
             files = [os.path.join("results", f) for f in os.listdir("results") if f.endswith(".wav")]
             if files:
                 # Sort by modification time (newest last)
                 files.sort(key=os.path.getmtime)
                 target = files[-1]
                 print(f"Auto-detected latest file: {target}")
             else:
                 target = "results/Hello__I_am_running__F2.wav"
        else:
             target = "results/Hello__I_am_running__F2.wav"

        if not os.path.exists(target):
             print("No WAV file found in results/.")
             print("Usage: python player.py <wav_file>")
             sys.exit(1)
                 
        file_to_play = target
    else:
        file_to_play = sys.argv[1]

    if not os.path.exists(file_to_play):
        print(f"File not found: {file_to_play}")
        sys.exit(1)

    player = InteractivePlayer(file_to_play)
    player.play()
