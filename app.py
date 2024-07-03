

import base64
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import whisper
from datetime import datetime
import os
import base64

app = Flask(__name__)


socketio = SocketIO(app)
model = whisper.load_model("base") #base model

@app.route('/')
def index():
    return render_template('index.html')



def video_saver(data,file_name):
    try:
        data = base64.b64decode(data)
        with open(file_name, 'ab') as f:
            f.write(data)
    except Exception as e:
        print(f"error occured: {e =}")

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    try:
        file_name = data["file_name"]
        input_path = f"audio/{file_name}.mp3"
        if 'audio' in data:
            video_saver(data["audio"],input_path)
        else:
            pass
            # video_saver(data["video"],f"videos/{file_name}.webm")
    except Exception as e:
        print(f"error at here {e =}")



@socketio.on('stop_recording')
def stop_recording(data):
    try:
        file_name = data["file_name"]
        input_path = f"audio/{file_name}.mp3"
        transcription = model.transcribe(input_path, fp16=False, language="en")
        captions = transcription["text"]
        socketio.emit('transcription_result', {'transcript': captions})
    except Exception as e:
        print(f"Error saving video: {e}")
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

if __name__ == '__main__':
    socketio.run(app, debug=True, use_reloader=True)

