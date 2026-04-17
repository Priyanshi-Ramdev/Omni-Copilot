const STEP_ICONS = {
  thinking:     { icon: null, spinner: true },
  tool:         { icon: '⚡', spinner: true },
  tool_success: { icon: '✅', spinner: false },
  tool_error:   { icon: '❌', spinner: false },
};

const TOOL_LABELS = {
  list_drive_files:     '📁 Listing Drive Files',
  create_drive_folder:  '📁 Creating Drive Folder',
  upload_to_drive:      '📤 Uploading to Drive',
  create_google_doc:    '📝 Creating Google Doc',
  read_google_doc:      '📖 Reading Google Doc',
  send_email:           '📧 Sending Email',
  read_emails:          '📬 Reading Emails',
  create_calendar_event:'📅 Creating Calendar Event',
  list_calendar_events: '📅 Listing Calendar Events',
  create_google_meet:   '📹 Scheduling Google Meet',
  create_google_form:   '📋 Creating Google Form',
  create_notion_page:   '⬛ Creating Notion Page',
  search_notion:        '🔍 Searching Notion',
  list_notion_pages:    '⬛ Listing Notion Pages',
  send_slack_message:   '💬 Sending Slack Message',
  list_slack_channels:  '💬 Listing Slack Channels',
  read_slack_messages:  '💬 Reading Slack Messages',
  send_discord_message: '🎮 Sending Discord Message',
  analyze_image:        '🖼️ Analyzing Image with AI',
  read_code_file:       '💻 Reading Code File',
  write_code_file:      '💾 Writing Code File',
  list_directory:       '📂 Listing Directory',
};

export default function ToolStatusCard({ steps }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="tool-steps">
      {steps.map((step, i) => {
        const conf = STEP_ICONS[step.type] || { icon: '•', spinner: false };
        const label = step.tool ? (TOOL_LABELS[step.tool] || step.message) : step.message;
        return (
          <div key={i} className={`tool-step ${step.type}`}>
            {conf.spinner
              ? <div className="step-spinner" />
              : <span className="step-icon">{conf.icon}</span>
            }
            <span>{label}</span>
            {step.result?.link && (
              <a href={step.result.link} target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                Open ↗
              </a>
            )}
            {step.result?.meetLink && (
              <a href={step.result.meetLink} target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                Join ↗
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
