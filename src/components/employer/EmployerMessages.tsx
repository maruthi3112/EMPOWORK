import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Search, Send, Phone, User, Star, MapPin, Award, 
  ExternalLink, Smile, Paperclip, Check, ShieldCheck, Image, Clock, Info, CheckCircle2
} from "lucide-react";
import { UserProfile } from "../../types";

interface EmployerMessagesProps {
  user: UserProfile;
  userProfiles: Record<string, UserProfile>;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  read: boolean;
  imageAttachment?: string;
}

export default function EmployerMessages({
  user,
  userProfiles = {}
}: EmployerMessagesProps) {
  
  const listWorkers = Object.values(userProfiles).filter(p => p.role === "worker");
  
  const [activeWorkerId, setActiveWorkerId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [typing, setTyping] = useState(false);

  // Message Streams state
  const [streams, setStreams] = useState<Record<string, Message[]>>(() => {
    // Local storage chats
    const saved = localStorage.getItem(`empo_chats_${user.uid}`);
    if (saved) return JSON.parse(saved);

    // Initial Seed messages
    const initial: Record<string, Message[]> = {};
    return initial;
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // If streams are empty, pre-populate chats for the first 3 workers so the directory is populated
  useEffect(() => {
    if (Object.keys(streams).length === 0 && listWorkers.length > 0) {
      const initial: Record<string, Message[]> = {};
      const workersToSeed = listWorkers.slice(0, 3);
      
      workersToSeed.forEach((w, idx) => {
        const seedMsgs: Message[] = [
          {
            id: `msg-seed-1-${w.uid}`,
            senderId: w.uid,
            senderName: w.name,
            text: `Hello Sir, I applied for your ${w.trade || "Mason"} post. Is there any PPE gear needed on site?`,
            timestamp: "08:15 AM",
            read: idx > 0
          }
        ];
        if (idx === 0) {
          seedMsgs.push({
            id: `msg-seed-2-${w.uid}`,
            senderId: user.uid,
            senderName: user.name,
            text: `Yes, we provide safety helmets but please bring your own steel-toed boots.`,
            timestamp: "08:20 AM",
            read: true
          });
          seedMsgs.push({
            id: `msg-seed-3-${w.uid}`,
            senderId: w.uid,
            senderName: w.name,
            text: `Perfect, I have my steel boots and safety gloves ready. See you on-site at 8 AM.`,
            timestamp: "08:22 AM",
            read: false
          });
        }
        initial[w.uid] = seedMsgs;
      });
      setStreams(initial);
      localStorage.setItem(`empo_chats_${user.uid}`, JSON.stringify(initial));
    }
  }, [listWorkers, streams]);

  // Set default active worker
  useEffect(() => {
    if (!activeWorkerId && listWorkers.length > 0) {
      setActiveWorkerId(listWorkers[0].uid);
    }
  }, [listWorkers, activeWorkerId]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streams, activeWorkerId, typing]);

  // Save streams helper
  const saveStreams = (updated: Record<string, Message[]>) => {
    setStreams(updated);
    localStorage.setItem(`empo_chats_${user.uid}`, JSON.stringify(updated));
  };

  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeWorkerId) return;

    const worker = userProfiles[activeWorkerId] || listWorkers.find(w => w.uid === activeWorkerId);
    if (!worker) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: user.uid,
      senderName: user.name,
      text: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true
    };

    const updatedStream = [...(streams[activeWorkerId] || []), newMsg];
    const updatedStreams = { ...streams, [activeWorkerId]: updatedStream };
    saveStreams(updatedStreams);
    setInputMessage("");

    // Trigger auto-reply from the worker
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      
      const responses = [
        "Got it sir! On my way to the site now.",
        "Yes, I will report to the site supervisor cabin at 8:00 AM.",
        "Thank you sir. I will make sure the mortar mix ratio is aligned to 1:4 standard.",
        "Understood, safety helmet and steel boots are already cleared.",
        "Can you please approve my checked-out attendance log so I can check the wage status, thank you sir."
      ];
      
      const randomReplyText = responses[Math.floor(Math.random() * responses.length)];
      const autoReply: Message = {
        id: `msg-reply-${Date.now()}`,
        senderId: worker.uid,
        senderName: worker.name,
        text: randomReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      const updatedWithReply = {
        ...updatedStreams,
        [activeWorkerId]: [...(updatedStreams[activeWorkerId] || []), autoReply]
      };
      saveStreams(updatedWithReply);
    }, 1500);
  };

  // Simulated site photo attachment select
  const handleAttachProgressPhoto = () => {
    if (!activeWorkerId) return;
    
    // preset beautiful construction progress images
    const photos = [
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=400", // foundations
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=400", // site brickwork
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&q=80&w=400"  // steel frames
    ];
    
    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
    
    const newMsg: Message = {
      id: `msg-photo-${Date.now()}`,
      senderId: user.uid,
      senderName: user.name,
      text: "📸 Dispatched construction progress reference photo:",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true,
      imageAttachment: randomPhoto
    };

    const updatedStream = [...(streams[activeWorkerId] || []), newMsg];
    saveStreams({ ...streams, [activeWorkerId]: updatedStream });
    alert("🎉 Site progress photo uploaded and sent successfully!");
  };

  // Search Chat Directory filter
  const filteredWorkers = listWorkers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (w.trade || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const activeWorker = userProfiles[activeWorkerId] || listWorkers.find(w => w.uid === activeWorkerId);
  const activeChatMsgs = streams[activeWorkerId] || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs h-[calc(100vh-12rem)] flex overflow-hidden animate-in fade-in duration-300">
      
      {/* Left Pane: Chat Directory */}
      <div className="w-full md:w-80 border-r border-slate-200 flex flex-col shrink-0 h-full">
        
        {/* Search header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest block">Communications Directory</span>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat workers..."
              className="w-full p-2 pl-9 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 font-semibold"
            />
          </div>
        </div>

        {/* Directory List scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredWorkers.length > 0 ? (
            filteredWorkers.map((w) => {
              const chatMsgs = streams[w.uid] || [];
              const lastMsg = chatMsgs[chatMsgs.length - 1];
              const unreadCount = chatMsgs.filter(m => m.senderId === w.uid && !m.read).length;
              const isActive = w.uid === activeWorkerId;

              let dotColor = "bg-emerald-500";
              if (w.statusState === "busy") dotColor = "bg-amber-500";
              else if (w.statusState === "offline") dotColor = "bg-slate-400";

              return (
                <button
                  key={w.uid}
                  onClick={() => {
                    setActiveWorkerId(w.uid);
                    // Mark messages as read
                    if (streams[w.uid]) {
                      const marked = streams[w.uid].map(m => m.senderId === w.uid ? { ...m, read: true } : m);
                      saveStreams({ ...streams, [w.uid]: marked });
                    }
                  }}
                  className={`w-full p-4 flex items-start space-x-3 text-left transition-colors cursor-pointer ${isActive ? "bg-amber-50/30 border-l-4 border-amber-500 bg-amber-50/20" : "hover:bg-slate-50/60"}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-500 flex items-center justify-center font-black text-sm border border-slate-850">
                      {w.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${dotColor}`} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-950 text-xs uppercase truncate block">{w.name}</span>
                      <span className="text-[8px] text-slate-400 font-mono font-bold uppercase">{lastMsg ? lastMsg.timestamp : "N/A"}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{w.trade || "Laborer"}</p>
                    <p className="text-[11px] text-slate-600 font-semibold truncate leading-relaxed">
                      {lastMsg ? lastMsg.text : "Click to initiate site chat..."}
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <span className="w-4.5 h-4.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No workers registered matching queries.
            </div>
          )}
        </div>

      </div>

      {/* Middle Pane: Chat view */}
      {activeWorker ? (
        <div className="flex-1 flex flex-col h-full bg-slate-50/30">
          
          {/* Chat active Header */}
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-500 flex items-center justify-center font-black text-sm border border-slate-800 shrink-0">
                {activeWorker.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <span className="font-black text-slate-950 text-xs uppercase block">{activeWorker.name}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50/50 px-2 py-0.5 rounded-full border border-amber-100">
                  {activeWorker.trade || "Laborer"}
                </span>
              </div>
            </div>

            <a
              href={`tel:${activeWorker.phone || "987654321"}`}
              className="inline-flex items-center px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-[10px] font-black text-slate-700 uppercase tracking-wider cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" /> Dial Phone
            </a>
          </div>

          {/* Active Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeChatMsgs.length > 0 ? (
              activeChatMsgs.map((m) => {
                const isMe = m.senderId === user.uid;

                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] space-y-1 ${isMe ? "text-right" : "text-left"}`}>
                      <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                        {isMe ? "Foreman" : m.senderName}
                      </span>
                      <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed border ${
                        isMe ? "bg-slate-950 text-amber-400 rounded-tr-none border-slate-900 shadow-sm" : "bg-white text-slate-850 rounded-tl-none border-slate-200/60 shadow-xs"
                      }`}>
                        
                        {/* Text */}
                        <p>{m.text}</p>
                        
                        {/* Render progress photo attachment preview if any */}
                        {m.imageAttachment && (
                          <div className="mt-2.5 rounded-lg overflow-hidden border border-slate-150 bg-slate-100 shadow-xs">
                            <img
                              src={m.imageAttachment}
                              alt="Progress Preview"
                              referrerPolicy="no-referrer"
                              className="w-full h-32 object-cover"
                            />
                            <div className="p-1.5 bg-slate-950 text-white font-mono text-[8px] text-center font-bold uppercase tracking-wider">
                              Site Conditions Checked
                            </div>
                          </div>
                        )}

                      </div>
                      <div className="flex items-center space-x-1.5 justify-end text-[8px] text-slate-400 font-mono font-bold uppercase">
                        <span>{m.timestamp}</span>
                        {isMe && <Check className="w-3 h-3 text-amber-500" />}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-semibold">Initiate shift guidelines and dispatch chat instructions.</p>
              </div>
            )}

            {/* Simulated typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="space-y-1">
                  <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    {activeWorker.name}
                  </span>
                  <div className="bg-white p-3 border border-slate-200/60 shadow-xs rounded-2xl rounded-tl-none text-xs font-bold text-slate-500 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat bottom Input */}
          <form onSubmit={handleSendMessageSubmit} className="p-4 border-t border-slate-200 bg-white shrink-0 flex items-center space-x-2">
            <button
              type="button"
              onClick={handleAttachProgressPhoto}
              className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
              title="Upload Site Progress Reference Photo"
            >
              <Image className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Write on-site message instructions to ${activeWorker.name}...`}
              className="flex-1 p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-semibold focus:outline-hidden focus:border-amber-500"
            />
            <button
              type="submit"
              className="p-2.5 bg-slate-950 hover:bg-slate-850 text-amber-500 rounded-xl cursor-pointer border border-slate-850 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-400 space-y-2">
          <MessageSquare className="w-10 h-10 text-slate-300" />
          <p className="text-xs font-semibold">Select registered laborer to launch communications portal.</p>
        </div>
      )}

      {/* Right Pane: Mini worker profile details */}
      {activeWorker && (
        <div className="hidden lg:flex w-64 border-l border-slate-200 flex-col shrink-0 p-5 bg-white space-y-5 h-full">
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Contractor Summary</span>
            <h4 className="font-black text-slate-950 uppercase text-xs leading-tight">{activeWorker.name}</h4>
          </div>

          <div className="space-y-4">
            {/* Rating */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 font-mono text-[10px] font-black text-slate-500 uppercase">
              <span>Audited Rating</span>
              <div className="flex items-center text-amber-500 text-sm font-black text-slate-900 mt-0.5">
                <Star className="w-4 h-4 fill-amber-500 mr-1" />
                <span>{activeWorker.averageRating?.toFixed(1) || "5.0"}</span>
                <span className="text-slate-400 font-bold ml-1">({activeWorker.ratingCount || 1} evaluations)</span>
              </div>
            </div>

            {/* Profile brief */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Skills Overview</span>
              <p className="text-slate-600 font-semibold leading-relaxed">
                {activeWorker.bio || " Hardworking site professional. Verified safety equipment clearance."}
              </p>
            </div>

            <div className="space-y-2.5 text-xs border-t border-slate-100 pt-4">
              <div className="flex items-center space-x-1.5 text-slate-500 font-bold">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-900">{activeWorker.location || "Bengaluru, IN"}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-500 font-bold">
                <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-slate-900">{activeWorker.shiftsCompleted || 14} Shifts Completed</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
