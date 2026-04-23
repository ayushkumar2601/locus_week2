import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, ArrowRight } from "lucide-react";

export default function Welcome() {
    const [, navigate] = useLocation();
    const [phase, setPhase] = useState(0);
    // phase 0: initial entrance
    // phase 1: particles & greeting text
    // phase 2: subtitle & sparkles
    // phase 3: fade out & redirect

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 300),
            setTimeout(() => setPhase(2), 1200),
            setTimeout(() => setPhase(3), 3200),
            setTimeout(() => navigate("/workspace"), 4200),
        ];
        return () => timers.forEach(clearTimeout);
    }, [navigate]);

    // Generate random particles
    const particles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 2,
        duration: Math.random() * 3 + 2,
    }));

    // Orbiting sparkles
    const orbitSparkles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        angle: (360 / 8) * i,
        radius: 120 + Math.random() * 40,
        size: Math.random() * 6 + 3,
        delay: i * 0.15,
    }));

    return (
        <AnimatePresence>
            {phase < 3 ? (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
                    style={{ background: "hsl(240, 10%, 3%)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                    {/* Animated gradient background blobs */}
                    <motion.div
                        className="absolute w-[800px] h-[800px] rounded-full pointer-events-none"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                        }}
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                    <motion.div
                        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)",
                            top: "30%",
                            left: "60%",
                            transform: "translate(-50%, -50%)",
                        }}
                        animate={{
                            scale: [1.2, 1, 1.2],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                    <motion.div
                        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
                            top: "70%",
                            left: "35%",
                            transform: "translate(-50%, -50%)",
                        }}
                        animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.4, 0.7, 0.4],
                        }}
                        transition={{
                            duration: 3.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />

                    {/* Floating particles */}
                    {phase >= 1 &&
                        particles.map((p) => (
                            <motion.div
                                key={p.id}
                                className="absolute rounded-full"
                                style={{
                                    width: p.size,
                                    height: p.size,
                                    left: `${p.x}%`,
                                    top: `${p.y}%`,
                                    background: `hsl(${24 + Math.random() * 30}, 90%, ${60 + Math.random() * 20}%)`,
                                    boxShadow: `0 0 ${p.size * 2}px hsl(24, 90%, 60%)`,
                                }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{
                                    opacity: [0, 0.8, 0],
                                    scale: [0, 1, 0],
                                    y: [0, -80 - Math.random() * 100],
                                }}
                                transition={{
                                    duration: p.duration,
                                    delay: p.delay,
                                    repeat: Infinity,
                                    ease: "easeOut",
                                }}
                            />
                        ))}

                    {/* Grid lines */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                        backgroundImage: `
                            linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                    }} />

                    {/* Central content */}
                    <div className="relative z-10 flex flex-col items-center text-center px-6">
                        {/* Logo icon with orbital glow */}
                        <motion.div
                            className="relative mb-8"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 20,
                                duration: 0.8,
                            }}
                        >
                            {/* Outer ring */}
                            <motion.div
                                className="absolute inset-[-20px] rounded-full"
                                style={{
                                    border: "1px solid rgba(249,115,22,0.2)",
                                }}
                                animate={{ rotate: 360 }}
                                transition={{
                                    duration: 8,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            >
                                {/* Orbiting dot */}
                                <div
                                    className="absolute w-2 h-2 rounded-full bg-primary"
                                    style={{
                                        top: "-4px",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        boxShadow: "0 0 12px rgba(249,115,22,0.8)",
                                    }}
                                />
                            </motion.div>

                            {/* Second ring */}
                            <motion.div
                                className="absolute inset-[-35px] rounded-full"
                                style={{
                                    border: "1px solid rgba(20,184,166,0.15)",
                                }}
                                animate={{ rotate: -360 }}
                                transition={{
                                    duration: 12,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            >
                                <div
                                    className="absolute w-1.5 h-1.5 rounded-full bg-teal-400"
                                    style={{
                                        bottom: "-3px",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        boxShadow: "0 0 10px rgba(20,184,166,0.8)",
                                    }}
                                />
                            </motion.div>

                            {/* Icon container */}
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-primary/30 relative">
                                <img src="/logo.png" alt="Synapse" className="w-10 h-10 object-cover rounded-lg" />
                                {/* Shimmer effect */}
                                <motion.div
                                    className="absolute inset-0 rounded-2xl"
                                    style={{
                                        background:
                                            "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)",
                                    }}
                                    animate={{ x: ["-100%", "200%"] }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatDelay: 1,
                                        ease: "easeInOut",
                                    }}
                                />
                            </div>
                        </motion.div>

                        {/* Welcome text */}
                        {phase >= 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="mb-4"
                            >
                                <h1
                                    className="text-5xl md:text-6xl font-bold tracking-tight"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, #fff 0%, #f97316 50%, #f59e0b 100%)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        backgroundClip: "text",
                                    }}
                                >
                                    Welcome Back!
                                </h1>
                            </motion.div>
                        )}

                        {/* Subtitle */}
                        {phase >= 2 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="space-y-4"
                            >
                                <p className="text-lg text-muted-foreground/80 max-w-md">
                                    We're setting up your creative workspace.
                                    <br />
                                    <span className="text-muted-foreground/60">
                                        Get ready to build something amazing ✨
                                    </span>
                                </p>

                                {/* Loading bar */}
                                <div className="w-64 mx-auto mt-6">
                                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{
                                                background:
                                                    "linear-gradient(90deg, #f97316, #f59e0b, #14b8a6)",
                                            }}
                                            initial={{ width: "0%" }}
                                            animate={{ width: "100%" }}
                                            transition={{
                                                duration: 2,
                                                ease: "easeInOut",
                                            }}
                                        />
                                    </div>
                                    <motion.div
                                        className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground/50"
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{
                                            duration: 1.5,
                                            repeat: Infinity,
                                        }}
                                    >
                                        <Rocket className="w-3.5 h-3.5" />
                                        Launching workspace...
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {/* Floating sparkle icons around */}
                        {phase >= 1 &&
                            orbitSparkles.map((s) => (
                                <motion.div
                                    key={s.id}
                                    className="absolute"
                                    style={{
                                        width: s.size,
                                        height: s.size,
                                    }}
                                    initial={{
                                        opacity: 0,
                                        scale: 0,
                                        x:
                                            Math.cos((s.angle * Math.PI) / 180) *
                                            s.radius,
                                        y:
                                            Math.sin((s.angle * Math.PI) / 180) *
                                            s.radius,
                                    }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0],
                                        x:
                                            Math.cos(
                                                ((s.angle + 60) * Math.PI) / 180
                                            ) * s.radius,
                                        y:
                                            Math.sin(
                                                ((s.angle + 60) * Math.PI) / 180
                                            ) * s.radius,
                                    }}
                                    transition={{
                                        duration: 3,
                                        delay: s.delay,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                >
                                    <div
                                        className="w-full h-full rounded-full bg-primary/60"
                                        style={{
                                            boxShadow:
                                                "0 0 8px rgba(249,115,22,0.5)",
                                        }}
                                    />
                                </motion.div>
                            ))}
                    </div>
                </motion.div>
            ) : (
                /* Fade-out phase with scale effect */
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    style={{ background: "hsl(240, 10%, 3%)" }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                    <motion.div
                        className="flex flex-col items-center gap-3"
                        animate={{ scale: [1, 1.05], opacity: [1, 0] }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-primary/30">
                            <ArrowRight className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-sm text-muted-foreground/60">
                            Entering workspace…
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
