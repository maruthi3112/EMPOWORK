import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, Globe, Check, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../context/LanguageContext";

interface VoiceInputButtonProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  fieldName?: string; // e.g., "Profile" or "Dispute"
  compact?: boolean;  // Renders a sleek micro-button suitable for absolute positioning in inputs
}

const SUPPORTED_LANGUAGES = [
  { code: "en-IN", label: "English (IN)", native: "English" },
  { code: "hi-IN", label: "हिंदी (Hindi)", native: "हिंदी" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)", native: "ಕನ್ನಡ" },
  { code: "te-IN", label: "తెలుగు (Telugu)", native: "తెలుగు" },
];

export default function VoiceInputButton({
  value,
  onChange,
  className = "",
  fieldName = "Input",
  compact = false,
}: VoiceInputButtonProps) {
  const { language } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en-IN");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  // Sync selectedLang dynamically with the active system language context
  useEffect(() => {
    if (language === "hi") {
      setSelectedLang("hi-IN");
    } else if (language === "kn") {
      setSelectedLang("kn-IN");
    } else if (language === "te") {
      setSelectedLang("te-IN");
    } else {
      setSelectedLang("en-IN");
    }
  }, [language]);

  useEffect(() => {
    // Check speech recognition support
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setErrorMsg("Voice dictation is not supported in this browser. Please use Chrome, Safari, or Edge.");
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startListening = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setErrorMsg("Voice input is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false; // Capture block by block for better reliability
      recognition.interimResults = false;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        setIsListening(true);
        // Stop speech playback if speaking
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const trimmedText = transcript.trim();
          const updatedValue = value.trim()
            ? `${value.trim()} ${trimmedText}`
            : trimmedText;
          onChange(updatedValue);
          
          // Show a beautiful, localized success log
          const shortText = trimmedText.length > 30 ? `${trimmedText.substring(0, 30)}...` : trimmedText;
          setSuccessMsg(`Captured: "${shortText}"`);
          setTimeout(() => setSuccessMsg(null), 3500);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMsg("Microphone permission denied. Please allow mic access in browser settings.");
        } else if (event.error === "no-speech") {
          setErrorMsg("No voice detected. Please speak clearly into your mic.");
        } else {
          setErrorMsg(`Voice input issue: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Speech recognition startup failed:", err);
      setErrorMsg("Failed to start voice input. Please try again.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // NATIVE TEXT-TO-SPEECH (SPEECH SYNTHESIS) INTEGRATION
  // Extremely powerful for users with varying levels of literacy who want to hear back what they dictated.
  const toggleSpeechPlayback = () => {
    if (!value.trim()) {
      setErrorMsg("Nothing to read aloud. Please type or dictate your description first.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any other playing system audio
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = selectedLang;

      // Match system voices to ensure correct accent and inflection
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = voices.find(v => 
          v.lang.toLowerCase() === selectedLang.toLowerCase() ||
          v.lang.toLowerCase().replace("_", "-").startsWith(selectedLang.toLowerCase().substring(0, 2))
        );
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setErrorMsg(null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Text to speech failed:", err);
      setIsSpeaking(false);
    }
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  // RENDER COMPACT MODE (Sleek minimalist micro-button)
  if (compact) {
    return (
      <div className={`relative flex items-center ${className}`}>
        <button
          type="button"
          onClick={toggleListening}
          title={`Dictate in ${currentLangObj.native}`}
          className={`p-1.5 rounded-full shadow-xs transition-all flex items-center justify-center cursor-pointer ${
            isListening
              ? "bg-red-500 text-white animate-pulse"
              : "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-800"
          }`}
        >
          {isListening ? (
            <MicOff className="w-3.5 h-3.5" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-red-500 fill-red-500/10" />
          )}
        </button>

        {/* Small floating indicator when listening */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-8 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-2 rounded-md shadow-md whitespace-nowrap z-50 flex items-center gap-1"
            >
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              <span>Speak ({currentLangObj.native})</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // RENDER FULL MODE (Rich accessibility control board for large textareas)
  return (
    <div className={`flex flex-col space-y-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl shadow-xs ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        
        {/* Status indicator */}
        <div className="flex items-center space-x-2">
          {isListening ? (
            <div className="flex items-center space-x-1.5 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider font-mono">
                Dictating ({currentLangObj.native})...
              </span>
            </div>
          ) : isSpeaking ? (
            <div className="flex items-center space-x-1.5 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
              </span>
              <span className="text-[10px] text-violet-700 font-bold uppercase tracking-wider font-mono">
                Reading Aloud...
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-slate-500">
              <Mic className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                Voice Assist Available
              </span>
            </div>
          )}
        </div>

        {/* Buttons & Language Selector */}
        <div className="flex items-center space-x-1.5 relative">
          
          {/* Language Toggle Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 hover:text-slate-950 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-2xs transition-all"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>{currentLangObj.native}</span>
            </button>

            {showLangMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="absolute right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[130px] py-1 overflow-hidden">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setSelectedLang(lang.code);
                        setShowLangMenu(false);
                        if (isListening) {
                          // Restart with the newly selected speech language
                          if (recognitionRef.current) {
                            recognitionRef.current.abort();
                          }
                          setTimeout(() => startListening(), 100);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-slate-50 flex items-center justify-between ${
                        selectedLang === lang.code ? "text-indigo-600 bg-indigo-50/50" : "text-slate-600"
                      }`}
                    >
                      <span>{lang.native}</span>
                      {selectedLang === lang.code && <Check className="w-3 h-3 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* READ BACK (TEXT-TO-SPEECH PLAYBACK) */}
          {/* Highly effective accessibility feature for users with low-literacy */}
          <button
            type="button"
            onClick={toggleSpeechPlayback}
            title={isSpeaking ? "Stop speech" : "Listen to what is written"}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs border ${
              isSpeaking
                ? "bg-violet-600 text-white border-violet-600 animate-pulse"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950"
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Volume2 className={`w-3.5 h-3.5 ${value.trim() ? "text-violet-600" : "text-slate-400"}`} />
                <span>Hear Text</span>
              </>
            )}
          </button>

          {/* CORE DICTATION (SPEECH-TO-TEXT) BUTTON */}
          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
              isListening
                ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-950"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5 animate-bounce" />
                <span>Done</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-red-500 fill-red-500/10" />
                <span>Dictate</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* Real-time speech visualizer waves */}
      {isListening && (
        <div className="flex items-center justify-center space-x-1 h-4 py-1.5 bg-red-50/50 rounded-lg border border-red-100/30">
          <div className="w-0.5 h-full bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.5s" }} />
          <div className="w-0.5 h-1/2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "100ms", animationDuration: "0.4s" }} />
          <div className="w-0.5 h-3/4 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "200ms", animationDuration: "0.6s" }} />
          <div className="w-0.5 h-1/3 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.3s" }} />
          <div className="w-0.5 h-full bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.5s" }} />
          <div className="w-0.5 h-2/3 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "250ms", animationDuration: "0.4s" }} />
          <div className="w-0.5 h-full bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "350ms", animationDuration: "0.7s" }} />
        </div>
      )}

      {/* TTS wave rendering */}
      {isSpeaking && (
        <div className="flex items-center justify-center space-x-1 h-4 py-1.5 bg-violet-50/50 rounded-lg border border-violet-100/30 animate-pulse">
          <div className="w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: "0ms" }} />
          <div className="w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: "200ms" }} />
          <div className="w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: "400ms" }} />
        </div>
      )}

      {/* Message alerts */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start space-x-1.5 p-2 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-600 font-semibold shadow-2xs"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
        
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start space-x-1.5 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] text-emerald-700 font-semibold shadow-2xs"
          >
            <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            <span className="truncate">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
