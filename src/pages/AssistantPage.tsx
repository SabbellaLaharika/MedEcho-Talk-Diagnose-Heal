import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Globe, Bot, User as UserIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';

// Languages supported by Web Speech API
const LANGUAGES = [
    { code: 'en-US', name: 'English', label: 'English' },
    { code: 'hi-IN', name: 'Hindi', label: 'हिन्दी (Hindi)' },
    { code: 'te-IN', name: 'Telugu', label: 'తెలుగు (Telugu)' },
    { code: 'ta-IN', name: 'Tamil', label: 'தமிழ் (Tamil)' },
    { code: 'bn-IN', name: 'Bengali', label: 'বাংলা (Bengali)' },
    { code: 'gu-IN', name: 'Gujarati', label: 'ગુજરાતી (Gujarati)' },
    { code: 'kn-IN', name: 'Kannada', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml-IN', name: 'Malayalam', label: 'മലയാളം (Malayalam)' },
    { code: 'pa-IN', name: 'Punjabi', label: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'mr-IN', name: 'Marathi', label: 'मराठी (Marathi)' }
];

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: Date;
}

const AssistantPage: React.FC = () => {
    const { currentUser } = useData();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [selectedLang, setSelectedLang] = useState('en-US');
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState({}); // Stores conversation state for backend

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Speech Recognition Setup
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onstart = () => {
                console.log('Speech recognition started');
                setIsListening(true);
            };

            recognitionRef.current.onresult = (event: any) => {
                let finalSentence = '';
                let interimSentence = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalSentence += transcript + ' ';
                    } else {
                        interimSentence += transcript;
                    }
                }

                // Show BOTH final and interim text so user sees instant feedback
                // We need a way to append final to previous input, but replace interim
                // Simplest way for this chat input: Just set the input value
                // Warning: This overrides manual typing if mixed. But for voice mode it's fine.
                // To do it right: We should probably store "committed" text separately?
                // For now, let's just append final to current input state? 
                // No, 'input' state is the source of truth.

                // Better strategy:
                // Input = (Existing Text before current speech session) + (Current Final) + (Current Interim)
                // This is hard to track without extra state.

                // Simple Strategy (User Logic):
                // Just constantly update 'input' with what we hear.
                // If we use 'continuous', results accumulate? 
                // Chrome's 'continuous' mode keeps adding results.

                if (finalSentence || interimSentence) {
                    // We need to be careful not to overwrite what user typed before starting mic
                    // But here we assume mic is the primary input method during this session.
                    // Let's just append to the *end* of the input? 
                    // No, onresult fires repeatedly. 

                    // Let's rely on the browser's accumulated result list if possible, or just build from event.
                    // The event has ALL results if continuous is true? No, usually start index changes.

                    // Let's just log for debugging and try the standard "Interim feedback" approach
                    console.log('Interim:', interimSentence, 'Final:', finalSentence);

                    if (finalSentence) {
                        setInput(prev => (prev + finalSentence).trimStart());
                    }
                    // todo: show interim somewhere? 
                    // For now let's just commit final.
                    // User said "not taking voice". 
                    // Maybe they are speaking but it never becomes final?
                    // Let's force update with interim too?
                    if (interimSentence) {
                        // This causes flickering if we add/remove interim from main input.
                        // We will add a temporary UI element for interim?
                        // Or just placeholder?
                    }
                }
            };

            recognitionRef.current.onend = () => {
                console.log('Speech recognition ended');
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
                alert(`Microphone Error: ${event.error}. Please check permissions.`);
            };
        } else {
            alert("Your browser does not support Voice Recognition. Please use Chrome or Edge.");
        }
    }, []);

    // Update language when selected
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = selectedLang;
        }
    }, [selectedLang]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initial Greeting
    useEffect(() => {
        if (messages.length === 0) {
            const greeting = {
                id: '1',
                sender: 'bot' as const,
                text: `Namaste ${currentUser?.name || ''}! I am MedEcho. How are you feeling today?`,
                timestamp: new Date()
            };
            setMessages([greeting]);
            speak(greeting.text);
        }
    }, [currentUser]);

    const speak = (text: string, lang: string = selectedLang) => {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang; // Use the detected language for speech
        // Fallback for some browsers that might need specific voice selection
        // For now, setting .lang is sufficient for standard implementations
        synth.speak(utterance);
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (!input.trim()) setInput('');

            // Enforce language before starting
            if (recognitionRef.current) {
                recognitionRef.current.lang = selectedLang;
                console.log('Starting recognition in:', selectedLang);
            }

            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;

        // Add User Message
        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: text,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Call Python Backend with EXPLICIT Language
            // We strip the region code (e.g., 'hi-IN' -> 'hi') for the translator
            const langCode = selectedLang.split('-')[0];

            const response = await fetch('http://localhost:5001/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    context: context,
                    lang: langCode // Send selected language hint
                })
            });

            const data = await response.json();

            // Update Context
            setContext(data.context);

            // Add Bot Message
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: data.response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);

            // Speak in the DETECTED language (or input language)
            speak(data.response, data.lang || selectedLang);

            // CHECK FOR FINAL REPORT
            if (data.context && data.context.final_report) {
                console.log("Final Report Ready:", data.context);
                await saveReportToBackend(data.context);
            }

        } catch (error) {
            console.error('Error connecting to ML service:', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: "I'm having trouble connecting to my diagnostic brain. Is the Python server running?",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
            speak("I'm having trouble connecting. Please check the server.");
        } finally {
            setIsLoading(false);
        }
    };

    const saveReportToBackend = async (finalContext: any) => {
        try {
            const token = localStorage.getItem('token'); // Assuming Auth context saves token here or we use currentUser
            // Better to use currentUser token if available in context, but standard is localStorage

            const reportData = {
                symptoms: finalContext.collected_symptoms,
                disease: finalContext.diagnosis,
                confidence: finalContext.confidence,
                history: finalContext.history
            };

            const res = await fetch('http://localhost:5000/api/diagnosis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(reportData)
            });

            if (res.ok) {
                const savedReport = await res.json();
                const successMsg: Message = {
                    id: Date.now().toString(),
                    sender: 'bot',
                    text: `✅ Medical Report Generated! You can view it in your "My Reports" section. Report ID: ${savedReport.id.substring(0, 8)}`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, successMsg]);
                speak("I have generated your medical report and saved it to your profile.");
            } else {
                console.error("Failed to save report");
            }

        } catch (err) {
            console.error("Error saving report to backend:", err);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col p-4">
            {/* Language Selector Bar */}
            <Card className="mb-4 p-4 flex flex-wrap items-center justify-between gap-4 bg-white shadow-sm flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-full">
                        <Bot className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">MedEcho AI Assistant</h1>
                        <p className="text-xs text-gray-500">Voice-Powered Diagnosis</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-gray-500" />
                    <select
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value)}
                        className="form-select block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Chat Area */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden flex flex-col relative">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${msg.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {msg.sender === 'bot' && <Bot className="h-4 w-4 opacity-50" />}
                                    {msg.sender === 'user' && <UserIcon className="h-4 w-4 opacity-50" />}
                                    <span className="text-xs opacity-70">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-base leading-relaxed">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                        {/* Microphone Button with Animation */}
                        <button
                            onClick={toggleListening}
                            className={`p-4 rounded-full transition-all duration-300 shadow-lg ${isListening
                                ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            title={isListening ? "Stop Listening" : "Start Listening"}
                        >
                            {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                        </button>

                        {/* Text Input */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={isListening ? "Listening..." : "Type or speak your symptoms..."}
                                className="w-full border-gray-300 rounded-full pl-5 pr-12 py-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                disabled={isListening}
                            />
                            {isListening && (
                                <div className="absolute left-5 top-3 text-gray-400 pointer-events-none truncate max-w-[80%]">
                                    {/* We can't easily overlay text on input value here without complex CSS. 
                                        Instead, let's put it BELOW the input or use a placeholder change? */}
                                </div>
                            )}
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isListening}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="text-center mt-2">
                        <span className={`text-xs font-medium ${isListening ? 'text-red-500' : 'text-gray-400'}`}>
                            {isListening ? 'Listening... Tap microphone to STOP and SEND' : 'Tap the microphone to speak'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssistantPage;
