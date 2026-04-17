import { useState } from 'react';

const TOOL_LABELS = {
  send_email: '📧 Review Email Draft',
  create_drive_folder: '📁 Review Folder Creation',
  upload_to_drive: '📤 Review File Upload',
  create_google_doc: '📝 Review Document Draft',
  create_calendar_event: '📅 Review Calendar Event',
  create_google_meet: '📹 Review Meet Scheduling',
  create_google_form: '📋 Review Form Creation',
  create_notion_page: '⬛ Review Notion Page',
  send_slack_message: '💬 Review Slack Message',
  send_discord_message: '🎮 Review Discord Message',
  write_code_file: '💾 Review File Modification',
};

export default function ActionReviewCard({ action, onRespond }) {
  const [args, setArgs] = useState(action.args || {});
  const [loading, setLoading] = useState(false);
  const [responded, setResponded] = useState(false);

  const title = TOOL_LABELS[action.tool] || `⚠️ Review Action: ${action.tool}`;

  const handleChange = (key, value) => {
    setArgs(prev => ({ ...prev, [key]: value }));
  };

  const handleApprove = () => {
    setLoading(true);
    setResponded(true);
    onRespond({ status: 'approved', args });
  };

  const handleReject = () => {
    setLoading(true);
    setResponded(true);
    onRespond({ status: 'rejected' });
  };

  if (responded) return null; // Hide after responding

  // Special form for send_email
  if (action.tool === 'send_email') {
    return (
      <div className="action-review-card">
        <div className="arc-header">{title}</div>
        <div className="arc-body">
          <label className="arc-label">To:</label>
          <input className="arc-input" value={args.to || ''} onChange={e => handleChange('to', e.target.value)} />
          <label className="arc-label">Subject:</label>
          <input className="arc-input" value={args.subject || ''} onChange={e => handleChange('subject', e.target.value)} />
          <label className="arc-label">Body:</label>
          <textarea className="arc-textarea" value={args.body || ''} onChange={e => handleChange('body', e.target.value)} rows={6} />
        </div>
        <div className="arc-footer">
          <button className="arc-btn reject" onClick={handleReject} disabled={loading}>Cancel</button>
          <button className="arc-btn approve" onClick={handleApprove} disabled={loading}>Approve & Send</button>
        </div>
      </div>
    );
  }

  // Dynamic form for everything else
  return (
    <div className="action-review-card">
      <div className="arc-header">{title}</div>
      <div className="arc-body">
        {Object.entries(args).map(([key, val]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label className="arc-label">{key}:</label>
            {typeof val === 'string' && val.length > 50 ? (
              <textarea className="arc-textarea" value={val} onChange={e => handleChange(key, e.target.value)} rows={4} />
            ) : (
              <input className="arc-input" value={val || ''} onChange={e => handleChange(key, e.target.value)} />
            )}
          </div>
        ))}
      </div>
      <div className="arc-footer">
        <button className="arc-btn reject" onClick={handleReject} disabled={loading}>Cancel</button>
        <button className="arc-btn approve" onClick={handleApprove} disabled={loading}>Approve Action</button>
      </div>
    </div>
  );
}
