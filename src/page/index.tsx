import React, { useState, useEffect, useRef, useMemo } from "react";
//@ts-ignore
import styles from "./index.module.css";
//@ts-ignore
import logo from "../assets/images/logo.mp4";
import { io } from "socket.io-client";

export default function Main() {
  const [isListening, setIsListening] = useState<Boolean>(false);
  const [isLoading, setIsLoading] = useState<Boolean>(false);
  const [hasPlayed, setHasPlayed] = useState<Boolean>(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const questionInputRef = useRef();
  const audioPlayerRef = useRef();
  const listenBoardRef = useRef();
  const loadingBoardRef = useRef();
  const videoPlayerRef = useRef();
  const latestAnswerRef = useRef();
  const socket = useMemo(() => io("http://localhost:3001"), []);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    socket.on("connect", () => {
      socket.on("answer_sent", (args) => {
        const audioBlob = new Blob([args.audioAnswerBuffer], {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        setAudioURL(audioUrl);
        // @ts-ignore
        // const SpeechRecognition =
        //   window.SpeechRecognition || window.webkitSpeechRecognition;
        // const recognition = new SpeechRecognition();
        // // Key configuration options:
        // recognition.continuous = true; // Don't stop listening after the first result
        // recognition.interimResults = true; // Get results while user is still speaking

        // // Main events you can listen for:
        // recognition.onstart = () => {
        //   // Triggered when the speech recognition service starts listening
        //   console.log("Speech recognition started");
        // };

        // recognition.onresult = (event) => {
        //   // Triggered when speech is recognized
        //   // event.results contains the recognized text
        //   const transcript = Array.from(event.results)
        //     .map((result:any) => result[0])
        //     .map((result) => result.transcript)
        //     .join("");
        //   console.log("Heard:", transcript);
        // };

        // recognition.onerror = (event) => {
        //   // Triggered if there's an error
        //   console.error("Speech recognition error:", event.error);
        // };

        // recognition.onend = () => {
        //   // Triggered when speech recognition service disconnects
        //   console.log("Speech recognition ended");
        // };
        setAnswers((answers) => [...answers, args.answer]);
        if (latestAnswerRef.current) {
          console.log(latestAnswerRef.current)
          latestAnswerRef.current.scrollIntoView(false);
        }
        setIsLoading(false);
        setHasPlayed(false);
      });
    });

    return () => {
      socket.removeAllListeners();
    };
  }, [socket]);

  useEffect(() => {
    if (isListening || isLoading || hasPlayed) return;
    if (!audioPlayerRef.current || audioURL == "") return;
    audioPlayerRef.current.play();
    setHasPlayed(true);
  }, [audioURL, isListening, isLoading]);

  const startRecording = async () => {
    try {
      setIsListening(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        audioBlob
          .arrayBuffer()
          .then((fileBuffer) => {
            // send audio recording
            socket.emit("audio_question_query", fileBuffer);
            setIsLoading(true);
          })
          .catch((e: any) => {
            console.log(e);
          });
        audioChunks.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
  };

  const handleRecording = async () => {
    try {
      if (!isRecording) {
        await startRecording();
      } else {
        stopRecording();
      }
    } catch (e) {
      setIsListening(false);
      alert("Error");
    }
    setIsRecording(!isRecording);
  };

  const handleMessage = async () => {
    if (isLoading || isListening) return;
    const input = questionInputRef.current?.value;

    if (input == "") return;
    socket.emit("text_question_query", input);
    setIsLoading(true);
    questionInputRef.current.value = "";
  };

  useEffect(() => {
    if (!isListening || listenBoardRef.current) return;
    listenBoardRef.current.scrollToTop();
  }, [isListening]);

  useEffect(() => {
    if (!isListening || isLoading) return;
    audioPlayerRef.current.pause();
    setHasPlayed(true);
  }, [isLoading, isListening]);

  return (
    <div className={styles.mainContainer}>
      <div className={styles.rectangle} />
      <div className={styles.rectangle1}>
        <div className={styles.welcomeLogo}>
          <div className={styles.sparkler} />
          <span className={styles.helloIke}>Hello Serena!</span>
        </div>
        <video
          autoPlay
          muted
          loop
          ref={videoPlayerRef}
          className={styles.videoToGif}
        >
          <source src={logo} type="video/mp4" />
        </video>
        <div className={styles.messageBoxes}>
          {isListening ? (
            <div className={styles.messageBox} ref={listenBoardRef}>
              <span className={styles.listening}>Listening...</span>
            </div>
          ) : (
            <></>
          )}
          {isLoading ? (
            <div className={styles.messageBox} ref={loadingBoardRef}>
              <span className={styles.listening}>Loading...</span>
            </div>
          ) : (
            <></>
          )}
          {answers.reverse().map((answer, index) => (
            <div
              className={styles.messageBox3}
              key={index}
              ref={index === answers.length - 1 ? latestAnswerRef : null}
            >
              {answer}
            </div>
          ))}
          <div
            className={styles.messageBox3}
            style={{ background: "transparent", boxShadow: "none" }}
          ></div>
        </div>
        <div className={styles.inputArea}>
          <div className={styles.rectangle5}>
            <div className={styles.sparkler6} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleMessage();
              }}
            >
              <input
                type="text"
                placeholder="Ask me anything"
                className={styles.askMeAnything}
                ref={questionInputRef}
              />
            </form>
          </div>
          <audio
            controls={false}
            src={audioURL}
            style={{ display: "none" }}
            ref={audioPlayerRef}
          ></audio>
          <div className={styles.rectangle7}>
            <button
              className={styles.mic}
              onClick={handleRecording}
              disabled={isLoading}
            />
            <button
              className={styles.tools}
              onClick={handleMessage}
              disabled={isListening}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
