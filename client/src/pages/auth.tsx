import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { setAuthToken, clearAuthToken, getAuthToken } from "@/lib/queryClient";
import {

    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Github,
    User,
    Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AuthMode = "signin" | "signup" | "forgot";

export default function Auth() {
    const [, navigate] = useLocation();
    const [mode, setMode] = useState<AuthMode>("signin");
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        let mounted = true;

        async function checkSession() {
            const token = getAuthToken();
            if (!token) {
                return;
            }

            try {
                const response = await apiRequest("GET", "/api/auth/session");
                if (response.ok && mounted) {
                    navigate("/dashboard");
                }
            } catch {
                clearAuthToken();
                // Ignore connectivity issues here; user can still use auth form.
            }
        }

        void checkSession();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        if (!email || !password) {
            setErrorMessage("Please provide both username and password.");
            return;
        }

        if (mode === "signup" && !agreed) {
            setErrorMessage("Please accept the Terms of Service to continue.");
            return;
        }

        if ((mode === "signup" || mode === "forgot") && password.length < 8) {
            setErrorMessage("Password must be at least 8 characters long.");
            return;
        }

        if (mode === "forgot" && password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            let response: Response;
            if (mode === "signin") {
                response = await apiRequest("POST", "/api/auth/signin", {
                    username: email.trim(),
                    password,
                });
            } else if (mode === "signup") {
                response = await apiRequest("POST", "/api/auth/signup", {
                    username: email.trim(),
                    password,
                    profileName: name.trim() || undefined,
                });
            } else {
                response = await apiRequest("POST", "/api/auth/forgot-password", {
                    username: email.trim(),
                    newPassword: password,
                });

                if (response.ok) {
                    setSuccessMessage("Password reset complete. You can sign in now.");
                    setMode("signin");
                    setPassword("");
                    setConfirmPassword("");
                    return;
                }
            }

            const payload = (await response.json()) as { token?: string };
            if (!payload.token) {
                throw new Error("Authentication token missing from server response");
            }

            setAuthToken(payload.token);

            navigate("/dashboard");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Authentication failed";
            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    };

    const socialLogin = async (provider: "google" | "github") => {
        if (isLoading) {
            return;
        }

        setErrorMessage(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            const storageKey = "synapse.social.device.id";
            let deviceId = window.localStorage.getItem(storageKey);
            if (!deviceId) {
                const randomBytes = new Uint8Array(12);
                window.crypto.getRandomValues(randomBytes);
                deviceId = Array.from(randomBytes)
                    .map((v) => v.toString(16).padStart(2, "0"))
                    .join("");
                window.localStorage.setItem(storageKey, deviceId);
            }

            const response = await apiRequest("POST", "/api/auth/social-signin", {
                provider,
                deviceId,
            });

            const payload = (await response.json()) as { token?: string };
            if (!payload.token) {
                throw new Error("Authentication token missing from server response");
            }

            setAuthToken(payload.token);
            navigate("/dashboard");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Social sign-in failed";
            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[hsl(240,10%,3%)] relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-[-30%] right-[-10%] w-150 h-150 bg-primary/15 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-125 h-125 bg-teal-500/10 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute top-[20%] left-[30%] w-75 h-75 bg-purple-500/8 rounded-full blur-[100px] pointer-events-none" />

            {/* Left side — Branding */}
            <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative">
                {/* Logo */}
                <div
                    className="flex items-center gap-2.5 cursor-pointer"
                    onClick={() => navigate("/")}
                >
                    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-primary/20">
                        <img src="/logo.png" alt="Synapse" className="w-6 h-6 object-cover rounded" />
                    </div>
                    <span className="font-display font-bold text-xl tracking-tight text-foreground">
                        Synapse{" "}
                        <span className="text-muted-foreground font-normal">Studio</span>
                    </span>
                </div>

                {/* Center tagline */}
                <div className="max-w-md space-y-6">
                    <h1 className="text-4xl font-bold leading-tight text-foreground">
                        Build the future,
                        <br />
                        <span className="text-gradient-primary">one idea at a time.</span>
                    </h1>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Join thousands of developers and designers creating stunning
                        applications with AI-powered tools.
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-8 pt-4">
                        {[
                            { value: "50K+", label: "Developers" },
                            { value: "1M+", label: "Projects" },
                            { value: "99.9%", label: "Uptime" },
                        ].map((stat) => (
                            <div key={stat.label}>
                                <div className="text-2xl font-bold text-foreground">
                                    {stat.value}
                                </div>
                                <div className="text-xs text-muted-foreground font-medium">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom testimonial */}
                <div className="bg-white/3 backdrop-blur-xl border border-white/10 rounded-2xl p-5 max-w-md">
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                        "Synapse Studio transformed our development workflow. We ship 3x
                        faster with AI-assisted coding and the design tools are
                        game-changing."
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary/60 to-teal-400/60 flex items-center justify-center text-xs font-bold text-white">
                            AK
                        </div>
                        <div>
                            <div className="text-sm font-medium text-foreground">
                                Arjun Kumar
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Sr. Engineer at TechCorp
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side — Auth form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-105"
                >
                    {/* Mobile logo */}
                    <div
                        className="flex lg:hidden items-center gap-2.5 mb-10 cursor-pointer"
                        onClick={() => navigate("/")}
                    >
                        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-blue-400 flex items-center justify-center">
                            <img src="/logo.png" alt="Synapse" className="w-5 h-5 object-cover rounded" />
                        </div>
                        <span className="font-display font-bold text-lg">
                            Synapse{" "}
                            <span className="text-muted-foreground font-normal">Studio</span>
                        </span>
                    </div>

                    {/* Header */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="mb-8"
                        >
                            <h2 className="text-2xl font-bold text-foreground">
                                {mode === "signin"
                                    ? "Welcome back"
                                    : mode === "signup"
                                        ? "Create your account"
                                        : "Reset password"}
                            </h2>
                            <p className="text-muted-foreground text-sm mt-1.5">
                                {mode === "signin"
                                    ? "Sign in to continue to your workspace"
                                    : mode === "signup"
                                        ? "Start building amazing projects today"
                                        : "Set a new password for your account"}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* Social login */}
                    {mode !== "forgot" && (
                        <div className="space-y-2.5 mb-6">
                            <button
                                onClick={() => {
                                    void socialLogin("google");
                                }}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 text-foreground text-sm font-medium transition-all hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </button>
                            <button
                                onClick={() => {
                                    void socialLogin("github");
                                }}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 text-foreground text-sm font-medium transition-all hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Github className="w-4 h-4" />
                                Continue with GitHub
                            </button>
                        </div>
                    )}

                    {/* Divider */}
                    {mode !== "forgot" && (
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                or
                            </span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === "signup" && (
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/3 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Username
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your-username"
                                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/3 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                />
                            </div>
                        </div>

                        {mode !== "forgot" && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        Password
                                    </label>
                                    {mode === "signin" && (
                                        <button
                                            type="button"
                                            onClick={() => setMode("forgot")}
                                            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full h-11 pl-10 pr-11 rounded-xl bg-white/3 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                {mode === "signup" && (
                                    <div className="mt-2 space-y-1">
                                        {[
                                            { label: "At least 8 characters", met: password.length >= 8 },
                                            { label: "One uppercase letter", met: /[A-Z]/.test(password) },
                                            { label: "One number or symbol", met: /[0-9!@#$%^&*]/.test(password) },
                                        ].map((rule) => (
                                            <div
                                                key={rule.label}
                                                className={`flex items-center gap-1.5 text-[11px] ${rule.met ? "text-emerald-400" : "text-muted-foreground/40"}`}
                                            >
                                                <Check className={`w-3 h-3 ${rule.met ? "opacity-100" : "opacity-30"}`} />
                                                {rule.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === "forgot" && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="At least 8 characters"
                                            className="w-full h-11 pl-10 pr-11 rounded-xl bg-white/3 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter password"
                                            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/3 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {mode === "signup" && (
                            <label className="flex items-start gap-2.5 cursor-pointer group">
                                <div
                                    onClick={() => setAgreed(!agreed)}
                                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${agreed ? "bg-primary border-primary" : "border-white/20 hover:border-white/40"}`}
                                >
                                    {agreed && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className="text-xs text-muted-foreground leading-relaxed">
                                    I agree to the{" "}
                                    <span className="text-primary hover:underline cursor-pointer">
                                        Terms of Service
                                    </span>{" "}
                                    and{" "}
                                    <span className="text-primary hover:underline cursor-pointer">
                                        Privacy Policy
                                    </span>
                                </span>
                            </label>
                        )}

                        {errorMessage && (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                                {errorMessage}
                            </div>
                        )}

                        {successMessage && (
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                                {successMessage}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-sm shadow-lg shadow-primary/20 transition-all group disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {mode === "forgot" ? "Sending link..." : mode === "signin" ? "Signing in..." : "Creating account..."}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {mode === "forgot"
                                        ? "Reset Password"
                                        : mode === "signin"
                                            ? "Sign In"
                                            : "Create Account"}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            )}
                        </Button>
                    </form>

                    {/* Toggle auth mode */}
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                        {mode === "signin" ? (
                            <>
                                Don't have an account?{" "}
                                <button
                                    onClick={() => setMode("signup")}
                                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                                >
                                    Sign up
                                </button>
                            </>
                        ) : mode === "signup" ? (
                            <>
                                Already have an account?{" "}
                                <button
                                    onClick={() => setMode("signin")}
                                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                                >
                                    Sign in
                                </button>
                            </>
                        ) : (
                            <>
                                Remember your password?{" "}
                                <button
                                    onClick={() => setMode("signin")}
                                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                                >
                                    Back to sign in
                                </button>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-[11px] text-muted-foreground/40">
                        Protected by enterprise-grade encryption
                    </div>
                    <div className="mt-3 text-center text-[12px] text-muted-foreground">
                        Admin account?{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/admin")}
                            className="text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                            Open admin login
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
