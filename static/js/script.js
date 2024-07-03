

const video = document.getElementById('video');
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const transcriptDiv = document.getElementById('transcript');
const socket = io();

let mediaRecorder;
let audioRecorder;
let recordedChunks = [];
let audioChunks = [];
let stream;
const now = new Date();
let timestamp;
recordButton.onclick = () => {
    timestamp = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_${String(now.getSeconds()).padStart(2, '0')}`;
    recordButton.disabled = true;
    stopButton.disabled = false;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(mediaStream => {
            stream = mediaStream;
            video.srcObject = stream;
            startRecording(stream);
            startAudioRecording(stream);
        })
        .catch(error => {
            console.error('Error accessing media devices.', error);
        });
};

stopButton.onclick = () => {
    stopRecording();
    recordButton.disabled = false;
    stopButton.disabled = true;
};

function startRecording(stream) {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
            processAudioChunk({"video":event.data});
        }
    };
    mediaRecorder.start(2000);
}

function startAudioRecording(stream) {
    const audioStream = new MediaStream(stream.getAudioTracks());
    audioRecorder = new MediaRecorder(audioStream);
    audioRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
            processAudioChunk({"audio":event.data});
        }
    };
    audioRecorder.start(3000); 
}


function stopRecording() {
    mediaRecorder.stop();
    audioRecorder.stop();

    mediaRecorder.onstop = () => {
        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

        stopCamera();

        const videoUrl = URL.createObjectURL(videoBlob);
        video.srcObject = null;
        video.src = videoUrl;
        video.controls = true;
        video.play();
        socket.emit('stop_recording', {"file_name":timestamp});
    };
}


function stopCamera() {
    let tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
}

function processAudioChunk(chunk) {
    if("audio" in chunk){
        chunk = chunk["audio"]
    console.log("Processing audio chunk", chunk);
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        console.log(`Base64 data: ${base64data.slice(0, 50)}...`);
        socket.emit('audio_chunk', {"audio":base64data,"file_name":timestamp});
        console.log("Emitting audio chunk to backend");
    };
    reader.onerror = (error) => {
        console.error("Error reading audio chunk:", error);
    };
    reader.readAsDataURL(chunk);
}
else{
    chunk = chunk["video"]
    console.log("Processing video chunk", chunk);
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64data = reader.result.split(',')[2];
        console.log(`Base64 data: ${base64data.slice(0, 50)}...`);
        socket.emit('audio_chunk', {"video":base64data,"file_name":timestamp});
        console.log("Emitting video chunk to backend");
    };
    reader.onerror = (error) => {
        console.error("Error reading video chunk:", error);
    };
    reader.readAsDataURL(chunk);
}
}



socket.on('transcription_result', data => {
    console.log(data.transcript)
    transcriptDiv.innerText = data.transcript;
});