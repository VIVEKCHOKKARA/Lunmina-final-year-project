import { useState, useEffect, useRef } from "react";
import { 
  fetchChatHistory, 
  fetchChatSessions, 
  deleteChatSession, 
  saveChatMessage, 
  getChatStreamUrl, 
  getAuthToken,
  ChatSession 
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  Plus, 
  History, 
  MessageSquare, 
  Trash2, 
  ChevronDown,
  Globe
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const LANGUAGES = [
  { code: "auto", label: "🌐 Auto Detect" },
  { code: "en", label: "🇬🇧 English" },
  { code: "te", label: "🇮🇳 తెలుగు (Telugu)" },
  { code: "hi", label: "🇮🇳 हिंदी (Hindi)" },
  { code: "ta", label: "🇮🇳 தமிழ் (Tamil)" },
  { code: "gu", label: "🇮🇳 ગુજરાતી (Gujarati)" },
  { code: "kn", label: "🇮🇳 ಕನ್ನಡ (Kannada)" },
  { code: "ml", label: "🇮🇳 മലയാളം (Malayalam)" },
  { code: "mr", label: "🇮🇳 मराठी (Marathi)" },
  { code: "bn", label: "🇮🇳 বাংলা (Bengali)" },
];

const SUGGESTIONS: Record<string, string[]> = {
  en: [
    "What is my total net profit?",
    "Top selling products?",
    "Show expense breakdown",
    "Which shop branch generated highest revenue?"
  ],
  te: [
    "నా మొత్తం నికర లాభం ఎంత?",
    "ఎక్కువ అమ్మకాలు ఉన్న ఉత్పత్తులు ఏవి?",
    "ఖర్చుల వివరాలు చూపించు",
    "ఏ షాప్ బ్రాంచ్ లో ఎక్కువ ఆదాయం వచ్చింది?"
  ],
  hi: [
    "मेरा कुल शुद्ध लाभ कितना है?",
    "सबसे ज्यादा बिकने वाले उत्पाद कौन से हैं?",
    "खर्चों का विवरण दिखाएं",
    "किस दुकान शाखा ने सबसे अधिक राजस्व उत्पन्न किया?"
  ],
  ta: [
    "எனது மொத்த நிகர லாபம் எவ்வளவு?",
    "அதிகம் விற்கும் பொருட்கள் எவை?",
    "செலவு விவரங்களைக் காட்டு",
    "எந்த கடை கிளை அதிக வருவாயை ஈட்டியது?"
  ],
  gu: [
    "મારો કુલ ચોખ્ખો નફો કેટલો છે?",
    "સૌથી વધુ વેચાતા ઉત્પાદનો કયા છે?",
    "ખર્ચની વિગતો બતાવો",
    "કઈ દુકાન શાખાએ સૌથી વધુ આવક મેળવી?"
  ],
  kn: [
    "ನನ್ನ ಒಟ್ಟು ನಿವ್ವಳ ಲಾಭ ಎಷ್ಟು?",
    "ಹೆಚ್ಚು ಮಾರಾಟವಾಗುವ ಉತ್ಪನ್ನಗಳು ಯಾವುವು?",
    "ವೆಚ್ಚದ ವಿವರಗಳನ್ನು ತೋರಿಸಿ"
  ],
  ml: [
    "എന്റെ ആകെ അറ്റാദായം എത്രയാണ്?",
    "ഏറ്റവും കൂടുതൽ വിറ്റഴിക്കപ്പെടുന്ന ഉൽപ്പന്നങ്ങൾ ഏവ?",
    "ചെലവ് വിവരങ്ങൾ കാണിക്കുക"
  ],
  mr: [
    "माझा एकूण निव्वळ नफा किती आहे?",
    "सर्वात जास्त विकली जाणारी उत्पादने कोणती?",
    "खर्चाचा तपशील दाखवा"
  ],
  bn: [
    "আমার মোট নিট লাভ কত?",
    "সর্বাধিক বিক্রিত পণ্য কোনগুলি?",
    "খরচের বিবরণ দেখান"
  ]
};

export default function AIChatbot({ fullHeight = false }: { fullHeight?: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("default");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>("auto");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);


  // Load available sessions from API
  const loadSessions = async () => {
    try {
      const list = await fetchChatSessions();
      setSessions(list || []);
      return list || [];
    } catch (err) {
      console.error("Failed to load chat sessions:", err);
      return [];
    }
  };

  // Load chat messages for a specific session
  const loadHistoryForSession = async (sid: string) => {
    try {
      const data = await fetchChatHistory(sid);
      if (data && data.length > 0) {
        setMessages(data.map(d => ({ role: d.role as "user" | "assistant", content: d.content })));
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load chat history for session:", sid, err);
      setMessages([]);
    }
  };

  const getUserPrefix = () => {
    const selectedOwnerId = localStorage.getItem("selected_owner_id");
    if (selectedOwnerId) return selectedOwnerId;
    const token = getAuthToken();
    return token ? token.slice(-8) : "owner";
  };

  // Initialize session on mount
  useEffect(() => {
    const init = async () => {
      const list = await loadSessions();
      const userPrefix = getUserPrefix();
      const stored = localStorage.getItem(`active_chat_session_id_${userPrefix}`);
      if (stored && list.some(s => s.session_id === stored)) {
        setSessionId(stored);
        await loadHistoryForSession(stored);
      } else if (list && list.length > 0) {
        setSessionId(list[0].session_id);
        await loadHistoryForSession(list[0].session_id);
      } else {
        const defaultSid = `session_${userPrefix}_init`;
        setSessionId(defaultSid);
        await loadHistoryForSession(defaultSid);
      }
    };
    init();
  }, []);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start a brand new chat session
  const startNewChat = () => {
    const userPrefix = getUserPrefix();
    const newId = `session_${userPrefix}_${Date.now()}`;
    setSessionId(newId);
    localStorage.setItem(`active_chat_session_id_${userPrefix}`, newId);
    setMessages([]);
    toast.success("Started a new chat");
    loadSessions();
  };

  // Switch to a previous chat session
  const switchSession = async (sid: string) => {
    const userPrefix = getUserPrefix();
    setSessionId(sid);
    localStorage.setItem(`active_chat_session_id_${userPrefix}`, sid);
    await loadHistoryForSession(sid);
    setShowHistoryDropdown(false);
  };

  // Delete a chat session history
  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sid);
      toast.success("Chat session deleted");
      const updatedList = await loadSessions();
      if (sid === sessionId) {
        if (updatedList && updatedList.length > 0) {
          switchSession(updatedList[0].session_id);
        } else {
          startNewChat();
        }
      }
    } catch (err) {
      toast.error("Failed to delete chat session");
    }
  };

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    await saveChatMessage("user", userMsg.content, sessionId);

    let assistantSoFar = "";
    try {
      const selectedShopId = localStorage.getItem("selectedShopId") || undefined;
      const token = getAuthToken();
      const selectedOwnerId = localStorage.getItem("selected_owner_id");

      const resp = await fetch(getChatStreamUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(selectedOwnerId ? { "X-Business-Owner-Id": selectedOwnerId } : {}),
        },
        body: JSON.stringify({ 
          messages: newMessages, 
          session_id: sessionId, 
          selected_shop_id: selectedShopId,
          preferred_language: selectedLang !== "auto" ? selectedLang : undefined
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to get response");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          let parsed: any;
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantSoFar += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
              }
              return [...prev, { role: "assistant", content: assistantSoFar }];
            });
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to get AI response");
    } finally {
      setIsLoading(false);
      loadSessions();
    }
  };

  return (
    <motion.div
      className={cn(
        "glow-card flex flex-col transition-all duration-300",
        fullHeight ? "h-full" : "h-[500px]"
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={cn(
        "flex items-center justify-between p-4 border-b border-border transition-all flex-wrap gap-2",
        fullHeight ? "bg-accent/20" : ""
      )}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-semibold text-foreground">AI Business Consulting</h3>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap" ref={dropdownRef}>
          {/* Language Selector Dropdown */}
          <div className="relative flex items-center">
            <Globe className="h-3.5 w-3.5 text-primary absolute left-2.5 pointer-events-none" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-background border border-border rounded-lg text-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer transition-colors"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={startNewChat}
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary font-medium"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            New Chat
          </Button>

          {/* Chat History Dropdown Toggle */}
          <div className="relative">
            <Button
              onClick={() => {
                setShowHistoryDropdown(!showHistoryDropdown);
                loadSessions();
              }}
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>

            {showHistoryDropdown && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-background border border-border shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 flex justify-between items-center">
                  <span>Chat History</span>
                  <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded text-foreground">{sessions.length} sessions</span>
                </div>
                
                <ScrollArea className="max-h-60 overflow-y-auto">
                  <div className="space-y-1 py-1">
                    {sessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">No saved chats yet</p>
                    ) : (
                      sessions.map((s) => {
                        const isSelected = s.session_id === sessionId;
                        const displayTitle = s.preview || "Chat Session";
                        return (
                          <div
                            key={s.session_id}
                            onClick={() => switchSession(s.session_id)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors group",
                              isSelected 
                                ? "bg-primary/15 text-primary font-medium border border-primary/20" 
                                : "hover:bg-accent text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="truncate max-w-[170px] sm:max-w-[200px]" title={displayTitle}>
                                {displayTitle}
                              </span>
                            </div>
                            <Button
                              onClick={(e) => handleDeleteSession(e, s.session_id)}
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {fullHeight && (
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 border border-primary/20 hidden md:inline-block">
              Closed Domain
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Multilingual AI Business Assistant</h4>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Ask in any language — <span className="text-foreground font-medium">English, తెలుగు, हिंदी, தமிழ், ગુજરાતી, ಕನ್ನಡ, മലയാളം, मराठी, বাংলা</span>. The AI will reply with authorized project data.
              </p>

              {/* Clickable Suggestion Chips */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {(SUGGESTIONS[selectedLang] || SUGGESTIONS.en).map((queryText, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(queryText);
                    }}
                    className="px-3 py-1.5 rounded-full text-xs bg-accent/70 hover:bg-primary/15 hover:text-primary text-foreground border border-border/60 transition-all font-medium text-left shadow-xs hover:border-primary/40"
                  >
                    "{queryText}"
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="rounded-full bg-primary h-8 w-8 flex items-center justify-center shrink-0 self-start shadow-lg shadow-primary/20">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div className={cn(
                "rounded-2xl p-4 max-w-[85%] text-sm shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-accent/80 backdrop-blur-sm text-foreground border border-border/50 rounded-tl-none"
              )}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="leading-relaxed">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="rounded-full bg-secondary h-8 w-8 flex items-center justify-center shrink-0 self-start shadow-md">
                  <User className="h-4 w-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-4">
              <div className="rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center shrink-0 self-start">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl bg-accent/80 p-4 border border-border/50 rounded-tl-none">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className={cn(
        "p-6 border-t border-border transition-all",
        fullHeight ? "bg-accent/10" : ""
      )}>
        <div className="max-w-4xl mx-auto flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask in any language — Telugu, Hindi, Tamil, Gujarati, English..."
            className="flex-1 bg-background h-12 shadow-inner border-border focus:ring-primary"
            disabled={isLoading}
          />
          <Button onClick={send} disabled={isLoading || !input.trim()} size="icon" className="shrink-0 h-12 w-12 rounded-xl shadow-lg shadow-primary/20">
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {fullHeight && (
          <p className="text-[10px] text-muted-foreground text-center mt-4 uppercase tracking-widest font-bold opacity-50">
            తెలుగు · हिंदी · தமிழ் · ગુજરાતી · English
          </p>
        )}
      </div>
    </motion.div>
  );
}
