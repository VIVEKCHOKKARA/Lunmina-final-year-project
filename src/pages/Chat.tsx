import AIChatbot from "@/components/AIChatbot";
import { motion } from "framer-motion";
import { MessageSquare, Sparkles } from "lucide-react";

export default function Chat() {
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-primary" />
                        AI Advisor
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Real-time business consulting powered by your data
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" />
                    Pro Analytics Active
                </div>
            </div>

            <motion.div
                className="flex-1 min-h-0"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <AIChatbot fullHeight={true} />
            </motion.div>
        </div>
    );
}
