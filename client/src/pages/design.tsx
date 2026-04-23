import DesignEditor from "@/components/design/DesignEditor";
import PanelErrorBoundary from "@/components/workspace/PanelErrorBoundary";

export default function Design() {
    return (
        <PanelErrorBoundary>
            <DesignEditor />
        </PanelErrorBoundary>
    );
}
