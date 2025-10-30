namespace SiyeFlow.UI
{
    public class SiyeFlowOptions
    {
        /// <summary>
        /// Gets or sets the route prefix for accessing the SiyeFlow UI.
        /// Default is "siyeflow".
        /// </summary>
        public string RoutePrefix { get; set; } = "siyeflow";

        /// <summary>
        /// Gets or sets the document title (displayed in the browser tab).
        /// </summary>
        public string DocumentTitle { get; set; } = "SiyeFlow - Workflow Runner";

        /// <summary>
        /// Gets or sets the path to the directory containing workflow files.
        /// Default is "Workflows" in the content root.
        /// </summary>
        public string WorkflowsPath { get; set; } = "Workflows";

        /// <summary>
        /// Gets or sets whether to enable the workflow editor.
        /// </summary>
        public bool EnableEditor { get; set; } = false;

        /// <summary>
        /// Gets or sets the theme. Options: "light", "dark", "auto".
        /// </summary>
        public string Theme { get; set; } = "light";

        /// <summary>
        /// Gets or sets custom CSS to inject into the UI.
        /// </summary>
        public string? CustomCss { get; set; }

        /// <summary>
        /// Gets or sets whether to show sample workflows.
        /// </summary>
        public bool ShowSamples { get; set; } = true;

        /// <summary>
        /// Gets or sets the maximum file upload size in bytes (for workflow files).
        /// </summary>
        public long MaxFileSize { get; set; } = 10 * 1024 * 1024; // 10MB

        /// <summary>
        /// Gets or sets whether to enable real-time execution monitoring.
        /// </summary>
        public bool EnableRealTimeMonitoring { get; set; } = true;
    }
}
