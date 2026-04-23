import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import WorkspaceLayout from "@/components/workspace/WorkspaceLayout";
import { apiRequest } from "@/lib/queryClient";

export default function Workspace() {
    const [, navigate] = useLocation();
    const searchString = useSearch();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [voiceMode, setVoiceMode] = useState(false);
    const lastInitSearchRef = useRef<string | null>(null);

    useEffect(() => {
        if (lastInitSearchRef.current === searchString) {
            return;
        }
        lastInitSearchRef.current = searchString;

        let mounted = true;

        async function initWorkspace() {
            // 1. Check auth
            try {
                await apiRequest("GET", "/api/auth/session");
            } catch {
                if (mounted) {
                    navigate("/auth");
                }
                return;
            }

            // 2. Resolve project ID from query param or create a new project
            const params = new URLSearchParams(searchString);
            let pid = params.get("project");
            const shouldStartVoice = params.get("voice") === "1";

            if (pid) {
                // Verify project exists
                try {
                    await apiRequest("GET", `/api/projects/${pid}`);
                } catch {
                    // Project not found — create a new one
                    pid = null;
                }
            }

            if (!pid) {
                try {
                    const res = await apiRequest("POST", "/api/projects", {
                        name: "Untitled Project",
                        template: "react",
                    });
                    const project = await res.json();
                    pid = project.id;
                    // Update URL without full navigation
                    window.history.replaceState({}, "", `/workspace?project=${pid}`);
                } catch {
                    console.error("Failed to create project");
                }
            }

            if (mounted) {
                setProjectId(pid);
                setVoiceMode(shouldStartVoice);
                setIsCheckingAuth(false);
            }
        }

        void initWorkspace();

        return () => {
            mounted = false;
        };
    }, [navigate, searchString]);

    if (isCheckingAuth || !projectId) {
        return <div className="min-h-screen bg-[hsl(240,10%,4%)]" />;
    }

    return <WorkspaceLayout projectId={projectId} initialVoiceMode={voiceMode} />;
}
