export function AccountTab({email, name}) {
  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-semibold mb-6">Account</h3>
      
      <div className="bg-bg-card rounded-xl border border-border-default overflow-hidden">
        <div className="p-6 border-b border-border-default flex justify-between items-center">
          <span className="text-sm font-medium">Name</span>
          <span className="text-sm text-text-muted uppercase">{name}</span>
        </div>
        <div className="p-6 border-b border-border-default flex justify-between items-center">
          <span className="text-sm font-medium">Email</span>
          <span className="text-sm text-text-muted uppercase">{email}</span>
        </div>
        
        <div className="p-6">
          <h4 className="text-sm font-semibold mb-2">Delete account</h4>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            If you delete and later re-activate, your existing subscription benefits may not be restored until your next subscription renewal day. <a href="#" className="underline hover:text-text-primary">To cancel your subscription, click here</a>.
          </p>
          <button className="w-full py-2.5 rounded-lg bg-bg-hover text-accent-red text-sm font-medium hover:bg-bg-hover/80 transition-colors border border-border-default">
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
